# backend/chat.py
import os
import json
import requests
from typing import List, Dict, Any

# Hugging Face configuration
# Set this in your environment — never hardcode it in source
HF_API_KEY = os.getenv("HF_API_KEY")
HF_MODEL = os.getenv("HF_MODEL", "google/gemma-2-2b-it")

# New router endpoint (api-inference.huggingface.co was shut down)
API_URL = "https://router.huggingface.co/v1/chat/completions"

SYSTEM_PROMPT = """You are ChemLab Bot – a friendly chemistry assistant for students in Kenya.

Your goals:
1. Help students understand chemistry concepts (from Form 3 to university level)
2. Explain what ChemLab Kenya can do and how to use it
3. Answer questions clearly, like you're talking to a Kenyan student

About ChemLab Kenya:
- Molecule Analyzer: Draw molecules using Ketcher, view 3D structures, analyze molecular properties
- NMR Predictor: Predict 1H and 13C NMR spectra
- Equation Balancer: Balance chemical equations automatically
- Compound Explorer: Search compounds by name, get SMILES and details
- Periodic Table: Interactive periodic table with element details
- Chemistry Calculators: Molarity, moles ↔ mass, dilution, gas laws
- Physics Calculators: Motion, forces, energy

Reply clearly, like you're talking to a Kenyan high school or university student.
Be helpful and encouraging. Use examples when useful.
Keep answers concise but thorough. Use simple English.
"""

conversations: Dict[str, List[Dict[str, str]]] = {}


def get_conversation(session_id: str) -> List[Dict[str, str]]:
    if session_id not in conversations:
        conversations[session_id] = []
    return conversations[session_id]


def chat_with_deepseek(
    message: str,
    session_id: str = "default",
    history_limit: int = 10
) -> Dict[str, Any]:
    if not HF_API_KEY:
        return {
            "success": False,
            "error": "HF_API_KEY environment variable is not set.",
            "conversation_id": session_id
        }

    try:
        history = get_conversation(session_id)

        # Build proper chat-format messages (system + history + new message)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(history[-history_limit:])
        messages.append({"role": "user", "content": message})

        headers = {
            "Authorization": f"Bearer {HF_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": HF_MODEL,
            "messages": messages,
            "max_tokens": 512,
            "temperature": 0.7,
        }

        response = requests.post(API_URL, headers=headers, json=payload, timeout=30)

        if response.status_code == 503:
            return {
                "success": False,
                "error": "The AI model is loading. Please wait a few seconds and try again.",
                "conversation_id": session_id
            }

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Hugging Face API error: {response.status_code} - {response.text[:200]}",
                "conversation_id": session_id
            }

        data = response.json()
        print(f"🔎 HF raw response: {json.dumps(data)[:1500]}")

        assistant_message = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        if not assistant_message:
            assistant_message = "I couldn't generate a response. Please try again."

        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": assistant_message})

        if len(history) > 50:
            conversations[session_id] = history[-50:]

        return {
            "success": True,
            "response": assistant_message,
            "conversation_id": session_id,
            "provider": "huggingface"
        }

    except requests.exceptions.ConnectionError as e:
        return {
            "success": False,
            "error": f"Network error connecting to Hugging Face: {str(e)}",
            "conversation_id": session_id
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error: {str(e)}",
            "conversation_id": session_id
        }


def clear_conversation(session_id: str) -> Dict[str, Any]:
    if session_id in conversations:
        conversations[session_id] = []
        return {"success": True, "message": "Conversation cleared"}
    return {"success": False, "error": "Session not found"}


def get_conversation_summary(session_id: str) -> Dict[str, Any]:
    if session_id in conversations:
        history = conversations[session_id]
        return {
            "success": True,
            "message_count": len(history),
            "messages": history
        }
    return {"success": False, "error": "Session not found"}
