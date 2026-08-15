import httpx
import os
import json
import re


async def draft_with_ai(prompt: str, recipient: str, sender_name: str, tone: str = "professional") -> dict:
    """Call OpenRouter to generate subject + body from a prompt."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "nvidia/llama-3.1-nemotron-ultra-253b-v1")

    system = (
        f"You are drafting an email on behalf of {sender_name}. "
        f"Write in a {tone} tone. "
        "Return ONLY valid JSON with exactly two keys: \"subject\" (string) and \"body\" (string). "
        "No markdown, no explanation outside the JSON."
    )
    user_msg = f"Write an email to {recipient} about: {prompt}"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": os.getenv("APP_URL", "https://uid.varshitreddy.me"),
                "X-Title": "TaskFlow Automations",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                "max_tokens": 600,
            },
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()

    # Extract JSON even if the model wrapped it in backticks
    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        raise ValueError(f"AI returned unexpected format: {content[:200]}")

    data = json.loads(match.group())
    return {"subject": data.get("subject", ""), "body": data.get("body", "")}


async def send_smtp_email(to: str, subject: str, body: str) -> None:
    """Send email via Resend API."""
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        raise ValueError("RESEND_API_KEY is not set in environment variables")

    from_email = os.getenv("FROM_EMAIL", "TaskFlow <noreply@varshitreddy.me>")
    html_body = "<br>".join(body.splitlines())

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_email,
                "to": [to],
                "subject": subject,
                "html": f"<div style='font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;line-height:1.6'>{html_body}</div>",
            },
        )
        if not resp.is_success:
            raise ValueError(f"Resend error {resp.status_code}: {resp.text}")
