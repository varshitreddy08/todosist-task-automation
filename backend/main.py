from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import os
import asyncio
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from database import init_db, get_db, Automation
from services.whatsapp import send_whatsapp_message
from services.email_ai import draft_with_ai, send_smtp_email

load_dotenv()

app = FastAPI(title="TaskFlow Automations")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler()


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Auth ──────────────────────────────────────────────────────────────────────

def verify_api_key(x_api_key: str = Header(...)):
    expected = os.getenv("API_KEY", "")
    if not expected or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


# ── Pydantic models ───────────────────────────────────────────────────────────

class ScheduleWhatsApp(BaseModel):
    user_id: str
    to_phone: str
    message: str
    scheduled_at: datetime


class ScheduleEmailAI(BaseModel):
    user_id: str
    to_email: str
    recipient_name: Optional[str] = "there"
    ai_prompt: str
    tone: Optional[str] = "professional"
    scheduled_at: datetime


class AutomationOut(BaseModel):
    id: str
    user_id: str
    type: str
    to_phone: Optional[str]
    wa_message: Optional[str]
    to_email: Optional[str]
    email_subject: Optional[str]
    email_body: Optional[str]
    ai_prompt: Optional[str]
    scheduled_at: datetime
    sent_at: Optional[datetime]
    status: str
    error: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Scheduler job ─────────────────────────────────────────────────────────────

async def process_due_automations():
    from database import SessionLocal
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        pending = db.query(Automation).filter(
            Automation.status == "pending",
        ).all()
        # Filter in Python to avoid naive/aware comparison issues
        due = [item for item in pending if item.scheduled_at is not None and (
            item.scheduled_at.replace(tzinfo=timezone.utc) if item.scheduled_at.tzinfo is None else item.scheduled_at
        ) <= now]

        for item in due:
            try:
                if item.type == "whatsapp":
                    await send_whatsapp_message(item.to_phone, item.wa_message)

                elif item.type == "email_ai":
                    subject = item.email_subject
                    body = item.email_body

                    # recipient_name is stored in wa_message field for email type
                    recipient = item.wa_message or item.to_email

                    # If AI hasn't drafted yet, draft now
                    if item.ai_prompt and not body:
                        draft = await draft_with_ai(
                            prompt=item.ai_prompt,
                            recipient=recipient,
                            sender_name=os.getenv("SMTP_FROM_NAME", "Varshit"),
                        )
                        subject = draft["subject"]
                        body = draft["body"]
                        item.email_subject = subject
                        item.email_body = body

                    await send_smtp_email(item.to_email, subject, body)

                item.status = "sent"
                item.sent_at = datetime.now(timezone.utc)
                print(f"[Automation] Sent {item.type} for user {item.user_id}: {item.id}")

            except Exception as e:
                item.status = "failed"
                item.error = str(e)
                print(f"[Automation] Failed {item.id}: {e}")

        db.commit()
    finally:
        db.close()


# ── Startup / shutdown ────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    init_db()
    scheduler.add_job(
        process_due_automations,
        trigger=IntervalTrigger(minutes=1),
        id="process_automations",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    print("[Scheduler] Started — checking automations every minute")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.post("/api/schedule/whatsapp", response_model=AutomationOut)
def schedule_whatsapp(
    data: ScheduleWhatsApp,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    item = Automation(
        user_id=data.user_id,
        type="whatsapp",
        to_phone=data.to_phone,
        wa_message=data.message,
        scheduled_at=data.scheduled_at,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.post("/api/schedule/email-ai", response_model=AutomationOut)
def schedule_email_ai(
    data: ScheduleEmailAI,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    item = Automation(
        user_id=data.user_id,
        type="email_ai",
        to_email=data.to_email,
        ai_prompt=data.ai_prompt,
        # store recipient_name in email_subject temporarily so scheduler can use it
        email_subject=None,
        email_body=None,
        scheduled_at=data.scheduled_at,
    )
    # Store recipient name alongside the prompt so the scheduler can use it
    item.wa_message = data.recipient_name  # reuse field as recipient_name store
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.get("/api/automations", response_model=List[AutomationOut])
def list_automations(
    user_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    return db.query(Automation).filter(Automation.user_id == user_id).order_by(Automation.scheduled_at.desc()).limit(100).all()


@app.delete("/api/automations/{item_id}")
def cancel_automation(
    item_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    item = db.query(Automation).filter(Automation.id == item_id, Automation.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    if item.status != "pending":
        raise HTTPException(status_code=400, detail="Can only cancel pending automations")
    db.delete(item)
    db.commit()
    return {"success": True}


@app.post("/api/preview-email")
async def preview_email(
    data: ScheduleEmailAI,
    _: str = Depends(verify_api_key),
):
    """Draft the email immediately with AI so the user can preview before scheduling."""
    draft = await draft_with_ai(
        prompt=data.ai_prompt,
        recipient=data.recipient_name or data.to_email,
        sender_name=os.getenv("SMTP_FROM_NAME", "Varshit"),
        tone=data.tone or "professional",
    )
    return draft
