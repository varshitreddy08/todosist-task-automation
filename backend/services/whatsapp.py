import httpx
import os
import re


def _normalize_phone(phone: str) -> str:
    """Strip all non-digits, ensure no leading +"""
    return re.sub(r"\D", "", phone)


async def send_whatsapp_message(phone: str, message: str) -> dict:
    instance_id = os.getenv("GREEN_API_INSTANCE_ID")
    api_token = os.getenv("GREEN_API_TOKEN")

    if not instance_id or not api_token:
        raise ValueError("GREEN_API_INSTANCE_ID and GREEN_API_TOKEN must be set")

    phone_clean = _normalize_phone(phone)
    chat_id = f"{phone_clean}@c.us"
    url = f"https://api.green-api.com/waInstance{instance_id}/sendMessage/{api_token}"

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, json={"chatId": chat_id, "message": message})
        response.raise_for_status()
        return response.json()
