# backend/chat.py
import os
import json
import requests
from typing import List, Dict, Any

# OpenRouter configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# "openrouter/free" is OpenRouter's own auto-router that picks a free model.
# For more predictable behavior, you can pin a specific free model instead, e.g.:
# OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")

# Correct chat completions endpoint (the bare domain is not a valid API URL)
API_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are ChemLab Bot – a friendly chemistry assistant for students in Kenya, replying inside a small chat widget.

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

Formatting rules (important, this is a small chat widget, not a document):
- Keep each answer short: 2–5 short paragraphs maximum, or a short list.
- Do NOT use markdown headers (no #, ##, ###).
- Use **bold** sparingly, only for 1-2 key terms.
- Avoid heavy emoji decoration — at most one emoji per answer, if any.
- Never pad an answer with horizontal rules (---) or excessive section breaks.
- Always finish your answer completely within the length you have — don't start more sections than you can finish.

Be helpful and encouraging. Use simple English and short examples when useful.
"""

conversations: Dict[str, List[Dict[str, str]]] = {}


def get_conversation(session_id: str) -> List[Dict[str, str]]:
    if session_id not in conversations:
        conversations[session_id] = []
    return conversations[session_id]


# Keep this name matching what main.py imports: chat_with_deepseek
def chat_with_deepseek(
    message: str,
    session_id: str = "default",
    history_limit: int = 10
) -> Dict[str, Any]:
    if not OPENROUTER_API_KEY:
        return {
            "success": False,
            "error": "OPENROUTER_API_KEY environment variable is not set.",
            "conversation_id": session_id
        }

    try:
        history = get_conversation(session_id)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(history[-history_limit:])
        messages.append({"role": "user", "content": message})

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://chemlab-kenya.onrender.com",
            "X-Title": "ChemLab Kenya"
        }

        payload = {
            "model": OPENROUTER_MODEL,
            "messages": messages,
            "max_tokens": 900,
            "temperature": 0.7,
        }

        response = requests.post(API_URL, headers=headers, json=payload, timeout=30)

        if response.status_code != 200:
            return {
                "success": False,
                "error": f"OpenRouter API error: {response.status_code} - {response.text[:200]}",
                "conversation_id": session_id
            }

        data = response.json()
        print(f"🔎 OpenRouter raw response: {json.dumps(data)[:1500]}", flush=True)

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
            "provider": "openrouter"
        }

    except requests.exceptions.ConnectionError as e:
        return {
            "success": False,
            "error": f"Network error connecting to OpenRouter: {str(e)}",
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
