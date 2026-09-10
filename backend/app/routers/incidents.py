import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.constants import MOCK_TEAMS
from app.core.deps import get_current_user, require_admin
from app.core.severity import compute_severity
from app.db.session import get_db
from app.models.db import Alert, Incident, IncidentStatus, IncidentType, User
from app.models.schemas import (
    IncidentAssignRequest,
    IncidentCreateResponse,
    IncidentOut,
    IncidentStatusRequest,
    IncidentSyncRequest,
    StatsOut,
)
from app.services.factory import get_classifier_service, get_notify_service, get_storage_service

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _to_out(incident: Incident) -> IncidentOut:
    storage = get_storage_service()
    if incident.image_key and (incident.image_key.startswith("http://") or incident.image_key.startswith("https://")):
        image_url = incident.image_key
    elif incident.image_key and incident.image_key.startswith("incidents/"):
        image_url = f"https://cloudrelief-images-hyderabad-2026.s3.ap-south-2.amazonaws.com/{incident.image_key}"
    elif incident.image_key:
        image_url = storage.get_file_url(incident.image_key)
    else:
        image_url = None

    return IncidentOut(
        incident_id=incident.incident_id,
        citizen_id=incident.citizen_id,
        latitude=incident.latitude,
        longitude=incident.longitude,
        description=incident.description,
        incident_type=incident.incident_type.value,
        classifier_confidence=incident.classifier_confidence,
        severity_score=incident.severity_score,
        status=incident.status.value,
        image_key=incident.image_key,
        image_url=image_url,
        assigned_team=incident.assigned_team,
        created_at=incident.created_at,
    )


@router.post("", response_model=IncidentCreateResponse, status_code=status.HTTP_201_CREATED)
async def submit_incident(
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    storage = get_storage_service()
    classifier = get_classifier_service()
    notify = get_notify_service()

    # 1. Upload photo via StorageService
    content = await photo.read()
    ext = (photo.filename or "").rsplit(".", 1)[-1] if "." in (photo.filename or "") else "jpg"
    image_key = f"incidents/{uuid.uuid4()}.{ext}"
    storage.upload_file(image_key, content, content_type=photo.content_type)

    # 2. Run ClassifierService against the uploaded photo. Local disk path is
    # passed for interface parity with a future Rekognition impl that would
    # instead reference the S3 key directly.
    classification = classifier.classify_image(image_key)

    # 3. Compute severity using existing recent incidents for the density term.
    existing = db.query(Incident.latitude, Incident.longitude, Incident.created_at).all()
    result = compute_severity(
        classifier_label=classification.label,
        classifier_confidence=classification.confidence,
        description=description,
        latitude=latitude,
        longitude=longitude,
        existing_incidents=[(lat, lng, created_at) for lat, lng, created_at in existing],
    )

    # 4. Save incident
    incident = Incident(
        citizen_id=user.user_id,
        latitude=latitude,
        longitude=longitude,
        description=description,
        incident_type=IncidentType(classification.label),
        classifier_confidence=classification.confidence,
        severity_score=result.severity_score,
        status=IncidentStatus.unassigned,
        image_key=image_key,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # 5. Alert if severity crosses the threshold
    if result.should_alert:
        notify.publish_alert(
            db,
            incident_id=incident.incident_id,
            severity_score=result.severity_score,
            message=(
                f"High severity incident reported: {classification.label} "
                f"(severity={result.severity_score:.2f}) at "
                f"({latitude:.4f}, {longitude:.4f})"
            ),
        )

    storage = get_storage_service()
    return IncidentCreateResponse(
        incident_id=incident.incident_id,
        incident_type=incident.incident_type.value,
        classifier_confidence=incident.classifier_confidence,
        severity_score=incident.severity_score,
        status=incident.status.value,
        alert_triggered=result.should_alert,
        image_url=storage.get_file_url(image_key),
    )


@router.get("/mine", response_model=list[IncidentOut])
def my_incidents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(Incident)
        .filter(Incident.citizen_id == user.user_id)
        .order_by(Incident.created_at.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.get("", response_model=list[IncidentOut])
def list_incidents(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    # Only show incidents classed as genuine disasters (Flood, Fire, Structural Damage)
    rows = (
        db.query(Incident)
        .filter(Incident.incident_type.in_([IncidentType.flood, IncidentType.fire, IncidentType.structural_damage]))
        .order_by(Incident.created_at.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("/sync", response_model=IncidentOut)
def sync_aws_incident(
    payload: IncidentSyncRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.query(Incident).filter(Incident.incident_id == payload.incident_id).first()
    if existing:
        return _to_out(existing)

    try:
        itype = IncidentType(payload.incident_type.lower())
    except ValueError:
        itype = IncidentType.flood

    incident = Incident(
        incident_id=payload.incident_id,
        citizen_id=user.user_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description,
        incident_type=itype,
        classifier_confidence=0.96,
        severity_score=payload.severity_score,
        status=IncidentStatus.unassigned,
        image_key=payload.image_key,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return _to_out(incident)


@router.delete("/wipe")
def wipe_all_incidents(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    db.query(Alert).delete()
    db.query(Incident).delete()
    db.commit()
    return {"message": "All mock incidents and reports have been completely wiped."}


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    rows = (
        db.query(Incident)
        .filter(Incident.incident_type.in_([IncidentType.flood, IncidentType.fire, IncidentType.structural_damage]))
        .all()
    )
    by_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for r in rows:
        by_type[r.incident_type.value] = by_type.get(r.incident_type.value, 0) + 1
        by_status[r.status.value] = by_status.get(r.status.value, 0) + 1
    return StatsOut(total_incidents=len(rows), by_type=by_type, by_status=by_status)


@router.get("/teams")
def list_teams(_admin: User = Depends(require_admin)):
    return {"teams": MOCK_TEAMS}


@router.patch("/{incident_id}/assign", response_model=IncidentOut)
def assign_incident(
    incident_id: str,
    payload: IncidentAssignRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found")

    incident.assigned_team = payload.assigned_team
    incident.status = IncidentStatus.assigned

    # Notify the citizen that the rescue squad has been deployed and is heading to the spot
    notify = get_notify_service()
    dispatch_message = (
        f"🚨 RESCUE SQUAD DISPATCH: Unit '{payload.assigned_team}' has been dispatched and is currently "
        f"heading to your reported incident location ({incident.latitude:.4f}, {incident.longitude:.4f}). "
        f"Please stay in a safe location."
    )
    notify.publish_alert(
        db,
        incident_id=incident.incident_id,
        severity_score=incident.severity_score,
        message=dispatch_message,
    )

    db.commit()
    db.refresh(incident)
    return _to_out(incident)


@router.patch("/{incident_id}/status", response_model=IncidentOut)
def set_status(
    incident_id: str,
    payload: IncidentStatusRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found")

    try:
        incident.status = IncidentStatus(payload.status)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid status")

    db.commit()
    db.refresh(incident)
    return _to_out(incident)

