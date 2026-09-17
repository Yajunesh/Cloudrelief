"""
SQLAlchemy ORM models for Postgres.

Schema is intentionally simple / key-based (UUID primary keys, no joins
beyond simple FKs) so it maps cleanly onto DynamoDB single-table design
later: users -> PK=user_id, incidents -> PK=incident_id with a GSI on
status/severity, alerts -> PK=alert_id with a sort on created_at.
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    citizen = "citizen"
    admin = "admin"


class IncidentStatus(str, enum.Enum):
    unassigned = "unassigned"
    assigned = "assigned"
    resolved = "resolved"


class IncidentType(str, enum.Enum):
    flood = "flood"
    fire = "fire"
    structural_damage = "structural_damage"
    cyclone = "cyclone"
    tsunami = "tsunami"
    tornado = "tornado"
    earthquake = "earthquake"
    normal = "normal"


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.citizen)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    incidents = relationship("Incident", back_populates="citizen")


class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    citizen_id = Column(UUID(as_uuid=False), ForeignKey("users.user_id"), nullable=False)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=False)

    incident_type = Column(Enum(IncidentType), nullable=False, default=IncidentType.normal)
    classifier_confidence = Column(Float, nullable=False, default=0.0)
    severity_score = Column(Float, nullable=False, default=0.0)

    status = Column(Enum(IncidentStatus), nullable=False, default=IncidentStatus.unassigned)
    image_key = Column(String, nullable=True)
    assigned_team = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)

    citizen = relationship("User", back_populates="incidents")
    alerts = relationship("Alert", back_populates="incident")


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    incident_id = Column(UUID(as_uuid=False), ForeignKey("incidents.incident_id"), nullable=False)
    severity_score = Column(Float, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    incident = relationship("Incident", back_populates="alerts")
