"""
Single wiring point for every swappable service. Route handlers (and
FastAPI dependencies) must obtain service instances only through the
get_*_service() functions below — never by importing a concrete
implementation class directly.

Swapping to AWS/Oracle later means: (1) write the new implementation class
in the relevant services/<kind>/ folder, (2) add one `elif` branch here,
(3) flip the corresponding *_PROVIDER env var. Nothing outside this file
needs to change.
"""
from functools import lru_cache

from app.core.config import settings
from app.services.auth.base import AuthService
from app.services.auth.local import LocalAuthService
from app.services.classifier.base import ClassifierService
from app.services.classifier.mock import MockClassifierService
from app.services.notify.base import NotifyService
from app.services.notify.console import ConsoleNotifyService
from app.services.storage.base import StorageService
from app.services.storage.local import LocalStorageService


@lru_cache
def get_storage_service() -> StorageService:
    if settings.STORAGE_PROVIDER == "local":
        return LocalStorageService()
    elif settings.STORAGE_PROVIDER == "cloudinary":
        from app.services.storage.cloudinary_storage import CloudinaryStorageService

        return CloudinaryStorageService()
    # elif settings.STORAGE_PROVIDER == "s3":
    #     from app.services.storage.s3 import S3StorageService
    #     return S3StorageService()
    raise ValueError(f"Unknown STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}")


@lru_cache
def get_auth_service() -> AuthService:
    if settings.AUTH_PROVIDER == "local":
        return LocalAuthService()
    # elif settings.AUTH_PROVIDER == "cognito":
    #     from app.services.auth.cognito import CognitoAuthService
    #     return CognitoAuthService()
    raise ValueError(f"Unknown AUTH_PROVIDER: {settings.AUTH_PROVIDER}")


@lru_cache
def get_notify_service() -> NotifyService:
    if settings.NOTIFY_PROVIDER == "console":
        return ConsoleNotifyService()
    # elif settings.NOTIFY_PROVIDER == "sns":
    #     from app.services.notify.sns import SnsNotifyService
    #     return SnsNotifyService()
    raise ValueError(f"Unknown NOTIFY_PROVIDER: {settings.NOTIFY_PROVIDER}")


@lru_cache
def get_classifier_service() -> ClassifierService:
    if settings.CLASSIFIER_PROVIDER == "mock":
        return MockClassifierService()
    elif settings.CLASSIFIER_PROVIDER == "rekognition":
        from app.services.classifier.rekognition import RekognitionClassifierService
        return RekognitionClassifierService()
    raise ValueError(f"Unknown CLASSIFIER_PROVIDER: {settings.CLASSIFIER_PROVIDER}")
