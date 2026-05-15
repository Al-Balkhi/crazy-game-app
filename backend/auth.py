"""Shared settings helpers for authentication."""

import hashlib

from sqlalchemy.orm import Session

from models import Settings


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def get_settings_row(db: Session) -> Settings:
    settings = db.query(Settings).first()
    if not settings:
        settings = Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings
