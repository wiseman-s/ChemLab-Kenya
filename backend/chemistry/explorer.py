# backend/chemistry/explorer.py
"""
Compound explorer — routes queries to the right search mode and returns
a normalized compound record. Designed to degrade gracefully: if one
provider is down, other providers still serve the result.
"""

from typing import Dict, Optional, List
import re

from .pubchem import (
    search_compound_by_name,
    search_by_formula,
    _search_local,
)


class NotFound(Exception):
    def __init__(self, message: str, suggestions: Optional[List[str]] = None):
        super().__init__(message)
        self.suggestions = suggestions or []


class Unavailable(Exception):
    """Raised only when every provider is genuinely unreachable."""
    pass


# ------------------------------------------------------------
# Heuristic mode detection
# ------------------------------------------------------------

_CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")
_CID_RE = re.compile(r"^\d{1,9}$")
_FORMULA_RE = re.compile(r"^([A-Z][a-z]?\d*)+$")
_SMILES_CHARS_RE = re.compile(r"^[A-Za-z0-9@+\-\[\]\(\)=#$:/\\.%*{}~,]+$")


def _detect_mode(query: str) -> str:
    q = query.strip()
    if not q:
        return "name"

    if _CAS_RE.match(q):
        return "name"

    # SMILES is the trickiest — only classify as SMILES if it has SMILES-only chars
    # AND doesn't look like a formula (formula has no lowercase except 2-letter elements)
    looks_like_smiles = (
        any(c in q for c in "=#[]()@+\\/")
        or ("c" in q and any(c.isupper() for c in q))
        or q.startswith(("C", "c", "O", "N", "S", "P", "F", "Cl", "Br", "I"))
    )

    if _FORMULA_RE.match(q) and not looks_like_smiles:
        # A formula like C6H5NO2 has no lowercase-bond indicators
        # But C6H5NO2 is ambiguous with some SMILES — prefer formula when it matches
        if re.fullmatch(r"([A-Z][a-z]?\d*)+", q):
            return "formula"

    if _CID_RE.match(q) and len(q) <= 7:
        return "cid"

    if looks_like_smiles and not " " in q:
        return "smiles"

    return "name"


# ------------------------------------------------------------
# Normalize compound dicts
# ------------------------------------------------------------

def _normalize(compound: Dict, query: str) -> Dict:
    """Ensure every expected field exists, even if empty."""
    out = {
        "cid": compound.get("cid", 0),
        "title": compound.get("title") or query,
        "molecularFormula": compound.get("molecularFormula") or "Not available",
        "molecularWeight": compound.get("molecularWeight") or 0,
        "iupacName": compound.get("iupacName") or "Not available",
        "smiles": compound.get("smiles") or "",
        "inchi": compound.get("inchi") or "",
        "inchiKey": compound.get("inchiKey") or "",
        "exactMass": compound.get("exactMass"),
        "xlogp": compound.get("xlogp"),
        "tpsa": compound.get("tpsa"),
        "hbd": compound.get("hbd"),
        "hba": compound.get("hba"),
        "rotatableBonds": compound.get("rotatableBonds"),
        "charge": compound.get("charge"),
        "complexity": compound.get("complexity"),
        "source": compound.get("source") or "Unknown",
        "sourceId": compound.get("sourceId") or "",
        "_partial": compound.get("_partial", False),
        "_cache_hit": compound.get("_cache_hit", False),
    }
    return out


# ------------------------------------------------------------
# Main entry point
# ------------------------------------------------------------

async def explore(query: str, mode: str = "auto") -> Dict:
    q = (query or "").strip()
    if not q:
        raise NotFound("Please enter something to search for.")

    effective_mode = _detect_mode(q) if mode == "auto" else mode

    # ---------- SMILES mode: just echo it back as a "compound" ----------
    if effective_mode == "smiles":
        try:
            from rdkit import Chem
            mol = Chem.MolFromSmiles(q)
            if mol is None:
                raise NotFound(f"That SMILES string doesn't look valid. Double-check it and try again.")
            canonical = Chem.MolToSmiles(mol)

            from rdkit.Chem.Descriptors import ExactMolWt, MolLogP, TPSA, NumHDonors, NumHAcceptors, NumRotatableBonds
            from rdkit.Chem.rdMolDescriptors import CalcMolFormula
            from rdkit.Chem import rdmolops

            return _normalize({
                "cid": 0,
                "title": "Custom structure",
                "molecularFormula": CalcMolFormula(mol),
                "molecularWeight": ExactMolWt(mol),
                "iupacName": "Custom SMILES input",
                "smiles": canonical,
                "inchi": "",
                "source": "SMILES",
                "sourceId": "",
                "exactMass": round(ExactMolWt(mol), 4),
                "xlogp": round(MolLogP(mol), 2),
                "tpsa": round(TPSA(mol), 2),
                "hbd": NumHDonors(mol),
                "hba": NumHAcceptors(mol),
                "rotatableBonds": NumRotatableBonds(mol),
                "charge": rdmolops.GetFormalCharge(mol),
                "complexity": round(rdMolDescriptors.CalcNumHeavyAtoms(mol) * 1.5, 1),
            }, q)
        except ImportError:
            raise NotFound("SMILES parsing requires RDKit on the server.")

    # ---------- CID mode: fetch by PubChem CID directly ----------
    if effective_mode == "cid":
        try:
            cid = int(q)
        except ValueError:
            raise NotFound(f"'{q}' doesn't look like a valid PubChem CID.")

        from .pubchem import _get_json, PUBCHEM_BASE
        props = ",".join([
            "Title", "MolecularFormula", "MolecularWeight", "IUPACName",
            "SMILES", "ConnectivitySMILES", "CanonicalSMILES", "IsomericSMILES",
        ])
        data = await _get_json(
            f"{PUBCHEM_BASE}/compound/cid/{cid}/property/{props}/JSON",
            provider="pubchem",
        )
        if not data:
            # PubChem failed — but at least tell the user what happened
            raise Unavailable("PubChem")

        items = data.get("PropertyTable", {}).get("Properties", [])
        if not items:
            raise NotFound(f"No compound found with PubChem CID {cid}.")

        item = items[0]
        return _normalize({
            "cid": cid,
            "title": item.get("Title") or f"CID {cid}",
            "molecularFormula": item.get("MolecularFormula") or "Not available",
            "molecularWeight": float(item.get("MolecularWeight", 0) or 0),
            "iupacName": item.get("IUPACName") or "Not available",
            "smiles": (item.get("SMILES") or item.get("IsomericSMILES")
                       or item.get("ConnectivitySMILES") or item.get("CanonicalSMILES") or ""),
            "source": "PubChem",
            "sourceId": str(cid),
        }, q)

    # ---------- Formula mode ----------
    if effective_mode == "formula":
        results = await search_by_formula(q)
        if results is None:
            # Total failure — but try a name search as a hail-mary
            fallback = await search_compound_by_name(q)
            if fallback:
                return _normalize(fallback, q)
            raise Unavailable("PubChem")

        if not results:
            raise NotFound(
                f"No compounds found with formula '{q}'. "
                "Check the formula is correct (case-sensitive, e.g. C6H6)."
            )

        return _normalize(results[0], q)

    # ---------- Name / CAS mode (default) ----------
    result = await search_compound_by_name(q)

    if result:
        return _normalize(result, q)

    # Nothing found — but did any provider actually fail, or was it a clean no-match?
    # We only raise Unavailable if there's evidence providers were down.
    from .pubchem import _provider_failures, _provider_disabled_until
    any_provider_down = bool(_provider_failures) or bool(_provider_disabled_until)

    if any_provider_down:
        raise Unavailable("compound databases")

    raise NotFound(
        f"No compound found for '{q}'. Try a different name, or paste a SMILES string directly."
    )
