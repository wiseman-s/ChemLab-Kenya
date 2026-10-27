import re
import random
import urllib.parse
import xml.etree.ElementTree as ET
from fractions import Fraction
from math import gcd
from functools import reduce
import httpx
import asyncio
from typing import Optional, List, Dict, Any
import json
import os
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors, AllChem, QED
from sympy import Matrix, lcm

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from rate_limit import limiter

from chemistry.pubchem import search_compound_by_name, clear_cache, get_cache_stats
from chemistry.rdkit_renderer import smiles_to_svg

from chat import chat_with_deepseek, clear_conversation, get_conversation_summary

from database import engine, Base
from auth import models as auth_models  # noqa: F401
from auth import router as auth_router

app = FastAPI(
    title="ChemLab Kenya API",
    description="Chemistry API for Kenyan Universities",
    version="1.9.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "https://chem-lab-kenya.vercel.app",
        "https://chemlab-kenya.vercel.app",
        "https://chemlab.co.ke",
        "https://www.chemlab.co.ke",
        "https://chemlab-kenya.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
app.include_router(auth_router)


# ============================================================
# HELPERS (unchanged)
# ============================================================

def analyze_molecule(smiles: str) -> dict:
    # ... (your existing analyze_molecule function — unchanged)
    ...


def parse_chemical_formula(formula: str) -> dict:
    # ... (unchanged)
    ...


def balance_equation(equation: str) -> dict:
    # ... (unchanged)
    ...


# ============================================================
# ROUTES
# ============================================================

@app.get("/balance_equation")
@limiter.limit("20/minute")
def balance_equation_route(request: Request, equation: str):
    try:
        return balance_equation(equation)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
def root():
    return {
        "message": "🧪 ChemLab Kenya API is running!",
        "version": "1.9.0",
        "status": "online",
        "auth": "enabled"
    }


@app.get("/analyze", response_model=dict)
@limiter.limit("20/minute")
def analyze(request: Request, smiles: str):
    result = analyze_molecule(smiles)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/analyze", response_model=dict)
@limiter.limit("20/minute")
def analyze_post(request: Request, molecule: dict):
    smiles = molecule.get("smiles")
    if not smiles:
        raise HTTPException(status_code=400, detail="Missing 'smiles' field in request body")
    result = analyze_molecule(smiles)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/generate_3d")
@limiter.limit("15/minute")
def generate_3d(request: Request, smiles: str):
    # ... (unchanged)
    ...


@app.get("/health")
def health_check():
    return {"status": "healthy", "rdkit": "loaded", "auth": "loaded"}


@app.get("/api/compound/formula")
@limiter.limit("10/minute")
async def compound_by_formula(request: Request, formula: str):
    # ... (unchanged)
    ...


@app.get("/api/compound/name")
@limiter.limit("10/minute")
async def compound_by_name(request: Request, name: str):
    # ... (unchanged)
    ...


@app.post("/api/chat")
@limiter.limit("15/minute")
async def chat(request: Request, body: dict):
    message = body.get("message")
    session_id = body.get("session_id", "default")
    if not message:
        return {"success": False, "error": "Message is required"}
    return chat_with_deepseek(message, session_id)


@app.post("/api/chat/clear")
async def clear_chat(request: dict):
    session_id = request.get("session_id", "default")
    return clear_conversation(session_id)


@app.get("/api/chat/history")
async def chat_history(session_id: str = "default"):
    return get_conversation_summary(session_id)


@app.get("/api/compound/cache/stats")
def cache_stats():
    pubchem_stats = get_cache_stats()
    return {
        "pubchem": pubchem_stats,
        "total": {
            "file_count": pubchem_stats.get("file_cache_count", 0),
            "size_kb": pubchem_stats.get("size_kb", 0)
        }
    }


@app.post("/api/compound/cache/clear")
def clear_cache_route():
    clear_cache()
    return {"status": "All caches cleared"}


# Removed: /api/predict_nmr and /api/predict_nmr_csp5
# These were consuming memory on the free tier and never worked reliably.
# Drug-likeness panel now serves as the "medicine discovery" feature.


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
