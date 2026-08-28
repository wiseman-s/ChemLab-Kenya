# backend/whatsapp.py
import os
import requests
from typing import Optional

# WAGate configuration - Reads from environment variables
# NOTE: WA_GATEWAY_URL should be the bare host, e.g. "https://your-wagate-host.com"
#       (no trailing /api — we add that prefix below, matching WAGate's Base URL: /api)
WA_GATEWAY_URL = os.getenv("WA_GATEWAY_URL", "http://localhost:3000")
WA_API_KEY = os.getenv("WA_API_KEY", "chemlab-key-2024")
WA_PHONE_NUMBER = os.getenv("WA_PHONE_NUMBER", "")


def _masked_key(key: str) -> str:
    if not key or len(key) < 6:
        return "***"
    return f"{key[:3]}...{key[-3:]}"


def send_whatsapp_message(phone: str, message: str) -> dict:
    """
    Send a WhatsApp message via WAGate API.
    WAGate's routes are all under /api (see its Swagger 'Base URL: /api'),
    so the real endpoint is /api/chat/send, not /chat/send.
    """
    try:
        clean_phone = phone.replace("+", "").replace(" ", "")
        wa_gateway = WA_GATEWAY_URL.rstrip("/")

        url = f"{wa_gateway}/api/chat/send"
        print(f"📡 WAGate call -> url={url} key={_masked_key(WA_API_KEY)}")

        response = requests.post(
            url,
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


def verify_api_key() -> dict:
    """
    Sanity-check helper: hits WAGate's dedicated /api/auth/verify endpoint
    to confirm the API key itself is valid, independent of any send-endpoint
    path issues. Handy for debugging.
    """
    try:
        wa_gateway = WA_GATEWAY_URL.rstrip("/")
        response = requests.get(
            f"{wa_gateway}/api/auth/verify",
            headers={"X-API-Key": WA_API_KEY},
            timeout=15
        )
        return {
            "status_code": response.status_code,
            "body": response.text
        }
    except Exception as e:
        return {"error": str(e)}


def format_analysis_message(molecule_data: dict) -> str:
    """Format molecule analysis results for WhatsApp."""
    message = f"""🧪 ChemLab Kenya - Molecule Analysis
📊 Formula: {molecule_data.get('formula', 'N/A')}
⚖️ Molecular Weight: {molecule_data.get('molecular_weight', 'N/A')} g/mol
🧪 SMILES: {molecule_data.get('smiles', 'N/A')}
🔬 LogP: {molecule_data.get('logp', 'N/A')}
💧 TPSA: {molecule_data.get('tpsa', 'N/A')} Å²
💊 Lipinski Pass: {'✅ Pass' if molecule_data.get('lipinski_pass', False) else '⚠️ Fail'}
💡 View full results: https://chemlab-kenya.vercel.app"""
    return message


def send_molecule_analysis(phone: str, molecule_data: dict) -> dict:
    """Send molecule analysis results via WhatsApp."""
    message = format_analysis_message(molecule_data)
    return send_whatsapp_message(phone, message)


def send_welcome_message(phone: str) -> dict:
    """Send a welcome message to new users."""
    message = f"""🧪 Welcome to ChemLab Kenya!
I'm your chemistry assistant. You can:
- Send me a compound name (e.g., "ethanol")
- Send me a SMILES string (e.g., "CCO")
- Get molecule analysis instantly
Try it now! Send me a compound name. 🌟"""
    return send_whatsapp_message(phone, message)


def send_compound_found(phone: str, name: str, smiles: str) -> dict:
    """Send compound information when found."""
    message = f"""✅ Found compound: {name}
🧪 SMILES: {smiles}
🔬 Visit ChemLab Kenya to analyze: https://chemlab-kenya.vercel.app
Reply with 'analyze' to get full analysis!"""
    return send_whatsapp_message(phone, message)
