# backend/chat.py
import os
import json
import requests
from typing import List, Dict, Any

# ============================================================
# PROVIDER CONFIGURATION
# ============================================================

# Groq (primary — fast + generous free tier)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# OpenRouter (fallback — used if Groq fails or is rate-limited)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


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

About the creator and ChemLab Kenya's story:
ChemLab Kenya was built by Simon W., a software engineer and researcher based in Thika, Kenya, who studied at the University of Nairobi. The platform was started in 2026.
As a researcher, Simon often needed to explore different chemical compounds, and realized there wasn't a single, easy-to-use platform where Kenyan students — from high school all the way to university — could do the same kind of exploration for learning. That gap became the motivation for ChemLab Kenya: one platform combining molecule analysis, NMR prediction, equation balancing, compound lookup, and both chemistry and physics calculators, built specifically with Kenyan students in mind.
What makes ChemLab Kenya different is that it's designed to be simple and approachable — students can interact directly with real chemistry tools (drawing molecules, predicting spectra, balancing equations) instead of just reading about them, making the learning experience more hands-on.
Only share these details if the user specifically asks who built ChemLab Kenya, about its history/story, the developer, or the motivation behind it — don't bring it up unprompted in unrelated chemistry answers. Keep it to a short, natural paragraph or two, not the full text verbatim.

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


# ============================================================
# PROVIDER CALLS
# ============================================================

def _call_groq(messages: List[Dict[str, str]]) -> tuple[bool, str, str]:
    """
    Call Groq. Returns (success, response_text_or_error, provider_name).
    """
    if not GROQ_API_KEY:
        return False, "GROQ_API_KEY not set", "groq"

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "max_tokens": 900,
        "temperature": 0.7,
    }

    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)

        # Transient — retry once
        if response.status_code in (404, 429, 500, 502, 503):
            print(f"⚠️ Groq transient error {response.status_code}, retrying once: {response.text[:200]}", flush=True)
            response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)

        if response.status_code != 200:
            print(f"❌ Groq API error {response.status_code}: {response.text[:300]}", flush=True)
            return False, f"Groq returned {response.status_code}", "groq"

        data = response.json()
        assistant_message = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        if not assistant_message:
            return False, "Groq returned empty response", "groq"

        return True, assistant_message, "groq"

    except requests.exceptions.ConnectionError as e:
        print(f"❌ Groq network error: {e}", flush=True)
        return False, f"Groq network error: {e}", "groq"
    except Exception as e:
        print(f"❌ Groq unexpected error: {e}", flush=True)
        return False, f"Groq error: {e}", "groq"


def _call_openrouter(messages: List[Dict[str, str]]) -> tuple[bool, str, str]:
    """
    Call OpenRouter as fallback. Returns (success, response_text_or_error, provider_name).
    """
    if not OPENROUTER_API_KEY:
        return False, "OPENROUTER_API_KEY not set", "openrouter"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chemlab-kenya.onrender.com",
        "X-Title": "ChemLab Kenya",
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "max_tokens": 900,
        "temperature": 0.7,
    }

    try:
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=30)

        if response.status_code in (404, 429, 500, 502, 503):
            print(f"⚠️ OpenRouter transient error {response.status_code}, retrying once: {response.text[:200]}", flush=True)
            response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=30)

        if response.status_code != 200:
            print(f"❌ OpenRouter API error {response.status_code}: {response.text[:300]}", flush=True)
            return False, f"OpenRouter returned {response.status_code}", "openrouter"

        data = response.json()
        assistant_message = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        if not assistant_message:
            return False, "OpenRouter returned empty response", "openrouter"

        return True, assistant_message, "openrouter"

    except requests.exceptions.ConnectionError as e:
        print(f"❌ OpenRouter network error: {e}", flush=True)
        return False, f"OpenRouter network error: {e}", "openrouter"
    except Exception as e:
        print(f"❌ OpenRouter unexpected error: {e}", flush=True)
        return False, f"OpenRouter error: {e}", "openrouter"


# ============================================================
# MAIN ENTRY POINT (name unchanged so main.py import still works)
# ============================================================

def chat_with_deepseek(
    message: str,
    session_id: str = "default",
    history_limit: int = 10
) -> Dict[str, Any]:
    """
    Send a message to the chatbot.
    Tries Groq first (primary), falls back to OpenRouter if Groq fails.
    """
    history = get_conversation(session_id)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history[-history_limit:])
    messages.append({"role": "user", "content": message})

    # ---- Attempt 1: Groq (primary) ----
    success, result, provider = _call_groq(messages)

    # ---- Attempt 2: OpenRouter (fallback) ----
    if not success:
        print(f"↪️ Groq failed ({result}), falling back to OpenRouter", flush=True)
        success, result, provider = _call_openrouter(messages)

    # ---- Both failed ----
    if not success:
        print(f"❌ All providers failed. Last error: {result}", flush=True)
        return {
            "success": False,
            "error": "I'm having trouble connecting right now. Please try again in a moment! 🧪",
            "conversation_id": session_id,
        }

    # ---- Success: update history ----
    assistant_message = result
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": assistant_message})

    if len(history) > 50:
        conversations[session_id] = history[-50:]

    print(f"✅ Response from {provider}", flush=True)

    return {
        "success": True,
        "response": assistant_message,
        "conversation_id": session_id,
        "provider": provider,
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
            "messages": history,
        }
    return {"success": False, "error": "Session not found"}
