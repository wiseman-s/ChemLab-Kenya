# backend/chat.py
import os
import json
import requests
from typing import List, Dict, Any, Optional

# Hugging Face configuration (FREE!)
HF_API_KEY = "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"
HF_MODEL = os.getenv("HF_MODEL", "google/gemma-2-2b-it")

# System prompt
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
    try:
        history = get_conversation(session_id)
        
        # Build the prompt
        messages = []
        for msg in history[-history_limit:]:
            messages.append(msg)
        messages.append({"role": "user", "content": message})
        
        # Use the chat completion endpoint (more reliable)
        API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
        
        # Format messages for the API
        prompt = ""
        for msg in messages:
            prompt += f"{msg['role']}: {msg['content']}\n"
        prompt += "assistant:"
        
        headers = {
            "Authorization": f"Bearer {HF_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 256,
                "temperature": 0.7,
                "do_sample": True,
                "return_full_text": False
            }
        }
        
        # Try with a timeout and retry logic
        try:
            response = requests.post(
                API_URL,
                headers=headers,
                json=payload,
                timeout=20
            )
        except requests.exceptions.ConnectionError:
            # Try using the replica endpoint
            API_URL_REPLICA = f"https://api-inference.huggingface.co/models/{HF_MODEL}/replica"
            response = requests.post(
                API_URL_REPLICA,
                headers=headers,
                json=payload,
                timeout=20
            )
        
        if response.status_code == 503:
            return {
                "success": False,
                "error": "The AI model is loading. Please wait 10 seconds and try again.",
                "conversation_id": session_id
            }
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Hugging Face API error: {response.status_code} - {response.text[:100]}",
                "conversation_id": session_id
            }
        
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            assistant_message = data[0].get("generated_text", "").strip()
        else:
            assistant_message = data.get("generated_text", "").strip()
        
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
