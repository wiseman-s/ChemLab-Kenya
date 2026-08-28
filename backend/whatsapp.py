# backend/whatsapp.py
import os
import requests
from typing import Optional

# WAGate configuration - Reads from environment variables
WA_GATEWAY_URL = os.getenv("WA_GATEWAY_URL", "http://localhost:3000")
WA_API_KEY = os.getenv("WA_API_KEY", "chemlab-key-2024")
WA_PHONE_NUMBER = os.getenv("WA_PHONE_NUMBER", "")  # Your connected WhatsApp number

# Your virtual Canadian number (for sending)
YOUR_WA_NUMBER = "+12264079771"

def send_whatsapp_message(phone: str, message: str) -> dict:
    """
    Send a WhatsApp message via WAGate API.
    
    Args:
        phone: Recipient phone number in international format (e.g., 254712345678)
        message: Text message to send
    
    Returns:
        dict: Response from the API
    """
    try:
        # Clean phone number (remove + and spaces)
        clean_phone = phone.replace("+", "").replace(" ", "")
        
        # Use the environment variable for WAGate URL
        wa_gateway = WA_GATEWAY_URL
        
        response = requests.post(
            f"{wa_gateway}/api/send",
            headers={
                "Content-Type": "application/json",
                "API-Key": WA_API_KEY
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
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
            
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "WAGate service not running. Check your WAGate deployment."}
    except Exception as e:
        return {"success": False, "error": str(e)}

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
• Send me a compound name (e.g., "ethanol")
• Send me a SMILES string (e.g., "CCO")
• Get molecule analysis instantly

Try it now! Send me a compound name. 🌟"""
    
    return send_whatsapp_message(phone, message)

def send_compound_found(phone: str, name: str, smiles: str) -> dict:
    """Send compound information when found."""
    message = f"""✅ Found compound: {name}

🧪 SMILES: {smiles}
🔬 Visit ChemLab Kenya to analyze: https://chemlab-kenya.vercel.app

Reply with 'analyze' to get full analysis!"""
    
    return send_whatsapp_message(phone, message)
