# backend/chat.py
import os
import json
from typing import List, Dict, Any, Optional
from openai import OpenAI

# DeepSeek configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# Initialize DeepSeek client
client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com/v1"
)

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

# Store conversation history (simple in-memory cache)
# In production, use Redis or a database
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
    Send a message to DeepSeek and get a response.
    
    Args:
        message: User's message
        session_id: Unique ID for the conversation
        history_limit: Number of previous messages to include
    
    Returns:
        dict: Contains response and conversation history
    """
    try:
        # Get conversation history
        history = get_conversation(session_id)
        
        # Build messages array
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # Add conversation history (limited to history_limit)
        for msg in history[-history_limit:]:
            messages.append(msg)
        
        # Add the new user message
        messages.append({"role": "user", "content": message})
        
        # Call DeepSeek API
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
            stream=False
        )
        
        # Extract the response
        assistant_message = response.choices[0].message.content
        
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
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
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
