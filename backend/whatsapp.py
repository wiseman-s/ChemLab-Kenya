# backend/whatsapp.py
import os
import requests
from typing import Optional

# WAGate configuration - Reads from environment variables
WA_GATEWAY_URL = os.getenv("WA_GATEWAY_URL", "http://localhost:3000")
WA_API_KEY = os.getenv("WA_API_KEY", "chemlab-key-2024")
WA_PHONE_NUMBER = os.getenv("WA_PHONE_NUMBER", "")

def _masked_key(key: str) -> str:
    """Show only the first/last couple chars so we can debug without leaking the key."""
    if not key or len(key) < 6:
        return "***"
    return f"{key[:3]}...{key[-3:]}"

def send_whatsapp_message(phone: str, message: str) -> dict:
    """
    Send a WhatsApp message via WAGate API.
    """
    try:
        clean_phone = phone.replace("+", "").replace(" ", "")
        wa_gateway = WA_GATEWAY_URL

        # Debug: confirm what config is actually being used at request time.
        # This is safe to log — it never prints the full key.
        print(f"📡 WAGate call -> url={wa_gateway}/chat/send key={_masked_key(WA_API_KEY)}")

        response = requests.post(
            f"{wa_gateway}/chat/send",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": WA_API_KEY
            },
            json={
                "phone": clean_phone,
                "message": message
            },
            timeout=30
        )

        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            print(f"⚠️ WAGate rejected request: {response.status_code} {response.text}")
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "WAGate service not running. Check your WAGate deployment."}
    except Exception as e:
        return {"success": False, "error": str(e)}
