# backend/chemistry/pubchem.py

import asyncio
import hashlib
import json
import time
import os
import ssl
import re
from typing import Any, Optional, List, Dict
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from datetime import datetime, timedelta

# ============================================================
# SSL
# ============================================================
try:
    import certifi
    ssl_context = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    raise RuntimeError("certifi is required. Run: pip install certifi")

# ============================================================
# CONFIGURATION
# ============================================================

PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
CHEMBL_BASE = "https://www.ebi.ac.uk/chembl/api/data"
CACTUS_BASE = "https://cactus.nci.nih.gov/chemical/structure"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"

RSC_API_KEY = os.environ.get("RSC_API_KEY", "")
RSC_API_BASE = "https://api.rsc.org/compounds/v1"

REQUEST_TIMEOUT = 6.0
MAX_RETRIES = 1
BACKOFF_BASE_SECONDS = 0.75
CACHE_DURATION_HOURS = 72  # longer cache: classrooms repeat the same searches

# ============================================================
# NAME ALIASES (expanded for school curriculum)
# ============================================================

NAME_ALIASES: Dict[str, List[str]] = {
    # ---- ELEMENTS ----
    "hydrogen": ["hydrogen"], "oxygen": ["oxygen"], "nitrogen": ["nitrogen"],
    "carbon": ["carbon"], "sulfur": ["sulfur", "sulphur"], "phosphorus": ["phosphorus"],
    "chlorine": ["chlorine"], "iodine": ["iodine"], "bromine": ["bromine"],
    "sodium": ["sodium"], "potassium": ["potassium"], "calcium": ["calcium"],
    "magnesium": ["magnesium"], "iron": ["iron"], "copper": ["copper"],
    "zinc": ["zinc"], "aluminium": ["aluminium", "aluminum"],

    # ---- INORGANIC COMPOUNDS ----
    "sodium hydroxide": ["sodium hydroxide", "NaOH", "caustic soda"],
    "caustic soda": ["sodium hydroxide", "caustic soda"],
    "lye": ["sodium hydroxide", "lye"],
    "potassium hydroxide": ["potassium hydroxide", "caustic potash"],
    "calcium hydroxide": ["calcium hydroxide", "slaked lime", "limewater"],
    "slaked lime": ["calcium hydroxide", "slaked lime"],
    "magnesium hydroxide": ["magnesium hydroxide", "milk of magnesia"],
    "aluminium hydroxide": ["aluminium hydroxide", "aluminum hydroxide"],
    "ammonium hydroxide": ["ammonium hydroxide", "ammonia solution"],

    "hydrochloric acid": ["hydrochloric acid", "hydrogen chloride", "HCl"],
    "muriatic acid": ["hydrochloric acid", "muriatic acid"],
    "sulfuric acid": ["sulfuric acid", "sulphuric acid", "oil of vitriol"],
    "nitric acid": ["nitric acid", "aqua fortis"],
    "phosphoric acid": ["phosphoric acid"],
    "carbonic acid": ["carbonic acid"],
    "citric acid": ["citric acid"],
    "acetic acid": ["acetic acid", "ethanoic acid"],
    "ethanoic acid": ["ethanoic acid", "acetic acid"],
    "formic acid": ["formic acid", "methanoic acid"],
    "lactic acid": ["lactic acid"],
    "oxalic acid": ["oxalic acid", "ethanedioic acid"],
    "benzoic acid": ["benzoic acid"],

    "sodium chloride": ["sodium chloride", "table salt", "NaCl"],
    "table salt": ["sodium chloride", "table salt"],
    "sodium carbonate": ["sodium carbonate", "washing soda", "soda ash"],
    "washing soda": ["sodium carbonate", "washing soda"],
    "sodium bicarbonate": ["sodium bicarbonate", "sodium hydrogen carbonate", "baking soda"],
    "baking soda": ["sodium bicarbonate", "baking soda"],
    "sodium hydrogen carbonate": ["sodium bicarbonate", "sodium hydrogen carbonate"],
    "potassium bicarbonate": ["potassium bicarbonate", "potassium hydrogen carbonate", "KHCO3"],
    "potassium hydrogen carbonate": ["potassium bicarbonate", "potassium hydrogen carbonate"],
    "calcium carbonate": ["calcium carbonate", "limestone", "chalk", "marble"],
    "potassium carbonate": ["potassium carbonate", "potash"],
    "sodium sulfate": ["sodium sulfate", "Glauber's salt"],
    "magnesium sulfate": ["magnesium sulfate", "Epsom salt"],
    "copper sulfate": ["copper sulfate", "copper sulphate", "cupric sulfate"],
    "iron sulfate": ["iron sulfate", "ferrous sulfate"],
    "potassium nitrate": ["potassium nitrate", "saltpeter"],
    "sodium nitrate": ["sodium nitrate"],
    "ammonium nitrate": ["ammonium nitrate"],
    "potassium permanganate": ["potassium permanganate", "Condy's crystals"],
    "potassium dichromate": ["potassium dichromate"],
    "sodium thiosulfate": ["sodium thiosulfate", "hypo"],

    "calcium oxide": ["calcium oxide", "quicklime", "lime"],
    "quicklime": ["calcium oxide", "quicklime"],
    "magnesium oxide": ["magnesium oxide", "magnesia"],
    "aluminium oxide": ["aluminium oxide", "alumina"],
    "silicon dioxide": ["silicon dioxide", "silica"],
    "carbon dioxide": ["carbon dioxide", "CO2"],
    "carbon monoxide": ["carbon monoxide"],
    "sulfur dioxide": ["sulfur dioxide", "sulphur dioxide"],
    "sulfur trioxide": ["sulfur trioxide"],
    "nitrogen dioxide": ["nitrogen dioxide"],
    "nitrous oxide": ["nitrous oxide", "laughing gas"],

    # ---- ORGANIC COMPOUNDS ----
    "methanol": ["methanol", "methyl alcohol", "wood alcohol"],
    "methyl alcohol": ["methanol", "methyl alcohol"],
    "ethanol": ["ethanol", "ethyl alcohol", "alcohol"],
    "ethyl alcohol": ["ethanol", "ethyl alcohol"],
    "isopropanol": ["isopropanol", "2-propanol", "isopropyl alcohol"],
    "isopropyl alcohol": ["isopropanol", "2-propanol", "isopropyl alcohol"],
    "ethylene glycol": ["ethylene glycol", "ethan-1,2-diol"],
    "glycerol": ["glycerol", "glycerine"],
    "phenol": ["phenol", "carbolic acid"],

    "methane": ["methane"], "ethane": ["ethane"], "propane": ["propane"],
    "butane": ["butane"], "pentane": ["pentane"], "hexane": ["hexane"],
    "heptane": ["heptane"], "octane": ["octane"],
    "ethene": ["ethene", "ethylene"], "ethylene": ["ethene", "ethylene"],
    "ethyne": ["ethyne", "acetylene"], "acetylene": ["ethyne", "acetylene"],
    "benzene": ["benzene"], "toluene": ["toluene", "methylbenzene"],

    "acetone": ["acetone", "propan-2-one", "2-propanone"],
    "formaldehyde": ["formaldehyde", "methanal"],
    "acetaldehyde": ["acetaldehyde", "ethanal"],
    "ethyl acetate": ["ethyl acetate", "ethyl ethanoate"],

    "glucose": ["glucose", "dextrose", "grape sugar"],
    "fructose": ["fructose", "fruit sugar"],
    "sucrose": ["sucrose", "table sugar", "cane sugar"],
    "lactose": ["lactose", "milk sugar"],
    "starch": ["starch", "amylum"],

    "aspirin": ["aspirin", "acetylsalicylic acid"],
    "paracetamol": ["paracetamol", "acetaminophen"],
    "ibuprofen": ["ibuprofen"],

    "ammonia": ["ammonia"],
    "hydrogen peroxide": ["hydrogen peroxide", "H2O2"],
    "water": ["water", "H2O"],
}

# ============================================================
# RATE LIMITING (per-provider, aggressive for classroom bursts)
# ============================================================

RATE_LIMITS: Dict[str, float] = {
    "cactus": 1.0,
    "pubchem": 0.25,      # PubChem allows 5 req/sec — we stay under
    "chembl": 0.5,
    "wikipedia": 0.1,
    "chemspider": 0.5,
}

_last_request_time: Dict[str, float] = {}
_rate_locks: Dict[str, asyncio.Lock] = {}


async def _wait_for_rate(provider: str):
    min_interval = RATE_LIMITS.get(provider, 0.0)
    if min_interval <= 0:
        return
    lock = _rate_locks.setdefault(provider, asyncio.Lock())
    async with lock:
        wait_time = min_interval - (time.monotonic() - _last_request_time.get(provider, 0.0))
        if wait_time > 0:
            await asyncio.sleep(wait_time)
        _last_request_time[provider] = time.monotonic()


# ============================================================
# FILE-BASED CACHING (long-lived, classroom-friendly)
# ============================================================

CACHE_DIR = "cache"
os.makedirs(CACHE_DIR, exist_ok=True)


def _get_cache_key(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")[:60]
    digest = hashlib.sha1(name.encode("utf-8")).hexdigest()[:8]
    return f"{slug}_{digest}"


def _get_cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.json")


def _cache_get(name: str) -> Optional[Any]:
    path = _get_cache_path(_get_cache_key(name))
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        cached_time = datetime.fromisoformat(data.get("_cached_at", "2000-01-01T00:00:00"))
        if datetime.now() - cached_time > timedelta(hours=CACHE_DURATION_HOURS):
            return None
        return data.get("result")
    except Exception:
        return None


def _cache_set(name: str, result: Any):
    path = _get_cache_path(_get_cache_key(name))
    data = {"_cached_at": datetime.now().isoformat(), "result": result}
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


# ============================================================
# HTTP REQUEST
# ============================================================

def _blocking_get(url: str, headers: dict = None, timeout: float = REQUEST_TIMEOUT) -> tuple:
    request = Request(
        url,
        headers=headers or {"User-Agent": "ChemLab-Kenya/1.0 (educational; contact@chemlab.co.ke)"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=timeout, context=ssl_context) as response:
            return response.status, response.read().decode("utf-8")
    except HTTPError as error:
        try:
            return error.code, error.read().decode("utf-8")
        except Exception:
            return error.code, ""
    except URLError as error:
        print(f"Network error: {error}")
        return 0, ""
    except Exception as error:
        print(f"Request error: {error}")
        return 0, ""


async def _get_json(
    url: str,
    headers: dict = None,
    provider: Optional[str] = None,
    timeout: float = REQUEST_TIMEOUT,
) -> Optional[dict]:
    """
    Returns:
      - parsed JSON on success
      - {} on "not found / bad input" (400, 404)
      - {} on "service unavailable" (502, 503, 504) — caller should try next provider
      - None on real failure (network error, 429 after retries, etc.)
    """
    for attempt in range(MAX_RETRIES + 1):
        if provider:
            await _wait_for_rate(provider)

        print(f"Request (attempt {attempt + 1}/{MAX_RETRIES + 1}) -> {url[:90]}")
        status, body = await asyncio.to_thread(_blocking_get, url, headers, timeout)

        if 200 <= status < 300:
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                print("Invalid JSON response")
                return {}

        if status in {400, 404}:
            return {}

        # 502/503/504 = service down. Don't retry-hammer it. Just move on.
        if status in {502, 503, 504}:
            print(f"Provider unavailable ({status}) — moving on")
            return {}

        if status == 0 or status == 429:
            print(f"Temporary error: {status}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(BACKOFF_BASE_SECONDS * (2 ** attempt))
                continue
            return None

        print(f"HTTP error: {status}")
        return None

    return None


async def _get_text(
    url: str,
    headers: dict = None,
    provider: Optional[str] = None,
    timeout: float = REQUEST_TIMEOUT,
) -> tuple:
    if provider:
        await _wait_for_rate(provider)
    return await asyncio.to_thread(_blocking_get, url, headers, timeout)


# ============================================================
# CIRCUIT BREAKER
# ============================================================

_provider_failures: Dict[str, int] = {}
_provider_disabled_until: Dict[str, float] = {}
CIRCUIT_FAILURE_THRESHOLD = 5          # was 3 — classrooms hit transient errors often
CIRCUIT_COOLDOWN_DEFAULT = 30          # 30s instead of 60s — recover faster
CIRCUIT_COOLDOWN = {"pubchem": 120}    # 2min instead of 5min


def _is_provider_available(provider: str) -> bool:
    if provider not in _provider_disabled_until:
        return True
    return time.time() > _provider_disabled_until[provider]


def _record_failure(provider: str):
    _provider_failures[provider] = _provider_failures.get(provider, 0) + 1
    if _provider_failures[provider] >= CIRCUIT_FAILURE_THRESHOLD:
        cooldown = CIRCUIT_COOLDOWN.get(provider, CIRCUIT_COOLDOWN_DEFAULT)
        _provider_disabled_until[provider] = time.time() + cooldown
        print(f"Circuit opened for {provider} ({cooldown}s cooldown)")


def _record_success(provider: str):
    _provider_failures[provider] = 0
    _provider_disabled_until.pop(provider, None)


# ============================================================
# LOCAL DATABASE (expanded for school use)
# ============================================================

LOCAL_COMPOUNDS: Dict[str, Dict] = {
    # ---- WATER & BASIC ----
    "water": {"cid": 962, "title": "Water", "molecularFormula": "H2O", "molecularWeight": 18.015,
              "iupacName": "oxidane", "smiles": "O", "inchi": "InChI=1S/H2O/h1H2", "source": "local"},
    "hydrogen peroxide": {"cid": 784, "title": "Hydrogen Peroxide", "molecularFormula": "H2O2",
                          "molecularWeight": 34.014, "iupacName": "hydrogen peroxide", "smiles": "OO",
                          "inchi": "InChI=1S/H2O2/c1-2/h1-2H", "source": "local"},

    # ---- ALCOHOLS ----
    "methanol": {"cid": 887, "title": "Methanol", "molecularFormula": "CH4O", "molecularWeight": 32.042,
                 "iupacName": "methanol", "smiles": "CO", "inchi": "InChI=1S/CH4O/c1-2/h2H,1H3", "source": "local"},
    "ethanol": {"cid": 702, "title": "Ethanol", "molecularFormula": "C2H6O", "molecularWeight": 46.068,
                "iupacName": "ethanol", "smiles": "CCO", "inchi": "InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3", "source": "local"},
    "isopropanol": {"cid": 3776, "title": "Isopropanol", "molecularFormula": "C3H8O", "molecularWeight": 60.096,
                    "iupacName": "propan-2-ol", "smiles": "CC(C)O", "inchi": "InChI=1S/C3H8O/c1-3(2)4/h3-4H,1-2H3", "source": "local"},
    "glycerol": {"cid": 753, "title": "Glycerol", "molecularFormula": "C3H8O3", "molecularWeight": 92.094,
                 "iupacName": "propane-1,2,3-triol", "smiles": "OCC(O)CO", "inchi": "InChI=1S/C3H8O3/c4-1-3(6)2-5/h3-6H,1-2H2", "source": "local"},
    "phenol": {"cid": 996, "title": "Phenol", "molecularFormula": "C6H6O", "molecularWeight": 94.111,
               "iupacName": "phenol", "smiles": "Oc1ccccc1", "inchi": "InChI=1S/C6H6O/c7-6-4-2-1-3-5-6/h1-5,7H", "source": "local"},
    "ethylene glycol": {"cid": 174, "title": "Ethylene Glycol", "molecularFormula": "C2H6O2", "molecularWeight": 62.068,
                        "iupacName": "ethane-1,2-diol", "smiles": "OCCO", "inchi": "InChI=1S/C2H6O2/c3-1-2-4/h3-4H,1-2H2", "source": "local"},

    # ---- HYDROCARBONS ----
    "methane": {"cid": 297, "title": "Methane", "molecularFormula": "CH4", "molecularWeight": 16.043,
                "iupacName": "methane", "smiles": "C", "inchi": "InChI=1S/CH4/h1H4", "source": "local"},
    "ethane": {"cid": 6324, "title": "Ethane", "molecularFormula": "C2H6", "molecularWeight": 30.07,
               "iupacName": "ethane", "smiles": "CC", "inchi": "InChI=1S/C2H6/c1-2/h1-2H3", "source": "local"},
    "propane": {"cid": 6334, "title": "Propane", "molecularFormula": "C3H8", "molecularWeight": 44.097,
                "iupacName": "propane", "smiles": "CCC", "inchi": "InChI=1S/C3H8/c1-3-2/h3H2,1-2H3", "source": "local"},
    "butane": {"cid": 7843, "title": "Butane", "molecularFormula": "C4H10", "molecularWeight": 58.124,
               "iupacName": "butane", "smiles": "CCCC", "inchi": "InChI=1S/C4H10/c1-3-4-2/h3-4H2,1-2H3", "source": "local"},
    "pentane": {"cid": 8003, "title": "Pentane", "molecularFormula": "C5H12", "molecularWeight": 72.151,
                "iupacName": "pentane", "smiles": "CCCCC", "inchi": "InChI=1S/C5H12/c1-3-5-4-2/h3-5H2,1-2H3", "source": "local"},
    "hexane": {"cid": 8058, "title": "Hexane", "molecularFormula": "C6H14", "molecularWeight": 86.178,
               "iupacName": "hexane", "smiles": "CCCCCC", "inchi": "InChI=1S/C6H14/c1-3-5-6-4-2/h3-6H2,1-2H3", "source": "local"},
    "heptane": {"cid": 8900, "title": "Heptane", "molecularFormula": "C7H16", "molecularWeight": 100.205,
                "iupacName": "heptane", "smiles": "CCCCCCC", "inchi": "InChI=1S/C7H16/c1-3-5-7-6-4-2/h3-7H2,1-2H3", "source": "local"},
    "octane": {"cid": 356, "title": "Octane", "molecularFormula": "C8H18", "molecularWeight": 114.232,
               "iupacName": "octane", "smiles": "CCCCCCCC", "inchi": "InChI=1S/C8H18/c1-3-5-7-8-6-4-2/h3-8H2,1-2H3", "source": "local"},
    "ethene": {"cid": 6325, "title": "Ethene", "molecularFormula": "C2H4", "molecularWeight": 28.054,
               "iupacName": "ethene", "smiles": "C=C", "inchi": "InChI=1S/C2H4/c1-2/h1-2H2", "source": "local"},
    "ethyne": {"cid": 6326, "title": "Ethyne", "molecularFormula": "C2H2", "molecularWeight": 26.038,
               "iupacName": "ethyne", "smiles": "C#C", "inchi": "InChI=1S/C2H2/c1-2/h1-2H", "source": "local"},
    "benzene": {"cid": 241, "title": "Benzene", "molecularFormula": "C6H6", "molecularWeight": 78.114,
                "iupacName": "benzene", "smiles": "c1ccccc1", "inchi": "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H", "source": "local"},
    "toluene": {"cid": 1140, "title": "Toluene", "molecularFormula": "C7H8", "molecularWeight": 92.141,
                "iupacName": "toluene", "smiles": "Cc1ccccc1", "inchi": "InChI=1S/C7H8/c1-7-5-3-2-4-6-7/h2-6H,1H3", "source": "local"},

    # ---- ACIDS ----
    "hydrochloric acid": {"cid": 313, "title": "Hydrochloric Acid", "molecularFormula": "HCl", "molecularWeight": 36.461,
                          "iupacName": "hydrochloric acid", "smiles": "Cl", "inchi": "InChI=1S/ClH/h1H", "source": "local"},
    "sulfuric acid": {"cid": 1118, "title": "Sulfuric Acid", "molecularFormula": "H2SO4", "molecularWeight": 98.079,
                      "iupacName": "sulfuric acid", "smiles": "OS(=O)(=O)O", "inchi": "InChI=1S/H2O4S/c1-5(2,3)4/h(H2,1,2,3,4)", "source": "local"},
    "nitric acid": {"cid": 944, "title": "Nitric Acid", "molecularFormula": "HNO3", "molecularWeight": 63.012,
                    "iupacName": "nitric acid", "smiles": "[N+](=O)(O)[O-]", "inchi": "InChI=1S/HNO3/c2-1(3)4/h(H,2,3,4)", "source": "local"},
    "acetic acid": {"cid": 176, "title": "Acetic Acid", "molecularFormula": "C2H4O2", "molecularWeight": 60.052,
                    "iupacName": "acetic acid", "smiles": "CC(=O)O", "inchi": "InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)", "source": "local"},
    "formic acid": {"cid": 284, "title": "Formic Acid", "molecularFormula": "CH2O2", "molecularWeight": 46.025,
                    "iupacName": "formic acid", "smiles": "C(=O)O", "inchi": "InChI=1S/CH2O2/c2-1-3/h1H,(H,2,3)", "source": "local"},
    "citric acid": {"cid": 311, "title": "Citric Acid", "molecularFormula": "C6H8O7", "molecularWeight": 192.124,
                    "iupacName": "2-hydroxypropane-1,2,3-tricarboxylic acid", "smiles": "OC(=O)CC(O)(CC(=O)O)C(=O)O",
                    "inchi": "InChI=1S/C6H8O7/c7-3(8)1-6(13,5(11)12)2-4(9)10/h13H,1-2H2,(H,7,8)(H,9,10)(H,11,12)", "source": "local"},
    "oxalic acid": {"cid": 971, "title": "Oxalic Acid", "molecularFormula": "C2H2O4", "molecularWeight": 90.034,
                    "iupacName": "oxalic acid", "smiles": "OC(=O)C(=O)O", "inchi": "InChI=1S/C2H2O4/c3-1(4)2(5)6/h(H,3,4)(H,5,6)", "source": "local"},
    "phosphoric acid": {"cid": 1004, "title": "Phosphoric Acid", "molecularFormula": "H3PO4", "molecularWeight": 97.994,
                        "iupacName": "phosphoric acid", "smiles": "OP(=O)(O)O", "inchi": "InChI=1S/H3O4P/c1-5(2,3)4/h(H3,1,2,3,4)", "source": "local"},
    "benzoic acid": {"cid": 243, "title": "Benzoic Acid", "molecularFormula": "C7H6O2", "molecularWeight": 122.123,
                     "iupacName": "benzoic acid", "smiles": "OC(=O)c1ccccc1", "inchi": "InChI=1S/C7H6O2/c8-7(9)6-4-2-1-3-5-6/h1-5H,(H,8,9)", "source": "local"},

    # ---- BASES & SALTS ----
    "sodium hydroxide": {"cid": 14798, "title": "Sodium Hydroxide", "molecularFormula": "NaOH", "molecularWeight": 39.997,
                         "iupacName": "sodium hydroxide", "smiles": "[OH-].[Na+]", "inchi": "InChI=1S/Na.H2O/h;1H2/q+1;/p-1", "source": "local"},
    "potassium hydroxide": {"cid": 14797, "title": "Potassium Hydroxide", "molecularFormula": "KOH", "molecularWeight": 56.106,
                            "iupacName": "potassium hydroxide", "smiles": "[OH-].[K+]", "inchi": "InChI=1S/K.H2O/h;1H2/q+1;/p-1", "source": "local"},
    "calcium hydroxide": {"cid": 6093208, "title": "Calcium Hydroxide", "molecularFormula": "CaH2O2", "molecularWeight": 74.093,
                          "iupacName": "calcium dihydroxide", "smiles": "[OH-].[OH-].[Ca+2]", "inchi": "InChI=1S/Ca.2H2O/h;2*1H2/q+2;;/p-2", "source": "local"},
    "ammonia": {"cid": 222, "title": "Ammonia", "molecularFormula": "NH3", "molecularWeight": 17.031,
                "iupacName": "ammonia", "smiles": "N", "inchi": "InChI=1S/H3N/h1H3", "source": "local"},
    "sodium chloride": {"cid": 5234, "title": "Sodium Chloride", "molecularFormula": "NaCl", "molecularWeight": 58.443,
                        "iupacName": "sodium chloride", "smiles": "[Na+].[Cl-]", "inchi": "InChI=1S/ClH.Na/h1H;/q;+1/p-1", "source": "local"},
    "sodium carbonate": {"cid": 10340, "title": "Sodium Carbonate", "molecularFormula": "Na2CO3", "molecularWeight": 105.988,
                         "iupacName": "sodium carbonate", "smiles": "[Na+].[Na+].[O-]C([O-])=O",
                         "inchi": "InChI=1S/CH2O3.2Na/c2-1(3)4;;/h(H2,2,3,4);;/q;2*+1/p-2", "source": "local"},
    "sodium bicarbonate": {"cid": 516892, "title": "Sodium Bicarbonate", "molecularFormula": "NaHCO3", "molecularWeight": 84.007,
                           "iupacName": "sodium hydrogen carbonate", "smiles": "[Na+].OC([O-])=O",
                           "inchi": "InChI=1S/CH2O3.Na/c2-1(3)4;/h(H2,2,3,4);/q;+1/p-1", "source": "local"},
    "potassium bicarbonate": {"cid": 516893, "title": "Potassium Bicarbonate", "molecularFormula": "KHCO3", "molecularWeight": 100.115,
                              "iupacName": "potassium hydrogen carbonate", "smiles": "[K+].OC([O-])=O",
                              "inchi": "InChI=1S/CH2O3.K/c2-1(3)4;/h(H2,2,3,4);/q;+1/p-1", "source": "local"},
    "calcium carbonate": {"cid": 10112, "title": "Calcium Carbonate", "molecularFormula": "CaCO3", "molecularWeight": 100.087,
                          "iupacName": "calcium carbonate", "smiles": "[Ca+2].[O-]C([O-])=O",
                          "inchi": "InChI=1S/CH2O3.Ca/c2-1(3)4;/h(H2,2,3,4);/q;+2/p-2", "source": "local"},
    "potassium carbonate": {"cid": 11430, "title": "Potassium Carbonate", "molecularFormula": "K2CO3", "molecularWeight": 138.205,
                            "iupacName": "dipotassium carbonate", "smiles": "[K+].[K+].[O-]C([O-])=O",
                            "inchi": "InChI=1S/CH2O3.2K/c2-1(3)4;;/h(H2,2,3,4);;/q;2*+1/p-2", "source": "local"},
    "copper sulfate": {"cid": 24462, "title": "Copper Sulfate", "molecularFormula": "CuO4S", "molecularWeight": 159.609,
                       "iupacName": "copper(2+) sulfate", "smiles": "[Cu+2].[O-]S(=O)(=O)[O-]",
                       "inchi": "InChI=1S/Cu.H2O4S/c;1-5(2,3)4/h;(H2,1,2,3,4)/q+2;/p-2", "source": "local"},
    "magnesium sulfate": {"cid": 24083, "title": "Magnesium Sulfate", "molecularFormula": "MgO4S", "molecularWeight": 120.366,
                          "iupacName": "magnesium sulfate", "smiles": "[Mg+2].[O-]S(=O)(=O)[O-]",
                          "inchi": "InChI=1S/Mg.H2O4S/c;1-5(2,3)4/h;(H2,1,2,3,4)/q+2;/p-2", "source": "local"},
    "potassium permanganate": {"cid": 516875, "title": "Potassium Permanganate", "molecularFormula": "KMnO4", "molecularWeight": 158.034,
                               "iupacName": "potassium permanganate", "smiles": "[O-][Mn](=O)(=O)=O.[K+]",
                               "inchi": "InChI=1S/K.Mn.4O/h;;;1-4/q+1;;;;-1", "source": "local"},
    "potassium nitrate": {"cid": 24434, "title": "Potassium Nitrate", "molecularFormula": "KNO3", "molecularWeight": 101.103,
                          "iupacName": "potassium nitrate", "smiles": "[K+].[O-][N+](=O)[O-]",
                          "inchi": "InChI=1S/K.NO3/c;2-1(3)4/q+1;-1", "source": "local"},
    "ammonium nitrate": {"cid": 22985, "title": "Ammonium Nitrate", "molecularFormula": "H4N2O3", "molecularWeight": 80.043,
                         "iupacName": "ammonium nitrate", "smiles": "[NH4+].[O-][N+](=O)[O-]",
                         "inchi": "InChI=1S/NO3.H3N/c2-1(3)4;/h;1H3/q-1;/p+1", "source": "local"},

    # ---- OXIDES ----
    "carbon dioxide": {"cid": 280, "title": "Carbon Dioxide", "molecularFormula": "CO2", "molecularWeight": 44.009,
                       "iupacName": "carbon dioxide", "smiles": "O=C=O", "inchi": "InChI=1S/CO2/c2-1-3", "source": "local"},
    "carbon monoxide": {"cid": 281, "title": "Carbon Monoxide", "molecularFormula": "CO", "molecularWeight": 28.01,
                        "iupacName": "carbon monoxide", "smiles": "[C-]#[O+]", "inchi": "InChI=1S/CO/c1-2", "source": "local"},
    "calcium oxide": {"cid": 14778, "title": "Calcium Oxide", "molecularFormula": "CaO", "molecularWeight": 56.077,
                      "iupacName": "calcium oxide", "smiles": "[Ca]=O", "inchi": "InChI=1S/Ca.O", "source": "local"},
    "magnesium oxide": {"cid": 14792, "title": "Magnesium Oxide", "molecularFormula": "MgO", "molecularWeight": 40.304,
                        "iupacName": "magnesium oxide", "smiles": "[Mg]=O", "inchi": "InChI=1S/Mg.O", "source": "local"},
    "silicon dioxide": {"cid": 24261, "title": "Silicon Dioxide", "molecularFormula": "O2Si", "molecularWeight": 60.084,
                        "iupacName": "silicon dioxide", "smiles": "O=[Si]=O", "inchi": "InChI=1S/O2Si/c1-3-2", "source": "local"},
    "sulfur dioxide": {"cid": 1119, "title": "Sulfur Dioxide", "molecularFormula": "O2S", "molecularWeight": 64.064,
                       "iupacName": "sulfur dioxide", "smiles": "O=S=O", "inchi": "InChI=1S/O2S/c1-3-2", "source": "local"},
    "nitrogen dioxide": {"cid": 3032552, "title": "Nitrogen Dioxide", "molecularFormula": "NO2", "molecularWeight": 46.005,
                         "iupacName": "nitrogen dioxide", "smiles": "[O-][N+]=O", "inchi": "InChI=1S/NO2/c2-1-3", "source": "local"},

    # ---- KETONES / ALDEHYDES / ESTERS ----
    "acetone": {"cid": 180, "title": "Acetone", "molecularFormula": "C3H6O", "molecularWeight": 58.079,
                "iupacName": "propan-2-one", "smiles": "CC(=O)C", "inchi": "InChI=1S/C3H6O/c1-3(2)4/h1-2H3", "source": "local"},
    "formaldehyde": {"cid": 712, "title": "Formaldehyde", "molecularFormula": "CH2O", "molecularWeight": 30.026,
                     "iupacName": "formaldehyde", "smiles": "C=O", "inchi": "InChI=1S/CH2O/c1-2/h1H2", "source": "local"},
    "acetaldehyde": {"cid": 177, "title": "Acetaldehyde", "molecularFormula": "C2H4O", "molecularWeight": 44.053,
                     "iupacName": "acetaldehyde", "smiles": "CC=O", "inchi": "InChI=1S/C2H4O/c1-2-3/h2H,1H3", "source": "local"},
    "ethyl acetate": {"cid": 8857, "title": "Ethyl Acetate", "molecularFormula": "C4H8O2", "molecularWeight": 88.105,
                      "iupacName": "ethyl acetate", "smiles": "CCOC(=O)C", "inchi": "InChI=1S/C4H8O2/c1-3-6-4(2)5/h3H2,1-2H3", "source": "local"},

    # ---- SUGARS ----
    "glucose": {"cid": 5793, "title": "D-Glucose", "molecularFormula": "C6H12O6", "molecularWeight": 180.156,
                "iupacName": "(3R,4S,5S,6R)-6-(hydroxymethyl)oxane-2,3,4,5-tetrol",
                "smiles": "O[C@H]1[C@H](O)[C@H](O)[C@H](O)C(CO)O1",
                "inchi": "InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2", "source": "local"},
    "fructose": {"cid": 2723872, "title": "D-Fructose", "molecularFormula": "C6H12O6", "molecularWeight": 180.156,
                 "iupacName": "(2R,3S,4R,5R)-2,3,4,5,6-pentahydroxyhexanal", "smiles": "OCC(O)C(O)C(O)C(=O)CO",
                 "inchi": "InChI=1S/C6H12O6/c7-1-3(9)5(11)6(12)4(10)2-8/h3,5-9,11-12H,1-2H2", "source": "local"},
    "sucrose": {"cid": 5988, "title": "Sucrose", "molecularFormula": "C12H22O11", "molecularWeight": 342.297,
                "iupacName": "sucrose", "smiles": "OCC1OC(CO)(OC2OC(CO)C(O)C(O)C2O)C(O)C1O",
                "inchi": "InChI=1S/C12H22O11/c13-1-4-6(16)8(18)9(19)11(21-4)23-12(3-15)10(20)7(17)5(2-14)22-12/h4-11,13-20H,1-3H2", "source": "local"},

    # ---- PHARMACEUTICALS ----
    "aspirin": {"cid": 2244, "title": "Aspirin", "molecularFormula": "C9H8O4", "molecularWeight": 180.158,
                "iupacName": "2-acetyloxybenzoic acid", "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O",
                "inchi": "InChI=1S/C9H8O4/c1-6(10)13-8-5-3-2-4-7(8)9(11)12/h2-5H,1H3,(H,11,12)", "source": "local"},
    "paracetamol": {"cid": 1983, "title": "Paracetamol", "molecularFormula": "C8H9NO2", "molecularWeight": 151.163,
                    "iupacName": "N-(4-hydroxyphenyl)acetamide", "smiles": "CC(=O)NC1=CC=C(C=C1)O",
                    "inchi": "InChI=1S/C8H9NO2/c1-6(10)9-7-2-4-8(11)5-3-7/h2-5,11H,1H3,(H,9,10)", "source": "local"},
    "ibuprofen": {"cid": 3672, "title": "Ibuprofen", "molecularFormula": "C13H18O2", "molecularWeight": 206.281,
                  "iupacName": "2-[4-(2-methylpropyl)phenyl]propanoic acid", "smiles": "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
                  "inchi": "InChI=1S/C13H18O2/c1-9(2)8-11-4-6-12(7-5-11)10(3)13(14)15/h4-7,9-10H,8H2,1-3H3,(H,14,15)", "source": "local"},
}


def _search_local(name: str) -> Optional[Dict]:
    clean = name.lower().strip()
    if clean in LOCAL_COMPOUNDS:
        print(f"Local: Found '{clean}'")
        return LOCAL_COMPOUNDS[clean].copy()
    for alias in NAME_ALIASES.get(clean, []):
        hit = LOCAL_COMPOUNDS.get(alias.lower())
        if hit:
            print(f"Local: Alias '{clean}' -> '{alias}'")
            return hit.copy()
    return None


def _names_to_try(name: str) -> List[str]:
    if name in NAME_ALIASES:
        aliases = NAME_ALIASES[name]
        return [name] + [a for a in aliases if a != name]
    return [name]


# ============================================================
# PARTIAL-MERGE HELPER
# ============================================================

def _merge_compound(base: Dict, add: Dict) -> Dict:
    """Merge fields from `add` into `base`, never overwriting a non-empty field."""
    for key, value in add.items():
        if key.startswith("_"):
            continue
        if not base.get(key) and value:
            base[key] = value
    return base


def _make_partial(source: str, smiles: str = "", title: str = "", formula: str = "",
                  mw: float = 0, iupac: str = "", cid: int = 0, inchi: str = "") -> Dict:
    """Build a partial compound record — any field can be empty."""
    return {
        "cid": cid,
        "title": title or "Unknown",
        "molecularFormula": formula or "Not available",
        "molecularWeight": mw,
        "iupacName": iupac or "Not available",
        "smiles": smiles or "",
        "inchi": inchi or "",
        "source": source,
        "sourceId": str(cid) if cid else "",
        "_partial": True,
        "_provider": source.lower(),
    }


# ============================================================
# PROVIDER: CACTUS (SMILES-first — best for classrooms)
# ============================================================

async def _search_cactus(name: str) -> Optional[Dict]:
    print(f"CACTUS: Searching '{name}'")
    for search_name in _names_to_try(name):
        enc = quote(search_name, safe="")

        status, body = await _get_text(f"{CACTUS_BASE}/{enc}/smiles", provider="cactus")
        if status != 200 or not body or "<html" in body.lower() or "not found" in body.lower():
            continue
        smiles = body.strip()
        if not smiles or smiles == "404":
            continue

        result = _make_partial("CACTUS", smiles=smiles, title=search_name.title())

        status, formula_body = await _get_text(f"{CACTUS_BASE}/{enc}/formula", provider="cactus")
        if status == 200 and formula_body and "<html" not in formula_body.lower():
            result["molecularFormula"] = formula_body.strip()

        status, mw_body = await _get_text(f"{CACTUS_BASE}/{enc}/mw", provider="cactus")
        try:
            if status == 200 and mw_body:
                result["molecularWeight"] = float(mw_body.strip())
        except ValueError:
            pass

        status, iupac_body = await _get_text(f"{CACTUS_BASE}/{enc}/iupac_name", provider="cactus")
        if status == 200 and iupac_body and "<html" not in iupac_body.lower():
            result["iupacName"] = iupac_body.strip()

        return result
    return None


# ============================================================
# PROVIDER: WIKIPEDIA
# ============================================================

async def _search_wikipedia(name: str) -> Optional[Dict]:
    print(f"Wikipedia: Searching '{name}'")
    for search_name in _names_to_try(name):
        params = {
            "action": "query", "prop": "revisions", "rvprop": "content",
            "format": "json", "titles": search_name, "redirects": "1",
        }
        query_string = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
        url = f"{WIKIPEDIA_API}?{query_string}"

        headers = {"User-Agent": "ChemLab-Kenya/1.0 (educational; contact@chemlab.co.ke)"}
        data = await _get_json(url, headers=headers, provider="wikipedia")
        if not data:
            continue

        pages = data.get("query", {}).get("pages", {})
        if not pages:
            continue
        page_id = list(pages.keys())[0]
        if page_id == "-1":
            continue

        revisions = pages[page_id].get("revisions", [{}])
        wikitext = revisions[0].get("*", "") if revisions else ""
        if not wikitext:
            continue

        smiles_match = re.search(r"\|\s*SMILES\s*=\s*([^\n\|}]+)", wikitext, re.IGNORECASE)
        if not smiles_match:
            continue

        raw_smiles = smiles_match.group(1).strip()
        clean_smiles = re.sub(r"\{\{.*?\}\}", "", raw_smiles)
        clean_smiles = re.sub(r"<ref.*?>.*?</ref>", "", clean_smiles)
        clean_smiles = re.sub(r"<!--.*?-->", "", clean_smiles)
        clean_smiles = clean_smiles.split("<br")[0].strip()

        try:
            from rdkit import Chem
            mol = Chem.MolFromSmiles(clean_smiles)
            canonical_smiles = Chem.MolToSmiles(mol) if mol is not None else clean_smiles
        except ImportError:
            canonical_smiles = clean_smiles

        if not canonical_smiles:
            continue

        title = pages[page_id].get("title", search_name)
        formula_match = re.search(r"\|\s*formula\s*=\s*([^\n\|}]+)", wikitext, re.IGNORECASE)
        formula = formula_match.group(1).strip() if formula_match else "Not available"

        return _make_partial("Wikipedia", smiles=canonical_smiles, title=title, formula=formula, iupac=title)
    return None


# ============================================================
# PROVIDER: PUBCHEM (properties — enrich, don't require)
# ============================================================

async def _search_pubchem(name: str) -> Optional[Dict]:
    print(f"PubChem: Searching '{name}'")
    for search_name in _names_to_try(name):
        cid_url = f"{PUBCHEM_BASE}/compound/name/{quote(search_name, safe='')}/cids/JSON"
        cid_data = await _get_json(cid_url, provider="pubchem")
        if cid_data is None:
            continue
        cids = cid_data.get("IdentifierList", {}).get("CID", [])
        if not cids:
            continue

        limited_cids = cids[:10]
        cid_list = ",".join(str(cid) for cid in limited_cids)
        properties = ",".join([
            "Title", "MolecularFormula", "MolecularWeight", "IUPACName",
            "SMILES", "ConnectivitySMILES", "CanonicalSMILES", "IsomericSMILES",
        ])

        prop_data = await _get_json(
            f"{PUBCHEM_BASE}/compound/cid/{cid_list}/property/{properties}/JSON",
            provider="pubchem",
        )
        if not prop_data:
            continue

        props = prop_data.get("PropertyTable", {}).get("Properties", [])
        by_cid = {item.get("CID"): item for item in props}
        ordered = [by_cid[c] for c in limited_cids if c in by_cid]
        if not ordered:
            continue

        item = next(
            (i for i in ordered if (i.get("Title") or "").lower() == search_name.lower()),
            ordered[0],
        )
        cid = item.get("CID")

        return _make_partial(
            "PubChem",
            smiles=(item.get("SMILES") or item.get("IsomericSMILES")
                    or item.get("ConnectivitySMILES") or item.get("CanonicalSMILES") or ""),
            title=item.get("Title", search_name),
            formula=item.get("MolecularFormula", ""),
            mw=float(item.get("MolecularWeight", 0) or 0),
            iupac=item.get("IUPACName", ""),
            cid=int(cid) if cid else 0,
        )
    return None


# ============================================================
# PROVIDER: ChEMBL
# ============================================================

async def _search_chembl(name: str) -> Optional[Dict]:
    print(f"ChEMBL: Searching '{name}'")
    for search_name in _names_to_try(name):
        url = f"{CHEMBL_BASE}/molecule/search.json?q={quote(search_name)}"
        data = await _get_json(url, provider="chembl")
        if not data:
            continue

        search_lower = search_name.lower()
        for mol in data.get("molecules", []):
            names = {(mol.get("pref_name") or "").lower()}
            names |= {(s.get("molecule_synonym") or "").lower() for s in (mol.get("molecule_synonyms") or [])}
            if search_lower not in names:
                continue

            structures = mol.get("molecule_structures") or {}
            props = mol.get("molecule_properties") or {}
            if not structures.get("canonical_smiles"):
                continue

            return _make_partial(
                "ChEMBL",
                smiles=structures.get("canonical_smiles") or "",
                title=mol.get("pref_name") or search_name,
                formula=props.get("full_molformula") or "",
                mw=float(props.get("full_mwt") or props.get("mw_freebase") or 0),
                iupac=mol.get("pref_name") or "",
                inchi=structures.get("standard_inchi") or "",
            )
    return None


# ============================================================
# PROVIDER: ChemSpider
# ============================================================

async def _search_chemspider(name: str) -> Optional[Dict]:
    if not RSC_API_KEY:
        return None
    headers = {"Accept": "application/json", "apikey": RSC_API_KEY}

    for search_name in _names_to_try(name):
        data = await _get_json(f"{RSC_API_BASE}/search?q={quote(search_name)}", headers=headers, provider="chemspider")
        if not data:
            continue

        results = data.get("results", [])
        if not results:
            continue
        compound_id = results[0].get("id")
        if not compound_id:
            continue

        detail_data = await _get_json(f"{RSC_API_BASE}/compounds/{compound_id}", headers=headers, provider="chemspider")
        if not detail_data:
            continue

        return _make_partial(
            "ChemSpider",
            smiles=detail_data.get("smiles") or "",
            title=detail_data.get("name") or search_name,
            formula=detail_data.get("formula") or "",
            mw=float(detail_data.get("molecularWeight", 0) or 0),
            iupac=detail_data.get("iupacName") or "",
            cid=int(compound_id) if str(compound_id).isdigit() else 0,
            inchi=detail_data.get("inchi") or "",
        )
    return None


# ============================================================
# LEGACY NAME SEARCH
# ============================================================

PROVIDERS = [
    ("cactus", _search_cactus),       # SMILES-first, most reliable for students
    ("pubchem", _search_pubchem),     # rich properties but rate-limited
    ("chembl", _search_chembl),
    ("chemspider", _search_chemspider),
    ("wikipedia", _search_wikipedia), # fallback, has SMILES on most compound pages
]


async def search_compound_by_name(name: str) -> Optional[Dict]:
    clean_name = name.strip().lower()
    if not clean_name:
        return None

    print(f"\n===== SEARCHING FOR: {clean_name} =====")

    cached = _cache_get(clean_name)
    if cached:
        cached["_cache_hit"] = True
        return cached

    local = _search_local(clean_name)
    if local:
        _cache_set(clean_name, local)
        local["_cache_hit"] = True
        return local

    # Try each provider; merge partial results
    best: Optional[Dict] = None

    for provider_name, search_func in PROVIDERS:
        if not _is_provider_available(provider_name):
            print(f"{provider_name}: Circuit open, skipping")
            continue

        try:
            result = await search_func(clean_name)
            if result:
                _record_success(provider_name)
                if best is None:
                    best = result
                else:
                    best = _merge_compound(best, result)
                # If we already have SMILES + formula, stop early — good enough
                if best.get("smiles") and best.get("molecularFormula") not in ("", "Not available"):
                    break
        except Exception as e:
            print(f"{provider_name} error: {e}")
            _record_failure(provider_name)

    if best:
        _cache_set(clean_name, best)
        return best

    print(f"ALL PROVIDERS FAILED for '{clean_name}'")
    return None


# ============================================================
# FORMULA SEARCH
# ============================================================

_formula_cache: Dict[str, List[Dict]] = {}


async def search_by_formula(formula: str) -> Optional[List[Dict]]:
    clean_formula = formula.strip()
    if clean_formula in _formula_cache:
        return _formula_cache[clean_formula]

    cached = _cache_get(f"formula_{clean_formula}")
    if cached:
        _formula_cache[clean_formula] = cached
        return cached

    cid_data = await _get_json(
        f"{PUBCHEM_BASE}/compound/fastformula/{quote(clean_formula, safe='')}/cids/JSON?MaxRecords=20",
        provider="pubchem",
    )
    if cid_data is None:
        return None

    key = (cid_data.get("Waiting") or {}).get("ListKey")
    for _ in range(6):
        if not key:
            break
        await asyncio.sleep(1)
        cid_data = await _get_json(f"{PUBCHEM_BASE}/compound/listkey/{key}/cids/JSON", provider="pubchem")
        if cid_data is None:
            return None
        if not cid_data or "IdentifierList" in cid_data:
            break

    cids = (cid_data.get("IdentifierList") or {}).get("CID", [])
    if not cids:
        _formula_cache[clean_formula] = []
        return []

    cid_list = ",".join(str(cid) for cid in cids[:20])
    properties = ",".join([
        "Title", "MolecularFormula", "MolecularWeight", "IUPACName",
        "SMILES", "ConnectivitySMILES", "CanonicalSMILES", "IsomericSMILES",
    ])

    prop_data = await _get_json(
        f"{PUBCHEM_BASE}/compound/cid/{cid_list}/property/{properties}/JSON",
        provider="pubchem",
    )
    if prop_data is None:
        return None

    props = (prop_data.get("PropertyTable") or {}).get("Properties", [])

    results = []
    for item in props:
        results.append({
            "cid": int(item.get("CID", 0)),
            "title": item.get("Title", "Unnamed"),
            "molecularFormula": item.get("MolecularFormula", clean_formula),
            "molecularWeight": float(item.get("MolecularWeight", 0) or 0),
            "iupacName": item.get("IUPACName", "Not available"),
            "smiles": (item.get("SMILES") or item.get("IsomericSMILES")
                       or item.get("ConnectivitySMILES") or item.get("CanonicalSMILES") or ""),
            "inchi": "",
            "structureImage": "",
            "source": "PubChem",
            "sourceId": str(item.get("CID", "")),
        })

    _formula_cache[clean_formula] = results
    _cache_set(f"formula_{clean_formula}", results)
    return results


# ============================================================
# CACHE MANAGEMENT
# ============================================================

def clear_cache():
    _formula_cache.clear()
    for f in os.listdir(CACHE_DIR):
        if f.endswith(".json"):
            os.remove(os.path.join(CACHE_DIR, f))
    print("All caches cleared")


def get_cache_stats() -> Dict:
    files = [f for f in os.listdir(CACHE_DIR) if f.endswith(".json")]
    total_size = sum(os.path.getsize(os.path.join(CACHE_DIR, f)) for f in files)
    return {
        "memory_cache_count": len(_formula_cache),
        "file_cache_count": len(files),
        "size_bytes": total_size,
        "size_kb": round(total_size / 1024, 2),
    }
