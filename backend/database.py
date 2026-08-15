from sqlalchemy import create_engine, Column, String, DateTime, Text, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import uuid
import os

DATABASE_URL = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL", "")

print(f"[DB] NEON_DATABASE_URL set: {bool(os.environ.get('NEON_DATABASE_URL'))}")
print(f"[DB] DATABASE_URL set: {bool(os.environ.get('DATABASE_URL'))}")
print(f"[DB] Final URL empty: {not DATABASE_URL}")

if not DATABASE_URL:
    raise RuntimeError("No database URL found. Set NEON_DATABASE_URL in Railway Variables.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Automation(Base):
    __tablename__ = "automations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    type = Column(String, nullable=False)
    to_phone = Column(String, nullable=True)
    wa_message = Column(Text, nullable=True)
    to_email = Column(String, nullable=True)
    email_subject = Column(String, nullable=True)
    email_body = Column(Text, nullable=True)
    ai_prompt = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="pending")
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
