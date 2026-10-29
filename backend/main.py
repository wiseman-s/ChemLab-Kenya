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
import logging
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors, AllChem, QED
from sympy import Matrix, lcm

from chemistry.pubchem import search_compound_by_name, clear_cache, get_cache_stats
from chemistry.rdkit_renderer import smiles_to_svg

from chat import chat_with_deepseek, clear_conversation, get_conversation_summary

from database import engine, Base
from auth import models as auth_models  # noqa: F401
from auth import router as auth_router

logger = logging.getLogger("chemlab")

app = FastAPI(
    title="ChemLab Kenya API",
    description="Chemistry API for Kenyan Universities",
    version="1.9.0"
)


# ------------------------------------------------------------
# Middleware order matters: the LAST one added is the OUTERMOST.
# 1) catch-all error middleware (inner)
# 2) CORS (outer) -> so even error responses get CORS headers
# ------------------------------------------------------------
@app.middleware("http")
async def catch_all_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.exception("Unhandled error on %s", request.url)
        return JSONResponse(
            status_code=500,
            content={"detail": f"{type(e).__name__}: {e}"},
        )


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
# HELPERS  --> PASTE YOUR REAL FUNCTION BODIES HERE
# ============================================================

def analyze_molecule(smiles: str) -> dict:
    # PASTE YOUR EXISTING analyze_molecule BODY HERE
    ...


def parse_chemical_formula(formula: str) -> dict:
    # PASTE YOUR EXISTING BODY HERE
    ...


def balance_equation(equation: str) -> dict:
    # PASTE YOUR EXISTING BODY HERE
    ...


# ============================================================
# ROUTES
# ============================================================

@app.get("/balance_equation")
def balance_equation_route(equation: str):
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
def analyze(smiles: str):
    result = analyze_molecule(smiles)
    if not result:
        raise HTTPException(status_code=500, detail="analyze_molecule returned nothing")
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/analyze", response_model=dict)
def analyze_post(molecule: dict):
    smiles = molecule.get("smiles")
    if not smiles:
        raise HTTPException(status_code=400, detail="Missing 'smiles' field in request body")
    result = analyze_molecule(smiles)
    if not result:
        raise HTTPException(status_code=500, detail="analyze_molecule returned nothing")
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/generate_3d")
def generate_3d(smiles: str):
    # PASTE YOUR EXISTING generate_3d BODY HERE
    ...


@app.get("/health")
def health_check():
    return {"status": "healthy", "rdkit": "loaded", "auth": "loaded"}


@app.get("/api/compound/formula")
async def compound_by_formula(formula: str):
    # PASTE YOUR EXISTING BODY HERE
    ...


@app.get("/api/compound/name")
async def compound_by_name(name: str):
    # PASTE YOUR EXISTING BODY HERE
    ...


@app.post("/api/chat")
async def chat(body: dict):
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
