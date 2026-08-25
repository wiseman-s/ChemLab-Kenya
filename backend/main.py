import re
import random
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
from chemistry.formula_search import search_by_formula, clear_formula_cache, get_formula_cache_stats

app = FastAPI(
    title="ChemLab Kenya API",
    description="Chemistry API for Kenyan Universities",
    version="1.2.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    """Analyze a molecule from SMILES string using RDKit"""
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

        violations = sum([
            mw > 500,
            logp > 5,
            h_donors > 5,
            h_acceptors > 10,
        ])

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
    """Parse a formula like 'Ca(OH)2' or 'Fe2(SO4)3' into {element: count}."""
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
        result = balance_equation(equation)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
def root():
    return {
        "message": "🧪 ChemLab Kenya API is running!",
        "version": "1.2.0",
        "status": "online"
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
    return {"status": "healthy", "rdkit": "loaded"}


# ============================================================
# COMPOUND FORMULA SEARCH ENDPOINT (Uses formula_search.py)
# ============================================================

@app.get("/api/compound/formula")
async def compound_by_formula(formula: str):
    """
    Search for compounds by chemical formula.
    Uses formula_search.py with multiple providers:
    - Local database
    - Wikidata SPARQL
    - Wikipedia
    - CACTUS
    - PubChem (last resort)
    """
    print(f"🧪 Formula search: {formula}")

    try:
        results = await search_by_formula(formula)

        if results and len(results) > 0:
            # Generate structure images for compounds with SMILES
            for compound in results:
                smiles = compound.get("smiles", "")
                if smiles:
                    compound["structureImage"] = smiles_to_svg(smiles)

                    try:
                        mol = Chem.MolFromSmiles(smiles)
                        if mol is not None:
                            compound["smiles"] = Chem.MolToSmiles(mol)
                            try:
                                compound["inchi"] = Chem.MolToInchi(mol)
                            except Exception:
                                pass
                    except Exception as exc:
                        print(f"⚠️ RDKit validation failed: {exc}")

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
# COMPOUND NAME SEARCH ENDPOINT (Uses pubchem.py)
# ============================================================

@app.get("/api/compound/name")
async def compound_by_name(name: str):
    """
    Search for a compound by name.
    Uses pubchem.py with multiple providers:
    - Cache
    - Local database
    - CACTUS
    - Wikipedia
    - PubChem
    - ChEMBL
    - ChemSpider (if API key configured)
    """
    print(f"🔍 Searching for compound by name: {name}")

    try:
        result = await search_compound_by_name(name)

        if result:
            # Generate structure image using RDKit
            smiles = result.get("smiles", "")
            if smiles:
                result["structureImage"] = smiles_to_svg(smiles)

            # Clean the response - remove internal fields
            result.pop("_provider", None)
            result.pop("_cache_hit", None)

            return result

        return {
            "error": f"No compound found for '{name}'",
            "found": False
        }

    except Exception as e:
        print(f"❌ Error searching compound: {e}")
        return {
            "error": str(e),
            "found": False
        }


# ============================================================
# CACHE MANAGEMENT ENDPOINTS
# ============================================================

@app.get("/api/compound/cache/stats")
def cache_stats():
    """Get cache statistics."""
    pubchem_stats = get_cache_stats()
    formula_stats = get_formula_cache_stats()

    return {
        "pubchem": pubchem_stats,
        "formula": formula_stats,
        "total": {
            "memory_count": pubchem_stats.get("memory_cache_count", 0) + formula_stats.get("memory_cache_count", 0),
            "file_count": pubchem_stats.get("file_cache_count", 0) + formula_stats.get("file_cache_count", 0),
            "size_kb": pubchem_stats.get("size_kb", 0) + formula_stats.get("size_kb", 0)
        }
    }


@app.post("/api/compound/cache/clear")
def clear_cache_route():
    """Clear all caches."""
    clear_cache()
    clear_formula_cache()
    return {"status": "All caches cleared"}


# ============================================================
# NMR PREDICTION ENDPOINT (Using nmrdb.org)
# ============================================================

@app.get("/api/predict_nmr")
async def predict_nmr(smiles: str, nucleus: str = "1H"):
    """
    Predict NMR spectrum using nmrdb.org's prediction service, with a
    local RDKit-based fallback if that service is unreachable or its
    response can't be parsed.

    nmrdb.org exposes a plain (non-JS-rendered) service endpoint at
    service.php?name=nmr-1h-prediction&smiles=... which is what this
    calls, rather than scraping the interactive JS predictor page.
    """
    print(f"🔬 NMR Prediction: {smiles} ({nucleus})")

    try:
        if nucleus != "1H":
            return {
                "success": False,
                "error": f"{nucleus} NMR not supported yet. Only 1H is available."
            }

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {"success": False, "error": f"Invalid SMILES string: {smiles}"}

        canonical_smiles = Chem.MolToSmiles(mol)

        nmrdb_url = "https://www.nmrdb.org/service.php"
        params = {"name": "nmr-1h-prediction", "smiles": canonical_smiles}
        headers = {"User-Agent": "ChemLab-Kenya/1.0"}

        response = None
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(nmrdb_url, params=params, headers=headers)
        except httpx.RequestError as exc:
            print(f"⚠️ nmrdb.org request failed: {exc}")

        signals = []
        source = "fallback"

        if response is not None and response.status_code == 200:
            signals = parse_nmrdb_service_response(response.text)
            if signals:
                source = "nmrdb.org"
            else:
                print("⚠️ nmrdb.org returned a response but no signals could be parsed from it")

        if not signals:
            signals = get_fallback_prediction(smiles, nucleus)
            source = "fallback"

        return {
            "success": True,
            "source": source,
            "nucleus": nucleus,
            "signals": signals,
            "peakCount": len(signals),
            "smiles": smiles,
            "error": None
        }

    except Exception as e:
        print(f"❌ NMR prediction error: {e}")
        return {"success": False, "error": str(e)}


def parse_nmrdb_service_response(body: str) -> list:
    """Parse NMR signals out of nmrdb.org's service.php response.

    The service has been reported to return either JSON or a delimited
    plain-text peak list depending on version, so we try a few shapes
    rather than assuming one exact format.
    """
    signals = []
    body = body.strip()
    if not body:
        return signals

    # Attempt 1: JSON body, various plausible shapes
    try:
        data = json.loads(body)
        candidates = data if isinstance(data, list) else data.get("signals") or data.get("peaks") or []
        for item in candidates:
            try:
                signals.append({
                    "shift": round(float(item.get("shift") or item.get("delta") or item.get("ppm")), 2),
                    "integral": int(float(item.get("integral", item.get("nbAtoms", 1)))),
                    "multiplicity": str(item.get("multiplicity") or item.get("mult") or "m")
                })
            except (TypeError, ValueError):
                continue
        if signals:
            return signals
    except (json.JSONDecodeError, AttributeError):
        pass

    # Attempt 2: loose "shift ... integral ... multiplicity" pattern, in
    # case it's an HTML/text fragment rather than clean JSON
    pattern = r'shift["\s:]*([\d.]+).*?integral["\s:]*([\d.]+).*?multiplicity["\s:]*"?([a-zA-Z]+)"?'
    matches = re.findall(pattern, body, re.DOTALL | re.IGNORECASE)
    for match in matches:
        try:
            signals.append({
                "shift": round(float(match[0]), 2),
                "integral": int(float(match[1])),
                "multiplicity": match[2]
            })
        except (TypeError, ValueError):
            continue
    if signals:
        return signals

    # Attempt 3: simple line-based "ppm,integral,mult" CSV-ish output
    for line in body.splitlines():
        parts = [p.strip() for p in re.split(r'[,\t]', line) if p.strip()]
        if len(parts) >= 2:
            try:
                shift = float(parts[0])
                integral = int(float(parts[1])) if len(parts) > 1 else 1
                mult = parts[2] if len(parts) > 2 else "m"
                signals.append({"shift": round(shift, 2), "integral": integral, "multiplicity": mult})
            except ValueError:
                continue

    return signals


def get_fallback_prediction(smiles: str, nucleus: str = "1H") -> list:
    """Get a fallback NMR prediction based on molecule structure.

    This is a crude rule-based estimator (aromatic vs. aliphatic vs.
    heteroatom-adjacent), not a real quantum or empirical NMR model.
    Good enough for a placeholder, not for anything a student should
    treat as ground truth.
    """
    signals = []

    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return signals

        mol_with_h = Chem.AddHs(mol)

        for atom in mol_with_h.GetAtoms():
            if nucleus == "1H" and atom.GetSymbol() == "H":
                shift = estimate_proton_shift(atom, mol_with_h)
                if shift > 0:
                    signals.append({
                        "shift": round(shift, 2),
                        "integral": 1,
                        "multiplicity": "m"
                    })
            elif nucleus == "13C" and atom.GetSymbol() == "C":
                shift = estimate_carbon_shift(atom, mol_with_h)
                if shift > 0:
                    signals.append({
                        "shift": round(shift, 2),
                        "integral": 1,
                        "multiplicity": "s"
                    })

        # Group equivalent protons
        if nucleus == "1H":
            signals = group_equivalent_protons(signals)

    except Exception as e:
        print(f"⚠️ Fallback prediction error: {e}")

    return signals


def estimate_proton_shift(atom, mol) -> float:
    """Estimate 1H chemical shift based on environment.

    `atom` is expected to be a hydrogen; we look at what it's bonded to.
    """
    if atom.GetSymbol() != "H":
        return 0

    heavy_neighbors = [n for n in atom.GetNeighbors()]
    if not heavy_neighbors:
        return 0

    parent = heavy_neighbors[0]
    parent_neighbor_symbols = [n.GetSymbol() for n in parent.GetNeighbors() if n.GetIdx() != atom.GetIdx()]

    if parent.GetSymbol() in ("O", "N"):
        # Exchangeable proton (OH, NH)
        return 2.5 + random.uniform(-1.0, 1.5)
    elif parent.GetIsAromatic():
        return 7.3 + random.uniform(-0.5, 0.5)
    elif any(n in ("O", "N", "F", "Cl", "Br", "I") for n in parent_neighbor_symbols):
        return 3.5 + random.uniform(-0.5, 0.5)
    elif parent.GetSymbol() == "C":
        return 1.5 + random.uniform(-0.3, 0.3)
    else:
        return 0


def estimate_carbon_shift(atom, mol) -> float:
    """Estimate 13C chemical shift based on environment."""
    if atom.GetIsAromatic():
        return 130 + random.uniform(-10, 10)

    # Check if carbonyl
    for neighbor in atom.GetNeighbors():
        if neighbor.GetSymbol() == "O":
            return 170 + random.uniform(-10, 10)

    return 30 + random.uniform(-10, 10)


def group_equivalent_protons(signals: list) -> list:
    """Group equivalent proton signals."""
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
