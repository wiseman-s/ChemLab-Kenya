# backend/chemistry/formula_search.py

import asyncio
import json
import re
import time
import os
from typing import Any, Optional, List, Dict
from urllib.parse import quote
from datetime import datetime, timedelta

# ============================================================
# CONFIGURATION
# ============================================================

PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
CACTUS_BASE = "https://cactus.nci.nih.gov/chemical/structure"

REQUEST_TIMEOUT = 10.0
MAX_RETRIES = 2
CACHE_DURATION_HOURS = 24

# ============================================================
# RATE LIMITING (Per Provider)
# ============================================================

_wikidata_last_request = 0.0
_wikipedia_last_request = 0.0
_cactus_last_request = 0.0
_pubchem_last_request = 0.0

WIKIDATA_MIN_INTERVAL = 0.5
WIKIPEDIA_MIN_INTERVAL = 0.2
CACTUS_MIN_INTERVAL = 1.0
PUBCHEM_MIN_INTERVAL = 0.22

async def _wait_for_wikidata():
    global _wikidata_last_request
    now = time.monotonic()
    wait = WIKIDATA_MIN_INTERVAL - (now - _wikidata_last_request)
    if wait > 0:
        await asyncio.sleep(wait)
    _wikidata_last_request = time.monotonic()

async def _wait_for_wikipedia():
    global _wikipedia_last_request
    now = time.monotonic()
    wait = WIKIPEDIA_MIN_INTERVAL - (now - _wikipedia_last_request)
    if wait > 0:
        await asyncio.sleep(wait)
    _wikipedia_last_request = time.monotonic()

async def _wait_for_cactus():
    global _cactus_last_request
    now = time.monotonic()
    wait = CACTUS_MIN_INTERVAL - (now - _cactus_last_request)
    if wait > 0:
        await asyncio.sleep(wait)
    _cactus_last_request = time.monotonic()

async def _wait_for_pubchem():
    global _pubchem_last_request
    now = time.monotonic()
    wait = PUBCHEM_MIN_INTERVAL - (now - _pubchem_last_request)
    if wait > 0:
        await asyncio.sleep(wait)
    _pubchem_last_request = time.monotonic()

# ============================================================
# FILE-BASED CACHING
# ============================================================

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def _get_cache_key(name: str) -> str:
    return name.lower().replace(" ", "_").replace("/", "_").replace("\\", "_")

def _get_cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, f"formula_{key}.json")

def _cache_get(name: str) -> Optional[Dict]:
    key = _get_cache_key(name)
    path = _get_cache_path(key)
    
    if not os.path.exists(path):
        return None
    
    try:
        with open(path, 'r') as f:
            data = json.load(f)
        
        cached_time = datetime.fromisoformat(data.get("_cached_at", "2000-01-01T00:00:00"))
        if datetime.now() - cached_time > timedelta(hours=CACHE_DURATION_HOURS):
            return None
        
        return data.get("result")
    except Exception:
        return None

def _cache_set(name: str, result: List[Dict]):
    key = _get_cache_key(name)
    path = _get_cache_path(key)
    
    data = {
        "_cached_at": datetime.now().isoformat(),
        "result": result
    }
    
    try:
        with open(path, 'w') as f:
            json.dump(data, f)
    except Exception:
        pass

# ============================================================
# LOCAL FORMULA DATABASE
# ============================================================

LOCAL_FORMULAS: Dict[str, List[Dict]] = {
    'H2O': [{
        'cid': 962,
        'title': 'Water',
        'molecularFormula': 'H2O',
        'molecularWeight': 18.015,
        'iupacName': 'oxidane',
        'smiles': 'O',
        'inchi': 'InChI=1S/H2O/h1H2',
        'source': 'local',
        'structureImage': '',
    }],
    'CaCO3': [{
        'cid': 0,
        'title': 'Calcium Carbonate',
        'molecularFormula': 'CaCO3',
        'molecularWeight': 100.087,
        'iupacName': 'calcium carbonate',
        'smiles': '[Ca+2].[O-]C([O-])=O',
        'inchi': 'InChI=1S/CH2O3.Ca/c2-1(3)4;/h(H2,2,3,4);/q;+2/p-2',
        'source': 'local',
        'structureImage': '',
    }],
    'C6H13NO2': [{
        'cid': 0,
        'title': 'Leucine',
        'molecularFormula': 'C6H13NO2',
        'molecularWeight': 131.17,
        'iupacName': '2-amino-4-methylpentanoic acid',
        'smiles': 'CC(C)CC(N)C(=O)O',
        'inchi': '',
        'source': 'local',
        'structureImage': '',
    }],
    'C5H11NO2': [{
        'cid': 0,
        'title': 'Valine',
        'molecularFormula': 'C5H11NO2',
        'molecularWeight': 117.15,
        'iupacName': '2-amino-3-methylbutanoic acid',
        'smiles': 'CC(C)C(N)C(=O)O',
        'inchi': '',
        'source': 'local',
        'structureImage': '',
    }],
    'C4H9NO2': [{
        'cid': 0,
        'title': 'GABA',
        'molecularFormula': 'C4H9NO2',
        'molecularWeight': 103.12,
        'iupacName': '4-aminobutanoic acid',
        'smiles': 'NCCCC(=O)O',
        'inchi': '',
        'source': 'local',
        'structureImage': '',
    }],
    'C6H12O6': [{
        'cid': 5793,
        'title': 'D-Glucose',
        'molecularFormula': 'C6H12O6',
        'molecularWeight': 180.156,
        'iupacName': '(3R,4S,5S,6R)-6-(hydroxymethyl)oxane-2,3,4,5-tetrol',
        'smiles': 'O[C@H]1[C@H](O)[C@H](O)[C@H](O)C(CO)O1',
        'inchi': 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2',
        'source': 'local',
        'structureImage': '',
    }],
    'CO2': [{
        'cid': 280,
        'title': 'Carbon Dioxide',
        'molecularFormula': 'CO2',
        'molecularWeight': 44.009,
        'iupacName': 'carbon dioxide',
        'smiles': 'O=C=O',
        'inchi': 'InChI=1S/CO2/c2-1-3',
        'source': 'local',
        'structureImage': '',
    }],
    'NH3': [{
        'cid': 222,
        'title': 'Ammonia',
        'molecularFormula': 'NH3',
        'molecularWeight': 17.031,
        'iupacName': 'ammonia',
        'smiles': 'N',
        'inchi': 'InChI=1S/H3N/h1H3',
        'source': 'local',
        'structureImage': '',
    }],
    'NaCl': [{
        'cid': 5234,
        'title': 'Sodium Chloride',
        'molecularFormula': 'NaCl',
        'molecularWeight': 58.443,
        'iupacName': 'sodium chloride',
        'smiles': '[Na+].[Cl-]',
        'inchi': 'InChI=1S/ClH.Na/h1H;/q;+1/p-1',
        'source': 'local',
        'structureImage': '',
    }],
    'NaOH': [{
        'cid': 14798,
        'title': 'Sodium Hydroxide',
        'molecularFormula': 'NaOH',
        'molecularWeight': 39.997,
        'iupacName': 'sodium hydroxide',
        'smiles': '[OH-].[Na+]',
        'inchi': 'InChI=1S/Na.H2O/h;1H2/q+1;/p-1',
        'source': 'local',
        'structureImage': '',
    }],
    'HCl': [{
        'cid': 313,
        'title': 'Hydrochloric Acid',
        'molecularFormula': 'HCl',
        'molecularWeight': 36.461,
        'iupacName': 'hydrochloric acid',
        'smiles': 'Cl',
        'inchi': 'InChI=1S/ClH/h1H',
        'source': 'local',
        'structureImage': '',
    }],
    'H2SO4': [{
        'cid': 1118,
        'title': 'Sulfuric Acid',
        'molecularFormula': 'H2SO4',
        'molecularWeight': 98.079,
        'iupacName': 'sulfuric acid',
        'smiles': 'OS(=O)(=O)O',
        'inchi': 'InChI=1S/H2O4S/c1-5(2,3)4/h(H2,1,2,3,4)',
        'source': 'local',
        'structureImage': '',
    }],
    'C2H6O': [{
        'cid': 702,
        'title': 'Ethanol',
        'molecularFormula': 'C2H6O',
        'molecularWeight': 46.068,
        'iupacName': 'ethanol',
        'smiles': 'CCO',
        'inchi': 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3',
        'source': 'local',
        'structureImage': '',
    }],
    'C2H4O2': [{
        'cid': 176,
        'title': 'Acetic Acid',
        'molecularFormula': 'C2H4O2',
        'molecularWeight': 60.052,
        'iupacName': 'acetic acid',
        'smiles': 'CC(=O)O',
        'inchi': 'InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)',
        'source': 'local',
        'structureImage': '',
    }],
    'C8H9NO2': [{
        'cid': 1983,
        'title': 'Paracetamol',
        'molecularFormula': 'C8H9NO2',
        'molecularWeight': 151.163,
        'iupacName': 'N-(4-hydroxyphenyl)ethanamide',
        'smiles': 'CC(=O)NC1=CC=C(C=C1)O',
        'inchi': 'InChI=1S/C8H9NO2/c1-6(10)9-7-2-4-8(11)5-3-7/h2-5,11H,1H3,(H,9,10)',
        'source': 'local',
        'structureImage': '',
    }],
    'C13H18O2': [{
        'cid': 3672,
        'title': 'Ibuprofen',
        'molecularFormula': 'C13H18O2',
        'molecularWeight': 206.281,
        'iupacName': '2-[4-(2-methylpropyl)phenyl]propanoic acid',
        'smiles': 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O',
        'inchi': 'InChI=1S/C13H18O2/c1-9(2)8-10-4-6-11(7-5-10)12(3)13(14)15/h4-7,9,12H,8H2,1-3H3,(H,14,15)',
        'source': 'local',
        'structureImage': '',
    }],
    'C12H22O11': [{
        'cid': 5988,
        'title': 'Sucrose',
        'molecularFormula': 'C12H22O11',
        'molecularWeight': 342.297,
        'iupacName': 'sucrose',
        'smiles': '',
        'inchi': '',
        'source': 'local',
        'structureImage': '',
    }],
}

# ============================================================
# HTTP REQUEST HELPERS
# ============================================================

import requests
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

async def _fetch_text(url: str) -> Optional[str]:
    """Fetch text from URL with timeout."""
    def _sync_fetch():
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": "ChemLab-Kenya/1.0"})
            if response.status_code == 200:
                return response.text.strip()
            return None
        except Exception:
            return None
    
    return await asyncio.to_thread(_sync_fetch)

async def _fetch_json(url: str) -> Optional[Dict]:
    """Fetch JSON from URL with timeout."""
    def _sync_fetch():
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": "ChemLab-Kenya/1.0", "Accept": "application/json"})
            if response.status_code == 200:
                return response.json()
            return None
        except Exception:
            return None
    
    return await asyncio.to_thread(_sync_fetch)

# ============================================================
# PROVIDER: WIKIDATA SPARQL
# ============================================================

async def _search_wikidata(formula: str) -> Optional[List[Dict]]:
    """Search Wikidata SPARQL for compounds by formula."""
    print(f"📚 Wikidata: Searching formula {formula}")
    await _wait_for_wikidata()
    
    query = f"""
    SELECT ?item ?itemLabel ?smiles ?inchi ?iupacName ?molarMass ?pubchemCid WHERE {{
      ?item wdt:P274 "{formula}".
      OPTIONAL {{ ?item wdt:P233 ?smiles. }}
      OPTIONAL {{ ?item wdt:P234 ?inchi. }}
      OPTIONAL {{ ?item wdt:P2017 ?iupacName. }}
      OPTIONAL {{ ?item wdt:P2067 ?molarMass. }}
      OPTIONAL {{ ?item wdt:P662 ?pubchemCid. }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    LIMIT 10
    """
    
    url = f"{WIKIDATA_SPARQL}?format=json&query={query}"
    data = await _fetch_json(url)
    
    if not data:
        return None
    
    bindings = data.get("results", {}).get("bindings", [])
    if not bindings:
        return None
    
    results = []
    for row in bindings:
        qid = row.get("item", {}).get("value", "").split("/")[-1] if row.get("item") else ""
        pubchem_cid = row.get("pubchemCid", {}).get("value", "")
        
        results.append({
            "cid": int(pubchem_cid) if pubchem_cid else 0,
            "title": row.get("itemLabel", {}).get("value", qid),
            "molecularFormula": formula,
            "molecularWeight": float(row.get("molarMass", {}).get("value", 0) or 0),
            "iupacName": row.get("iupacName", {}).get("value", "Not available"),
            "smiles": row.get("smiles", {}).get("value", ""),
            "inchi": row.get("inchi", {}).get("value", ""),
            "source": "Wikidata",
            "sourceId": qid,
            "structureImage": "",
        })
    
    return results

# ============================================================
# PROVIDER: WIKIPEDIA
# ============================================================

async def _search_wikipedia(formula: str) -> Optional[List[Dict]]:
    """Search Wikipedia for compounds by formula."""
    print(f"📚 Wikipedia: Searching formula {formula}")
    await _wait_for_wikipedia()
    
    # Search for pages containing the formula
    search_url = f"{WIKIPEDIA_API}?action=query&list=search&srsearch={formula} chemical compound&format=json&srlimit=10"
    data = await _fetch_json(search_url)
    
    if not data:
        return None
    
    results = []
    for page in data.get("query", {}).get("search", []):
        title = page.get("title")
        
        # Get page content
        content_url = f"{WIKIPEDIA_API}?action=query&prop=revisions&rvprop=content&format=json&titles={title}"
        content_data = await _fetch_json(content_url)
        
        if not content_data:
            continue
        
        pages = content_data.get("query", {}).get("pages", {})
        page_id = list(pages.keys())[0]
        if page_id == "-1":
            continue
        
        wikitext = pages[page_id].get("revisions", [{}])[0].get("*", "")
        if not wikitext:
            continue
        
        # Check if formula matches
        formula_match = re.search(r"\|\s*formula\s*=\s*([^\n\|}]+)", wikitext, re.IGNORECASE)
        if not formula_match:
            continue
        
        page_formula = formula_match.group(1).strip().replace(" ", "").upper()
        if page_formula != formula:
            continue
        
        # Extract SMILES
        smiles_match = re.search(r"\|\s*SMILES\s*=\s*([^\n\|}]+)", wikitext, re.IGNORECASE)
        smiles = ""
        if smiles_match:
            raw = smiles_match.group(1).strip()
            raw = re.sub(r"\{\{.*?\}\}", "", raw)
            raw = re.sub(r"<ref.*?>.*?</ref>", "", raw)
            raw = re.sub(r"<!--.*?-->", "", raw)
            smiles = raw.split("<br")[0].strip()
        
        # Extract IUPAC
        iupac_match = re.search(r"\|\s*IUPAC\s*name\s*=\s*([^\n\|}]+)", wikitext, re.IGNORECASE)
        iupac = iupac_match.group(1).strip() if iupac_match else title
        
        # Extract molar mass
        mass_match = re.search(r"\|\s*molar\s*mass\s*=\s*([^\n\|}]+)", wikitext, re.IGNORECASE)
        mass = 0
        if mass_match:
            mass_str = mass_match.group(1).strip()
            mass_num = re.search(r"([\d.]+)", mass_str)
            if mass_num:
                mass = float(mass_num[1])
        
        if smiles:
            results.append({
                "cid": 0,
                "title": title,
                "molecularFormula": formula,
                "molecularWeight": mass,
                "iupacName": iupac,
                "smiles": smiles,
                "inchi": "",
                "source": "Wikipedia",
                "sourceId": page_id,
                "structureImage": "",
            })
    
    return results if results else None

# ============================================================
# PROVIDER: CACTUS
# ============================================================

COMMON_NAMES = {
    'C6H13NO2': 'Leucine',
    'C5H11NO2': 'Valine',
    'C4H9NO2': 'GABA',
    'C3H7NO2': 'Alanine',
    'C4H7NO4': 'Aspartic acid',
    'C5H9NO4': 'Glutamic acid',
    'C6H14N2O2': 'Lysine',
    'C6H13N3O2': 'Arginine',
}

async def _search_cactus(formula: str) -> Optional[List[Dict]]:
    """Search CACTUS by formula (via common names)."""
    name = COMMON_NAMES.get(formula)
    if not name:
        return None
    
    print(f"🌵 CACTUS: Trying to resolve '{name}' from formula {formula}")
    await _wait_for_cactus()
    
    encoded_name = name.replace(" ", "%20")
    
    # Get SMILES
    smiles = await _fetch_text(f"{CACTUS_BASE}/{encoded_name}/smiles")
    if not smiles:
        return None
    
    # Get molecular weight
    mw_text = await _fetch_text(f"{CACTUS_BASE}/{encoded_name}/mw")
    mw = float(mw_text) if mw_text else 0
    
    return [{
        "cid": 0,
        "title": name,
        "molecularFormula": formula,
        "molecularWeight": mw,
        "iupacName": name,
        "smiles": smiles,
        "inchi": "",
        "source": "CACTUS",
        "sourceId": "",
        "structureImage": f"{CACTUS_BASE}/{encoded_name}/image",
    }]

# ============================================================
# PROVIDER: PUBCHEM (Last Resort)
# ============================================================

async def _search_pubchem(formula: str) -> Optional[List[Dict]]:
    """Search PubChem by formula (last resort)."""
    print(f"🧪 PubChem: Searching formula {formula}")
    await _wait_for_pubchem()
    
    cid_url = f"{PUBCHEM_BASE}/compound/fastformula/{quote(formula)}/cids/JSON"
    cid_data = await _fetch_json(cid_url)
    
    if not cid_data:
        return None
    
    cids = cid_data.get("IdentifierList", {}).get("CID", [])
    if not cids:
        return None
    
    limited_cids = cids[:20]
    cid_list = ",".join(str(cid) for cid in limited_cids)
    
    prop_url = f"{PUBCHEM_BASE}/compound/cid/{cid_list}/property/Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON"
    prop_data = await _fetch_json(prop_url)
    
    if not prop_data:
        return None
    
    props = prop_data.get("PropertyTable", {}).get("Properties", [])
    
    results = []
    for item in props:
        results.append({
            "cid": int(item.get("CID", 0)),
            "title": item.get("Title", "Unnamed"),
            "molecularFormula": item.get("MolecularFormula", formula),
            "molecularWeight": float(item.get("MolecularWeight", 0) or 0),
            "iupacName": item.get("IUPACName", "Not available"),
            "smiles": item.get("CanonicalSMILES", ""),
            "inchi": "",
            "source": "PubChem",
            "sourceId": str(item.get("CID", "")),
            "structureImage": "",
        })
    
    return results

# ============================================================
# MAIN PUBLIC FUNCTION
# ============================================================

_memory_cache: Dict[str, List[Dict]] = {}

async def search_by_formula(formula: str) -> Optional[List[Dict]]:
    """
    Search for compounds by molecular formula.
    
    Sources (in order):
    1. Memory Cache
    2. File Cache
    3. Local Database
    4. Wikidata SPARQL
    5. Wikipedia
    6. CACTUS (via common names)
    7. PubChem (last resort)
    """
    clean_formula = formula.strip().upper()
    
    if not clean_formula:
        return None
    
    print(f"\n🔎 ===== FORMULA SEARCH: {clean_formula} =====")
    
    # ----- TIER 1: Memory Cache -----
    if clean_formula in _memory_cache:
        print(f"💾 Memory cache hit: {clean_formula}")
        return _memory_cache[clean_formula]
    
    # ----- TIER 2: File Cache -----
    cached = _cache_get(clean_formula)
    if cached:
        print(f"💾 File cache hit: {clean_formula}")
        _memory_cache[clean_formula] = cached
        return cached
    
    # ----- TIER 3: Local Database -----
    if clean_formula in LOCAL_FORMULAS:
        print(f"📦 Local database match: {clean_formula}")
        _memory_cache[clean_formula] = LOCAL_FORMULAS[clean_formula]
        _cache_set(clean_formula, LOCAL_FORMULAS[clean_formula])
        return LOCAL_FORMULAS[clean_formula]
    
    # ----- TIER 4: Wikidata -----
    print("➡️ Trying WIKIDATA...")
    result = await _search_wikidata(clean_formula)
    if result:
        print(f"✅ Wikidata: {len(result)} candidates")
        _memory_cache[clean_formula] = result
        _cache_set(clean_formula, result)
        return result
    
    # ----- TIER 5: Wikipedia -----
    print("➡️ Trying WIKIPEDIA...")
    result = await _search_wikipedia(clean_formula)
    if result:
        print(f"✅ Wikipedia: {len(result)} candidates")
        _memory_cache[clean_formula] = result
        _cache_set(clean_formula, result)
        return result
    
    # ----- TIER 6: CACTUS -----
    print("➡️ Trying CACTUS...")
    result = await _search_cactus(clean_formula)
    if result:
        print(f"✅ CACTUS: {len(result)} candidates")
        _memory_cache[clean_formula] = result
        _cache_set(clean_formula, result)
        return result
    
    # ----- TIER 7: PubChem -----
    print("➡️ Trying PUBCHEM...")
    result = await _search_pubchem(clean_formula)
    if result:
        print(f"✅ PubChem: {len(result)} candidates")
        _memory_cache[clean_formula] = result
        _cache_set(clean_formula, result)
        return result
    
    print(f"❌ All providers failed for {clean_formula}")
    return None

# ============================================================
# CACHE MANAGEMENT
# ============================================================

def clear_formula_cache():
    """Clear all formula search caches."""
    _memory_cache.clear()
    for f in os.listdir(CACHE_DIR):
        if f.startswith("formula_"):
            os.remove(os.path.join(CACHE_DIR, f))
    print("🗑️ Formula cache cleared")

def get_formula_cache_stats() -> Dict:
    """Get formula cache statistics."""
    files = [f for f in os.listdir(CACHE_DIR) if f.startswith("formula_")]
    return {
        "memory_cache_count": len(_memory_cache),
        "file_cache_count": len(files)
    }