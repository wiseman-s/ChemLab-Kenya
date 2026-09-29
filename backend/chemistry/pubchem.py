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

# ChemSpider (RSC API) - set via environment variable, never hardcode a real key
RSC_API_KEY = os.environ.get("RSC_API_KEY", "")
RSC_API_BASE = "https://api.rsc.org/compounds/v1"

REQUEST_TIMEOUT = 6.0
MAX_RETRIES = 1
BACKOFF_BASE_SECONDS = 0.75
CACHE_DURATION_HOURS = 24

# ============================================================
# NAME ALIASES
# ============================================================

NAME_ALIASES: Dict[str, List[str]] = {
    # ---- ELEMENTS ----
    "hydrogen": ["hydrogen"],
    "oxygen": ["oxygen"],
    "nitrogen": ["nitrogen"],
    "carbon": ["carbon"],
    "sulfur": ["sulfur", "sulphur"],
    "phosphorus": ["phosphorus"],
    "chlorine": ["chlorine"],
    "iodine": ["iodine"],
    "bromine": ["bromine"],

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

    # Acids
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

    # Salts
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

    # Oxides
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
    # Alcohols
    "methanol": ["methanol", "methyl alcohol", "wood alcohol"],
    "methyl alcohol": ["methanol", "methyl alcohol"],
    "ethanol": ["ethanol", "ethyl alcohol", "alcohol"],
    "ethyl alcohol": ["ethanol", "ethyl alcohol"],
    "isopropanol": ["isopropanol", "2-propanol", "isopropyl alcohol"],
    "isopropyl alcohol": ["isopropanol", "2-propanol", "isopropyl alcohol"],
    "ethylene glycol": ["ethylene glycol", "ethan-1,2-diol"],
    "glycerol": ["glycerol", "glycerine"],
    "phenol": ["phenol", "carbolic acid"],

    # Hydrocarbons
    "methane": ["methane"],
    "ethane": ["ethane"],
    "propane": ["propane"],
    "butane": ["butane"],
    "pentane": ["pentane"],
    "hexane": ["hexane"],
    "heptane": ["heptane"],
    "octane": ["octane"],
    "ethene": ["ethene", "ethylene"],
    "ethylene": ["ethene", "ethylene"],
    "ethyne": ["ethyne", "acetylene"],
    "acetylene": ["ethyne", "acetylene"],
    "benzene": ["benzene"],
    "toluene": ["toluene", "methylbenzene"],

    # Ketones
    "acetone": ["acetone", "propan-2-one", "2-propanone"],

    # Aldehydes
    "formaldehyde": ["formaldehyde", "methanal"],
    "acetaldehyde": ["acetaldehyde", "ethanal"],

    # Esters
    "ethyl acetate": ["ethyl acetate", "ethyl ethanoate"],

    # Sugars
    "glucose": ["glucose", "dextrose", "grape sugar"],
    "fructose": ["fructose", "fruit sugar"],
    "sucrose": ["sucrose", "table sugar", "cane sugar"],
    "lactose": ["lactose", "milk sugar"],
    "starch": ["starch", "amylum"],

    # Pharmaceuticals
    "aspirin": ["aspirin", "acetylsalicylic acid"],
    "paracetamol": ["paracetamol", "acetaminophen"],
    "ibuprofen": ["ibuprofen"],

    # Gases
    "ammonia": ["ammonia"],
    "hydrogen peroxide": ["hydrogen peroxide", "H2O2"],

    # Common compounds
    "water": ["water", "H2O"],
}

# ============================================================
# RATE LIMITING (PER PROVIDER, ONE LOCK EACH)
# ============================================================

RATE_LIMITS: Dict[str, float] = {
    "cactus": 1.0,
    "pubchem": 0.22,
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
# FILE-BASED CACHING
# ============================================================

CACHE_DIR = "cache"
os.makedirs(CACHE_DIR, exist_ok=True)


def _get_cache_key(name: str) -> str:
    # Readable slug + hash of the exact original text, so "Co" and "CO" never collide
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

    data = {
        "_cached_at": datetime.now().isoformat(),
        "result": result,
    }

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
        headers=headers or {"User-Agent": "ChemLab-Kenya/1.0"},
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
    Returns parsed JSON on success, {} when the service says "not found / bad input"
    (404 or 400), and None on a real failure (network error, 429, 5xx, other errors).
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
                return None

        if status in {400, 404}:
            return {}

        if status == 0 or status in {429, 500, 502, 503, 504}:
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
    """Like _get_json but returns raw (status, text) - used by CACTUS."""
    if provider:
        await _wait_for_rate(provider)
    return await asyncio.to_thread(_blocking_get, url, headers, timeout)


# ============================================================
# CIRCUIT BREAKER
# ============================================================

_provider_failures: Dict[str, int] = {}
_provider_disabled_until: Dict[str, float] = {}
CIRCUIT_FAILURE_THRESHOLD = 3
CIRCUIT_COOLDOWN_DEFAULT = 60
CIRCUIT_COOLDOWN = {"pubchem": 300}  # back off 5 minutes if PubChem throttles or blocks us


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
# LOCAL DATABASE
# ============================================================

LOCAL_COMPOUNDS: Dict[str, Dict] = {
    "water": {
        "cid": 962, "title": "Water", "molecularFormula": "H2O",
        "molecularWeight": 18.015, "iupacName": "oxidane", "smiles": "O",
        "inchi": "InChI=1S/H2O/h1H2", "source": "local",
    },
    "ethanol": {
        "cid": 702, "title": "Ethanol", "molecularFormula": "C2H6O",
        "molecularWeight": 46.068, "iupacName": "ethanol", "smiles": "CCO",
        "inchi": "InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3", "source": "local",
    },
    "methanol": {
        "cid": 887, "title": "Methanol", "molecularFormula": "CH4O",
        "molecularWeight": 32.042, "iupacName": "methanol", "smiles": "CO",
        "inchi": "InChI=1S/CH4O/c1-2/h2H,1H3", "source": "local",
    },
    "aspirin": {
        "cid": 2244, "title": "Aspirin", "molecularFormula": "C9H8O4",
        "molecularWeight": 180.158, "iupacName": "2-acetyloxybenzoic acid",
        "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O",
        "inchi": "InChI=1S/C9H8O4/c1-6(10)13-8-5-3-2-4-7(8)9(11)12/h2-5H,1H3,(H,11,12)",
        "source": "local",
    },
    "sodium chloride": {
        "cid": 5234, "title": "Sodium Chloride", "molecularFormula": "NaCl",
        "molecularWeight": 58.443, "iupacName": "sodium chloride", "smiles": "[Na+].[Cl-]",
        "inchi": "InChI=1S/ClH.Na/h1H;/q;+1/p-1", "source": "local",
    },
    "glucose": {
        "cid": 5793, "title": "D-Glucose", "molecularFormula": "C6H12O6",
        "molecularWeight": 180.156,
        "iupacName": "(3R,4S,5S,6R)-6-(hydroxymethyl)oxane-2,3,4,5-tetrol",
        "smiles": "O[C@H]1[C@H](O)[C@H](O)[C@H](O)C(CO)O1",
        "inchi": "InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2",
        "source": "local",
    },
    "methane": {
        "cid": 297, "title": "Methane", "molecularFormula": "CH4",
        "molecularWeight": 16.043, "iupacName": "methane", "smiles": "C",
        "inchi": "InChI=1S/CH4/h1H4", "source": "local",
    },
    "carbon dioxide": {
        "cid": 280, "title": "Carbon Dioxide", "molecularFormula": "CO2",
        "molecularWeight": 44.009, "iupacName": "carbon dioxide", "smiles": "O=C=O",
        "inchi": "InChI=1S/CO2/c2-1-3", "source": "local",
    },
    "calcium carbonate": {
        "cid": 0, "title": "Calcium Carbonate", "molecularFormula": "CaCO3",
        "molecularWeight": 100.087, "iupacName": "calcium carbonate",
        "smiles": "[Ca+2].[O-]C([O-])=O",
        "inchi": "InChI=1S/CH2O3.Ca/c2-1(3)4;/h(H2,2,3,4);/q;+2/p-2", "source": "local",
    },
    "sodium hydroxide": {
        "cid": 14798, "title": "Sodium Hydroxide", "molecularFormula": "NaOH",
        "molecularWeight": 39.997, "iupacName": "sodium hydroxide", "smiles": "[OH-].[Na+]",
        "inchi": "InChI=1S/Na.H2O/h;1H2/q+1;/p-1", "source": "local",
    },
    "hydrochloric acid": {
        "cid": 313, "title": "Hydrochloric Acid", "molecularFormula": "HCl",
        "molecularWeight": 36.461, "iupacName": "hydrochloric acid", "smiles": "Cl",
        "inchi": "InChI=1S/ClH/h1H", "source": "local",
    },
    "sulfuric acid": {
        "cid": 1118, "title": "Sulfuric Acid", "molecularFormula": "H2SO4",
        "molecularWeight": 98.079, "iupacName": "sulfuric acid", "smiles": "OS(=O)(=O)O",
        "inchi": "InChI=1S/H2O4S/c1-5(2,3)4/h(H2,1,2,3,4)", "source": "local",
    },
    "nitric acid": {
        "cid": 944, "title": "Nitric Acid", "molecularFormula": "HNO3",
        "molecularWeight": 63.012, "iupacName": "nitric acid",
        "smiles": "[N+](=O)(O)[O-]",
        "inchi": "InChI=1S/HNO3/c2-1(3)4/h(H,2,3,4)", "source": "local",
    },
    "ammonia": {
        "cid": 222, "title": "Ammonia", "molecularFormula": "NH3",
        "molecularWeight": 17.031, "iupacName": "ammonia", "smiles": "N",
        "inchi": "InChI=1S/H3N/h1H3", "source": "local",
    },
    "acetone": {
        "cid": 180, "title": "Acetone", "molecularFormula": "C3H6O",
        "molecularWeight": 58.079, "iupacName": "propan-2-one", "smiles": "CC(=O)C",
        "inchi": "InChI=1S/C3H6O/c1-3(2)4/h1-2H3", "source": "local",
    },
    "benzene": {
        "cid": 241, "title": "Benzene", "molecularFormula": "C6H6",
        "molecularWeight": 78.114, "iupacName": "benzene", "smiles": "c1ccccc1",
        "inchi": "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H", "source": "local",
    },
    "toluene": {
        "cid": 1140, "title": "Toluene", "molecularFormula": "C7H8",
        "molecularWeight": 92.141, "iupacName": "toluene", "smiles": "Cc1ccccc1",
        "inchi": "InChI=1S/C7H8/c1-7-5-3-2-4-6-7/h2-6H,1H3", "source": "local",
    },
    "potassium permanganate": {
        "cid": 516875, "title": "Potassium Permanganate", "molecularFormula": "KMnO4",
        "molecularWeight": 158.034, "iupacName": "potassium permanganate",
        "smiles": "[O-][Mn](=O)(=O)=O.[K+]",
        "inchi": "InChI=1S/K.Mn.4O/h;;;1-4/q+1;;;;-1", "source": "local",
    },
    "sodium carbonate": {
        "cid": 10340, "title": "Sodium Carbonate", "molecularFormula": "Na2CO3",
        "molecularWeight": 105.988, "iupacName": "sodium carbonate",
        "smiles": "[Na+].[Na+].[O-]C([O-])=O",
        "inchi": "InChI=1S/CH2O3.2Na/c2-1(3)4;;/h(H2,2,3,4);;/q;2*+1/p-2", "source": "local",
    },
    "sodium bicarbonate": {
        "cid": 516892, "title": "Sodium Bicarbonate", "molecularFormula": "NaHCO3",
        "molecularWeight": 84.007, "iupacName": "sodium hydrogen carbonate",
        "smiles": "[Na+].OC([O-])=O",
        "inchi": "InChI=1S/CH2O3.Na/c2-1(3)4;/h(H2,2,3,4);/q;+1/p-1", "source": "local",
    },
    "potassium bicarbonate": {
        "cid": 516893, "title": "Potassium Bicarbonate", "molecularFormula": "KHCO3",
        "molecularWeight": 100.115, "iupacName": "potassium hydrogen carbonate",
        "smiles": "[K+].OC([O-])=O",
        "inchi": "InChI=1S/CH2O3.K/c2-1(3)4;/h(H2,2,3,4);/q;+1/p-1", "source": "local",
    },
}


def _search_local(name: str) -> Optional[Dict]:
    """Exact name or exact alias only. No substring matching (that caused nitrobenzene -> benzene)."""
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
    """Resolve a query to its alias list, always including the raw name first."""
    if name in NAME_ALIASES:
        aliases = NAME_ALIASES[name]
        return [name] + [a for a in aliases if a != name]
    return [name]


# ============================================================
# PROVIDER: CACTUS NIH
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

        status, formula_body = await _get_text(f"{CACTUS_BASE}/{enc}/formula", provider="cactus")
        formula = formula_body.strip() if status == 200 and formula_body and "<html" not in formula_body.lower() else "Not available"

        status, mw_body = await _get_text(f"{CACTUS_BASE}/{enc}/mw", provider="cactus")
        try:
            mw = float(mw_body.strip()) if status == 200 and mw_body else 0
        except ValueError:
            mw = 0

        status, iupac_body = await _get_text(f"{CACTUS_BASE}/{enc}/iupac_name", provider="cactus")
        iupac = iupac_body.strip() if status == 200 and iupac_body and "<html" not in iupac_body.lower() else search_name

        return {
            "cid": 0,
            "title": search_name.title(),
            "molecularFormula": formula,
            "molecularWeight": mw,
            "iupacName": iupac,
            "smiles": smiles,
            "inchi": "",
            "source": "CACTUS",
            "sourceId": "",
            "_provider": "cactus",
        }

    return None


# ============================================================
# PROVIDER: WIKIPEDIA
# ============================================================

async def _search_wikipedia(name: str) -> Optional[Dict]:
    print(f"Wikipedia: Searching '{name}'")

    for search_name in _names_to_try(name):
        params = {
            "action": "query",
            "prop": "revisions",
            "rvprop": "content",
            "format": "json",
            "titles": search_name,
            "redirects": "1",
        }
        query_string = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
        url = f"{WIKIPEDIA_API}?{query_string}"

        headers = {"User-Agent": "ChemLab-Kenya/1.0 (contact: your-real-email@chemlab.co.ke)"}
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
        except ImportError:
            Chem = None
            mol = None

        if mol is not None:
            canonical_smiles = Chem.MolToSmiles(mol)
        elif clean_smiles:
            canonical_smiles = clean_smiles
        else:
            continue

        title = pages[page_id].get("title", search_name)

        formula_match = re.search(r"\|\s*formula\s*=\s*([^\n\|}]+)", wikitext, re.IGNORECASE)
        formula = formula_match.group(1).strip() if formula_match else "Not available"

        return {
            "cid": 0,
            "title": title,
            "molecularFormula": formula,
            "molecularWeight": 0,
            "iupacName": title,
            "smiles": canonical_smiles,
            "inchi": "",
            "source": "Wikipedia",
            "sourceId": page_id,
            "_provider": "wikipedia",
        }

    return None


# ============================================================
# PROVIDER: PUBCHEM
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

        # PubChem returns CIDs in relevance order: trust it, prefer an exact title match
        item = next(
            (i for i in ordered if (i.get("Title") or "").lower() == search_name.lower()),
            ordered[0],
        )
        cid = item.get("CID")

        return {
            "cid": int(cid),
            "title": item.get("Title", search_name),
            "molecularFormula": item.get("MolecularFormula", "Not available"),
            "molecularWeight": float(item.get("MolecularWeight", 0) or 0),
            "iupacName": item.get("IUPACName", "Not available"),
            "smiles": (item.get("SMILES") or item.get("IsomericSMILES")
                       or item.get("ConnectivitySMILES") or item.get("CanonicalSMILES") or ""),
            "inchi": "",
            "source": "PubChem",
            "sourceId": str(cid),
            "_provider": "pubchem",
        }

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
            if search_lower not in names:  # exact only: ChEMBL search is fuzzy
                continue

            structures = mol.get("molecule_structures") or {}
            props = mol.get("molecule_properties") or {}
            if not structures.get("canonical_smiles"):
                continue

            return {
                "cid": 0,
                "title": mol.get("pref_name") or search_name,
                "molecularFormula": props.get("full_molformula") or "Not available",
                "molecularWeight": float(props.get("full_mwt") or props.get("mw_freebase") or 0),
                "iupacName": mol.get("pref_name") or "Not available",
                "smiles": structures.get("canonical_smiles") or "",
                "inchi": structures.get("standard_inchi") or "",
                "source": "ChEMBL",
                "sourceId": mol.get("molecule_chembl_id", ""),
                "_provider": "chembl",
            }

    return None


# ============================================================
# PROVIDER: ChemSpider (RSC API)
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

        return {
            "cid": int(compound_id) if str(compound_id).isdigit() else 0,
            "title": detail_data.get("name") or search_name,
            "molecularFormula": detail_data.get("formula") or "Not available",
            "molecularWeight": float(detail_data.get("molecularWeight", 0) or 0),
            "iupacName": detail_data.get("iupacName") or "Not available",
            "smiles": detail_data.get("smiles") or "",
            "inchi": detail_data.get("inchi") or "",
            "source": "ChemSpider",
            "sourceId": str(compound_id),
            "_provider": "chemspider",
        }

    return None


# ============================================================
# LEGACY NAME SEARCH (still used by /api/compound/name)
# ============================================================

PROVIDERS = [
    ("pubchem", _search_pubchem),
    ("cactus", _search_cactus),
    ("chembl", _search_chembl),
    ("chemspider", _search_chemspider),
    ("wikipedia", _search_wikipedia),
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

    for provider_name, search_func in PROVIDERS:
        if not _is_provider_available(provider_name):
            print(f"{provider_name}: Circuit open, skipping")
            continue

        try:
            result = await search_func(clean_name)
            if result:
                _record_success(provider_name)
                _cache_set(clean_name, result)
                return result
        except Exception as e:
            print(f"{provider_name} error: {e}")
            _record_failure(provider_name)

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
