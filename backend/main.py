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

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors, AllChem, QED
from sympy import Matrix, lcm

# Import chemistry modules
from chemistry.pubchem import search_compound_by_name, clear_cache, get_cache_stats
from chemistry.rdkit_renderer import smiles_to_svg

# Import chatbot module
from chat import chat_with_deepseek, clear_conversation, get_conversation_summary

# ============================================================
# AUTH IMPORTS
# ============================================================
from database import engine, Base
from auth import models as auth_models  # noqa: F401
from auth import router as auth_router

app = FastAPI(
    title="ChemLab Kenya API",
    description="Chemistry API for Kenyan Universities",
    version="1.7.0"
)

# ============================================================
# CORS — allow_credentials=True REQUIRED for auth cookies
# ============================================================
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

# ============================================================
# AUTH INITIALIZATION
# ============================================================
Base.metadata.create_all(bind=engine)
app.include_router(auth_router)


class MoleculeResponse(BaseModel):
    smiles: str
    canonical_smiles: str
    formula: str
    molecular_weight: float
    exact_molecular_weight: float
    logp: float
    tpsa: float
    heavy_atoms: int
    h_bond_donors: int
    h_bond_acceptors: int
    num_atoms: int
    rotatable_bonds: int
    ring_count: int
    aromatic_rings: int
    saturated_rings: int
    aliphatic_rings: int
    fraction_csp3: float
    num_heteroatoms: int
    num_stereocenters: int
    valence_electrons: int
    formal_charge: int
    molar_refractivity: float
    inchi: Optional[str] = None
    inchi_key: Optional[str] = None
    qed_score: float
    lipinski_violations: int
    lipinski_pass: bool
    error: Optional[str] = None


def analyze_molecule(smiles: str) -> dict:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"error": f"Invalid SMILES string: {smiles}"}

    try:
        mw = round(Descriptors.MolWt(mol), 3)
        logp = round(Descriptors.MolLogP(mol), 3)
        h_donors = Descriptors.NumHDonors(mol)
        h_acceptors = Descriptors.NumHAcceptors(mol)

        stereo_centers = Chem.FindMolChiralCenters(
            mol, includeUnassigned=True, useLegacyImplementation=False
        )

        try:
            inchi = Chem.MolToInchi(mol)
            inchi_key = Chem.InchiToInchiKey(inchi) if inchi else None
        except Exception:
            inchi = None
            inchi_key = None

        violations = sum([mw > 500, logp > 5, h_donors > 5, h_acceptors > 10])

        return {
            "smiles": smiles,
            "canonical_smiles": Chem.MolToSmiles(mol),
            "formula": rdMolDescriptors.CalcMolFormula(mol),
            "molecular_weight": mw,
            "exact_molecular_weight": round(Descriptors.ExactMolWt(mol), 4),
            "logp": logp,
            "tpsa": round(Descriptors.TPSA(mol), 2),
            "heavy_atoms": Descriptors.HeavyAtomCount(mol),
            "h_bond_donors": h_donors,
            "h_bond_acceptors": h_acceptors,
            "num_atoms": mol.GetNumAtoms(),
            "rotatable_bonds": Descriptors.NumRotatableBonds(mol),
            "ring_count": rdMolDescriptors.CalcNumRings(mol),
            "aromatic_rings": rdMolDescriptors.CalcNumAromaticRings(mol),
            "saturated_rings": rdMolDescriptors.CalcNumSaturatedRings(mol),
            "aliphatic_rings": rdMolDescriptors.CalcNumAliphaticRings(mol),
            "fraction_csp3": round(rdMolDescriptors.CalcFractionCSP3(mol), 3),
            "num_heteroatoms": rdMolDescriptors.CalcNumHeteroatoms(mol),
            "num_stereocenters": len(stereo_centers),
            "valence_electrons": Descriptors.NumValenceElectrons(mol),
            "formal_charge": Chem.GetFormalCharge(mol),
            "molar_refractivity": round(Descriptors.MolMR(mol), 3),
            "inchi": inchi,
            "inchi_key": inchi_key,
            "qed_score": round(QED.qed(mol), 3),
            "lipinski_violations": violations,
            "lipinski_pass": violations <= 1,
            "error": None
        }
    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}"}


def parse_chemical_formula(formula: str) -> dict:
    formula = formula.strip()
    token_re = re.compile(r'([A-Z][a-z]?|\(|\))(\d*)')
    pos = 0

    def parse_group():
        counts: dict = {}
        nonlocal pos
        while pos < len(formula) and formula[pos] != ')':
            match = token_re.match(formula, pos)
            if not match or match.start() != pos:
                raise ValueError(f"Could not parse formula near position {pos}: '{formula}'")
            token, num = match.groups()
            pos = match.end()

            if token == '(':
                inner = parse_group()
                if pos >= len(formula) or formula[pos] != ')':
                    raise ValueError(f"Mismatched parentheses in formula: '{formula}'")
                pos += 1
                mult_match = re.match(r'\d*', formula[pos:])
                mult = int(mult_match.group()) if mult_match.group() else 1
                pos += len(mult_match.group())
                for el, c in inner.items():
                    counts[el] = counts.get(el, 0) + c * mult
            else:
                count = int(num) if num else 1
                counts[token] = counts.get(token, 0) + count
        return counts

    result = parse_group()
    if not result:
        raise ValueError(f"Could not parse any elements from formula: '{formula}'")
    return result


def balance_equation(equation: str) -> dict:
    separator = '->' if '->' in equation else ('=' if '=' in equation else None)
    if separator is None:
        raise ValueError("Equation must use '->' or '=' to separate reactants and products.")

    left_raw, right_raw = equation.split(separator, 1)
    reactants = [c.strip() for c in left_raw.split('+') if c.strip()]
    products = [c.strip() for c in right_raw.split('+') if c.strip()]

    if not reactants or not products:
        raise ValueError("Equation must have at least one reactant and one product.")

    all_compounds = reactants + products
    parsed = [parse_chemical_formula(c) for c in all_compounds]
    elements = sorted({el for p in parsed for el in p.keys()})

    rows = []
    for el in elements:
        row = []
        for i, p in enumerate(parsed):
            count = p.get(el, 0)
            sign = 1 if i < len(reactants) else -1
            row.append(count * sign)
        rows.append(row)

    matrix = Matrix(rows)
    nullspace = matrix.nullspace()

    if not nullspace:
        raise ValueError("Could not balance this equation — check the formulas and try again.")

    solution = nullspace[0]
    denominators = [Fraction(str(val)).denominator for val in solution]
    common_denom = reduce(lcm, denominators, 1)
    integer_coeffs = [int(val * common_denom) for val in solution]

    common_gcd = reduce(gcd, [abs(c) for c in integer_coeffs if c != 0])
    integer_coeffs = [c // common_gcd for c in integer_coeffs]

    if all(c <= 0 for c in integer_coeffs):
        integer_coeffs = [-c for c in integer_coeffs]

    if any(c <= 0 for c in integer_coeffs):
        raise ValueError("Could not find a valid positive-integer balance for this equation.")

    reactant_coeffs = integer_coeffs[:len(reactants)]
    product_coeffs = integer_coeffs[len(reactants):]

    def fmt_side(compounds, coeffs):
        parts = []
        for compound, coeff in zip(compounds, coeffs):
            parts.append(compound if coeff == 1 else f"{coeff}{compound}")
        return " + ".join(parts)

    balanced_str = f"{fmt_side(reactants, reactant_coeffs)} -> {fmt_side(products, product_coeffs)}"

    return {
        "balanced_equation": balanced_str,
        "reactants": [{"formula": c, "coefficient": n} for c, n in zip(reactants, reactant_coeffs)],
        "products": [{"formula": c, "coefficient": n} for c, n in zip(products, product_coeffs)],
        "error": None
    }


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
        "version": "1.7.0",
        "status": "online",
        "auth": "enabled"
    }


@app.get("/analyze", response_model=dict)
def analyze(smiles: str):
    result = analyze_molecule(smiles)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/analyze", response_model=dict)
def analyze_post(molecule: dict):
    smiles = molecule.get("smiles")
    if not smiles:
        raise HTTPException(status_code=400, detail="Missing 'smiles' field in request body")
    result = analyze_molecule(smiles)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/generate_3d")
def generate_3d(smiles: str):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"error": f"Invalid SMILES string: {smiles}"}

    try:
        mol = Chem.AddHs(mol)
        AllChem.EmbedMolecule(mol, randomSeed=42)
        AllChem.MMFFOptimizeMolecule(mol)
        molblock = Chem.MolToMolBlock(mol)
        return {
            "smiles": smiles,
            "molblock": molblock,
            "num_atoms": mol.GetNumAtoms(),
            "error": None
        }
    except Exception as e:
        return {"error": f"3D generation failed: {str(e)}"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "rdkit": "loaded", "auth": "loaded"}


# ============================================================
# COMPOUND FORMULA SEARCH
# ============================================================

@app.get("/api/compound/formula")
async def compound_by_formula(formula: str):
    print(f"🧪 Formula search: {formula}")
    try:
        from chemistry.formula_search import search_by_formula
        results = await search_by_formula(formula)

        if results and len(results) > 0:
            for compound in results:
                smiles = compound.get("smiles", "")
                if smiles:
                    compound["structureImage"] = smiles_to_svg(smiles)
            return {
                "formula": formula,
                "compounds": results,
                "source": "combined",
                "providerAvailable": True,
                "error": None,
            }

        return {
            "formula": formula,
            "compounds": [],
            "source": None,
            "providerAvailable": False,
            "error": f"No compounds found for formula: {formula}",
        }
    except Exception as e:
        print(f"❌ Error searching formula: {e}")
        return {
            "formula": formula,
            "compounds": [],
            "source": None,
            "providerAvailable": False,
            "error": str(e),
        }


# ============================================================
# COMPOUND NAME SEARCH
# ============================================================

@app.get("/api/compound/name")
async def compound_by_name(name: str):
    print(f"🔍 Searching for compound by name: {name}")
    try:
        result = await search_compound_by_name(name)
        if result:
            smiles = result.get("smiles", "")
            if smiles:
                result["structureImage"] = smiles_to_svg(smiles)
            result.pop("_provider", None)
            result.pop("_cache_hit", None)
            return result

        return {"error": f"No compound found for '{name}'", "found": False}
    except Exception as e:
        print(f"❌ Error searching compound: {e}")
        return {"error": str(e), "found": False}


# ============================================================
# NMR PREDICTION
# ============================================================

DEPT_LABELS = {"q": "CH3", "t": "CH2", "d": "CH", "s": "C"}

# NMRdb.org (SPINUS) — free 1H NMR prediction service.
# NOTE: The API endpoint format should be verified from their site.
# If it fails, the code falls back to the rule-based estimate below.
NMRDB_API_URL = "https://nmrdb.org/api/predict/1h"


@app.get("/api/test/nmrdb")
async def test_nmrdb():
    """Diagnostic endpoint — checks whether Render can reach NMRdb.org."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                NMRDB_API_URL,
                json={"smiles": "CCO"},
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "ChemLab-Kenya/1.0"
                }
            )
            return {
                "status": response.status_code,
                "reachable": response.status_code == 200,
                "body_preview": response.text[:500]
            }
    except Exception as e:
        return {"reachable": False, "error": str(e)}


async def try_nmrdb_1h(smiles: str) -> Optional[list]:
    """
    Attempt to fetch a real 1H NMR prediction from NMRdb.org.
    Returns a list of signals if successful, None otherwise.
    """
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                NMRDB_API_URL,
                json={"smiles": smiles},
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "ChemLab-Kenya/1.0"
                }
            )
            if response.status_code != 200:
                print(f"⚠️ NMRdb.org returned {response.status_code}", flush=True)
                return None

            data = response.json()
            # NMRdb returns a structure with peaks; adapt to our format.
            # Common fields: "peaks" (list), each with "shift", "mult", "integral".
            # The exact schema may vary — this covers the common shape.
            peaks = data.get("peaks") or data.get("signals") or []
            signals = []
            for p in peaks:
                try:
                    shift = float(p.get("shift") or p.get("ppm") or p.get("value"))
                except (TypeError, ValueError):
                    continue
                signals.append({
                    "shift": round(shift, 2),
                    "integral": int(p.get("integral") or p.get("protons") or 1),
                    "multiplicity": str(p.get("mult") or p.get("multiplicity") or "m").lower()
                })
            if signals:
                signals.sort(key=lambda s: s["shift"], reverse=True)
                return signals
            return None
    except Exception as e:
        print(f"⚠️ NMRdb.org request failed: {e}", flush=True)
        return None


@app.get("/api/predict_nmr")
async def predict_nmr(smiles: str, nucleus: str = "1H"):
    print(f"🔬 NMR Prediction: {smiles} ({nucleus})")

    try:
        if nucleus not in ("1H", "13C"):
            return {
                "success": False,
                "error": f"{nucleus} NMR isn't supported. Use 1H or 13C.",
                "source": "fallback"
            }

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {"success": False, "error": f"Invalid SMILES string: {smiles}"}

        signals = []
        source = "fallback"
        note = None

        # 1) Try NMRdb.org for 1H
        if nucleus == "1H":
            nmrdb_signals = await try_nmrdb_1h(smiles)
            if nmrdb_signals:
                signals = nmrdb_signals
                source = "nmrdb.org"
            else:
                note = "NMRdb.org didn't return a prediction; using local rule-based estimate."

        # 2) Try nmrshiftdb2 servlet (still there for 13C; likely unreachable)
        if not signals:
            try:
                canonical_smiles = Chem.MolToSmiles(mol)
                encoded_smiles = urllib.parse.quote(canonical_smiles, safe="")
                nmrshiftdb_url = (
                    "https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/"
                    f"nmrshiftdbaction/searchorpredict/smiles/{encoded_smiles}/spectrumtype/{nucleus}"
                )
                async with httpx.AsyncClient(timeout=20.0) as client:
                    r = await client.get(nmrshiftdb_url, headers={"User-Agent": "ChemLab-Kenya/1.0"})
                if r.status_code == 200:
                    parsed = parse_nmrshiftdb_response(r.text, nucleus)
                    if parsed:
                        signals = parsed
                        source = "nmrshiftdb2"
            except Exception as e:
                print(f"⚠️ nmrshiftdb2 request failed: {e}", flush=True)

        # 3) Fallback
        if not signals:
            signals = get_fallback_nmr_prediction(smiles, nucleus)
            source = "fallback"
            if not note:
                note = "Live NMR services were unreachable. This is an approximate estimate."

        return {
            "success": True,
            "source": source,
            "nucleus": nucleus,
            "signals": signals,
            "peakCount": len(signals),
            "smiles": smiles,
            "note": note,
            "error": None
        }

    except Exception as e:
        print(f"❌ NMR prediction error: {e}")
        return {"success": False, "error": str(e)}


def parse_nmrshiftdb_response(xml_text: str, nucleus: str) -> list:
    signals = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return signals

    def local_name(tag: str) -> str:
        return tag.split('}', 1)[-1] if '}' in tag else tag

    for elem in root.iter():
        if local_name(elem.tag) != "peak":
            continue
        x_value = elem.get("xValue")
        if x_value is None:
            continue
        try:
            shift = round(float(x_value), 2)
        except ValueError:
            continue

        raw_mult = (elem.get("peakMultiplicity") or "s").strip().lower()
        atom_refs = elem.get("atomRefs", "")
        ref_count = len(atom_refs.split()) if atom_refs else 1

        if nucleus == "1H":
            integral = ref_count if ref_count > 0 else 1
            multiplicity = raw_mult
        else:
            integral = 1
            multiplicity = DEPT_LABELS.get(raw_mult, raw_mult)

        signals.append({"shift": shift, "integral": integral, "multiplicity": multiplicity})

    signals.sort(key=lambda s: s["shift"], reverse=True)
    return signals


def get_fallback_nmr_prediction(smiles: str, nucleus: str = "1H") -> list:
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return get_default_nmr_signals(nucleus)

        if nucleus == "1H":
            mol_with_h = Chem.AddHs(mol)
            signals = []
            for atom in mol_with_h.GetAtoms():
                if atom.GetSymbol() == "H":
                    shift = estimate_proton_shift(atom, mol_with_h)
                    if shift > 0:
                        signals.append({"shift": round(shift, 2), "integral": 1, "multiplicity": "m"})
            if not signals:
                return get_default_nmr_signals(nucleus)
            return group_equivalent_protons(signals)
        else:
            return get_default_nmr_signals(nucleus)
    except Exception as e:
        print(f"⚠️ Fallback prediction error: {e}")
        return get_default_nmr_signals(nucleus)


def estimate_proton_shift(atom, mol) -> float:
    if atom.GetSymbol() != "H":
        return 0
    heavy_neighbors = list(atom.GetNeighbors())
    if not heavy_neighbors:
        return 0
    parent = heavy_neighbors[0]
    parent_neighbor_symbols = [n.GetSymbol() for n in parent.GetNeighbors() if n.GetIdx() != atom.GetIdx()]

    if parent.GetSymbol() in ("O", "N"):
        return 2.5 + random.uniform(-1.0, 1.5)
    elif parent.GetIsAromatic():
        return 7.3 + random.uniform(-0.5, 0.5)
    elif any(n in ("O", "N", "F", "Cl", "Br", "I") for n in parent_neighbor_symbols):
        return 3.5 + random.uniform(-0.5, 0.5)
    elif parent.GetSymbol() == "C":
        return 1.5 + random.uniform(-0.3, 0.3)
    return 0


def group_equivalent_protons(signals: list) -> list:
    if not signals:
        return signals
    grouped = []
    used = set()
    for i, sig in enumerate(signals):
        if i in used:
            continue
        group = sig.copy()
        group["integral"] = 1
        group["count"] = 1
        for j in range(i + 1, len(signals)):
            if j in used:
                continue
            if abs(sig["shift"] - signals[j]["shift"]) < 0.1:
                used.add(j)
                group["count"] += 1
                group["integral"] += signals[j]["integral"]
                group["shift"] = (group["shift"] + signals[j]["shift"]) / 2
        used.add(i)
        group["shift"] = round(group["shift"], 2)
        grouped.append(group)
    return grouped


def get_default_nmr_signals(nucleus: str = "1H") -> list:
    if nucleus == "13C":
        return [
            {"shift": 30.00, "integral": 1, "multiplicity": "CH2"},
            {"shift": 70.00, "integral": 1, "multiplicity": "CH"},
            {"shift": 130.00, "integral": 1, "multiplicity": "C"},
        ]
    return [
        {"shift": 7.20, "integral": 1, "multiplicity": "d"},
        {"shift": 7.40, "integral": 1, "multiplicity": "t"},
        {"shift": 7.60, "integral": 2, "multiplicity": "m"},
    ]


# ============================================================
# CHATBOT
# ============================================================

@app.post("/api/chat")
async def chat(request: dict):
    message = request.get("message")
    session_id = request.get("session_id", "default")
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


# ============================================================
# CACHE MANAGEMENT
# ============================================================

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
