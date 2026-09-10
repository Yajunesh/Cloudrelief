from datetime import datetime

from pydantic import BaseModel, Field

# Plain str rather than pydantic's EmailStr: EmailStr rejects reserved/
# special-use TLDs (.local, .test, .example, .localhost) as syntactically
# invalid, which would break the seeded demo accounts
# (admin@cloudrelief.local, citizen@cloudrelief.local) at login. Uniqueness
# is already enforced at the DB layer; strict RFC format isn't needed here.


# --- Auth ---
class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    email: str


# --- Incidents ---
class IncidentCreateResponse(BaseModel):
    incident_id: str
    incident_type: str
    classifier_confidence: float
    severity_score: float
    status: str
    alert_triggered: bool
    image_url: str | None


class IncidentOut(BaseModel):
    incident_id: str
    citizen_id: str
    latitude: float
    longitude: float
    description: str
    incident_type: str
    classifier_confidence: float
    severity_score: float
    status: str
    image_key: str | None
    image_url: str | None
    assigned_team: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentAssignRequest(BaseModel):
    assigned_team: str


class IncidentSyncRequest(BaseModel):
    incident_id: str
    latitude: float
    longitude: float
    description: str
    image_key: str
    incident_type: str = "flood"
    severity_score: float = 0.90


class IncidentStatusRequest(BaseModel):
    status: str  # unassigned | assigned | resolved


class StatsOut(BaseModel):
    total_incidents: int
    by_type: dict[str, int]
    by_status: dict[str, int]

