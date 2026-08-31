# backend/chat.py
import os
import json
import requests
from typing import List, Dict, Any, Optional

# Hugging Face configuration (FREE!)
HF_API_KEY = "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"
HF_MODEL = os.getenv("HF_MODEL", "google/gemma-2-2b-it")  # Free, fast model

# System prompt - teaches the AI about ChemLab Kenya
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

# Store conversation history
conversations: Dict[str, List[Dict[str, str]]] = {}

def get_conversation(session_id: str) -> List[Dict[str, str]]:
    """Get or create conversation history for a session."""
    if session_id not in conversations:
        conversations[session_id] = []
    return conversations[session_id]

def chat_with_deepseek(
    message: str,
    session_id: str = "default",
    history_limit: int = 10
) -> Dict[str, Any]:
    """
    Send a message to Hugging Face's free inference API.
    """
    try:
        # Get conversation history
        history = get_conversation(session_id)
        
        # Build the prompt with history
        prompt = SYSTEM_PROMPT + "\n\n"
        for msg in history[-history_limit:]:
            prompt += f"{msg['role']}: {msg['content']}\n"
        prompt += f"user: {message}\nassistant:"
        
        # Call Hugging Face API
        API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
        headers = {"Authorization": f"Bearer {HF_API_KEY}"}
        
        response = requests.post(
            API_URL,
            headers=headers,
            json={
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 512,
                    "temperature": 0.7,
                    "do_sample": True
                }
            },
            timeout=30
        )
        
        if response.status_code == 503:
            # Model is loading - wait and retry
            return {
                "success": False,
                "error": "The AI model is loading. Please wait 10 seconds and try again.",
                "conversation_id": session_id
            }
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Hugging Face API error: {response.status_code}",
                "conversation_id": session_id
            }
        
        data = response.json()
        
        # Extract the response
        if isinstance(data, list) and len(data) > 0:
            assistant_message = data[0].get("generated_text", "")
            # Remove the prompt from the response
            assistant_message = assistant_message.replace(prompt, "").strip()
        else:
            assistant_message = data.get("generated_text", "").replace(prompt, "").strip()
        
        if not assistant_message:
            assistant_message = "I couldn't generate a response. Please try again."
        
        # Store in conversation history
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": assistant_message})
        
        # Keep history manageable (limit to 50 messages)
        if len(history) > 50:
            conversations[session_id] = history[-50:]
        
        return {
            "success": True,
            "response": assistant_message,
            "conversation_id": session_id,
            "provider": "huggingface"
        }
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "The AI service is taking too long. Please try again.",
            "conversation_id": session_id
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "conversation_id": session_id
        }

def clear_conversation(session_id: str) -> Dict[str, Any]:
    """Clear conversation history for a session."""
    if session_id in conversations:
        conversations[session_id] = []
        return {"success": True, "message": "Conversation cleared"}
    return {"success": False, "error": "Session not found"}

def get_conversation_summary(session_id: str) -> Dict[str, Any]:
    """Get summary of a conversation."""
    if session_id in conversations:
        history = conversations[session_id]
        return {
            "success": True,
            "message_count": len(history),
            "messages": history
        }
    return {"success": False, "error": "Session not found"}
