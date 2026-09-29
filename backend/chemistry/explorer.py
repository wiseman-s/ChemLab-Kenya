# backend/chemistry/explorer.py
import asyncio
import re
from typing import Dict, List, Tuple, Optional
from urllib.parse import quote

from .pubchem import (
    PUBCHEM_BASE, CACTUS_BASE, CHEMBL_BASE,
    _get_json, _get_text, _cache_get, _cache_set,
    _search_local, _names_to_try, _search_wikipedia,
    _is_provider_available, _record_success, _record_failure,
)

WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary"
AUTOCOMPLETE = "https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound"
UA = {"User-Agent": "ChemLab-Kenya/1.0 (contact: your-real-email@chemlab.co.ke)"}


class NotFound(Exception):
    def __init__(self, msg, suggestions=None):
        super().__init__(msg)
        self.suggestions = suggestions or []


class Unavailable(Exception):
    pass


class ProviderError(Exception):
    pass


def _compound(**kw) -> Dict:
    base = dict(
        id="", cid=0, title="", molecularFormula="", molecularWeight="",
        iupacName="Not available", smiles="", inchiKey="", exactMass=None,
        xlogp=None, tpsa=None, hbd=None, hba=None, rotatableBonds=None,
        charge=None, complexity=None, synonyms=[], description="", source="",
    )
    base.update(kw)
    return base


def _fill_formula(c: Dict):
    """Compute formula/weight from SMILES when a provider gave none or a messy one."""
    f = c["molecularFormula"]
    if f and f != "Not available" and "{" not in f and "<" not in f:
        return
    c["molecularFormula"] = ""
    if not c["smiles"]:
        return
    try:
        from rdkit import Chem
        from rdkit.Chem import Descriptors, rdMolDescriptors
        m = Chem.MolFromSmiles(c["smiles"])
        if m:
            c["molecularFormula"] = rdMolDescriptors.CalcMolFormula(m)
            c["molecularWeight"] = str(round(Descriptors.MolWt(m), 3))
    except Exception:
        pass


# ---------- Providers: return a list ([] = not found); raise ProviderError = unavailable ----------

_PROPS_NEW = ("Title,MolecularFormula,MolecularWeight,IUPACName,SMILES,ConnectivitySMILES,"
              "InChIKey,ExactMass,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,"
              "RotatableBondCount,Charge,Complexity")
_PROPS_OLD = _PROPS_NEW.replace("SMILES,ConnectivitySMILES", "CanonicalSMILES,IsomericSMILES")


async def _pc_cids(q: str, mode: str) -> List[int]:
    if mode == "cid":
        return [int(q)] if q.isdigit() else []

    enc = quote(q, safe="")
    if mode == "formula":
        url = f"{PUBCHEM_BASE}/compound/fastformula/{enc}/cids/JSON?MaxRecords=12"
    elif mode == "smiles":
        url = f"{PUBCHEM_BASE}/compound/smiles/cids/JSON?smiles={enc}"
    else:
        url = f"{PUBCHEM_BASE}/compound/name/{enc}/cids/JSON?MaxRecords=10"

    data = await _get_json(url, provider="pubchem")
    if data is None:
        raise ProviderError("pubchem")

    key = (data.get("Waiting") or {}).get("ListKey")
    for _ in range(6):  # async searches (formula) return a ListKey to poll
        if not key:
            break
        await asyncio.sleep(1)
        data = await _get_json(f"{PUBCHEM_BASE}/compound/listkey/{key}/cids/JSON", provider="pubchem")
        if data is None:
            raise ProviderError("pubchem")
        if not data or "IdentifierList" in data:
            break

    cids = (data.get("IdentifierList") or {}).get("CID", [])

    if not cids and mode == "name":  # partial-name fallback
        data = await _get_json(f"{url}&name_type=word", provider="pubchem")
        if data is None:
            raise ProviderError("pubchem")
        cids = (data.get("IdentifierList") or {}).get("CID", [])

    return [c for c in cids if c]


async def _pubchem(q: str, mode: str) -> List[Dict]:
    cids = await _pc_cids(q, mode)
    if not cids:
        return []

    cid_list = ",".join(str(c) for c in cids)
    data = await _get_json(f"{PUBCHEM_BASE}/compound/cid/{cid_list}/property/{_PROPS_NEW}/JSON", provider="pubchem")
    if data is not None and not data:  # property names rejected: retry with the older names
        data = await _get_json(f"{PUBCHEM_BASE}/compound/cid/{cid_list}/property/{_PROPS_OLD}/JSON", provider="pubchem")
    if data is None:
        raise ProviderError("pubchem")

    by_cid = {p["CID"]: p for p in (data.get("PropertyTable") or {}).get("Properties", [])}
    out = []
    for cid in cids:  # keep relevance order
        p = by_cid.get(cid)
        if not p:
            continue
        out.append(_compound(
            id=f"pubchem:{cid}", cid=cid,
            title=p.get("Title") or p.get("IUPACName") or f"CID {cid}",
            molecularFormula=p.get("MolecularFormula", ""),
            molecularWeight=str(p.get("MolecularWeight", "")),
            iupacName=p.get("IUPACName", "Not available"),
            smiles=(p.get("SMILES") or p.get("IsomericSMILES")
                    or p.get("ConnectivitySMILES") or p.get("CanonicalSMILES") or ""),
            inchiKey=p.get("InChIKey", ""),
            exactMass=p.get("ExactMass"), xlogp=p.get("XLogP"), tpsa=p.get("TPSA"),
            hbd=p.get("HBondDonorCount"), hba=p.get("HBondAcceptorCount"),
            rotatableBonds=p.get("RotatableBondCount"), charge=p.get("Charge"),
            complexity=p.get("Complexity"), source="pubchem",
        ))
    return out


async def _cactus_get(ident: str, prop: str) -> Optional[str]:
    status, body = await _get_text(f"{CACTUS_BASE}/{quote(ident, safe='')}/{prop}", provider="cactus")
    if status == 0 or status >= 500:
        raise ProviderError("cactus")
    body = (body or "").strip()
    if status != 200 or not body or "<html" in body.lower():
        return None
    return body


async def _cactus(q: str, mode: str) -> List[Dict]:
    names = _names_to_try(q.lower()) if mode == "name" else [q]
    for n in names:
        smiles = await _cactus_get(n, "smiles")
        if not smiles:
            continue
        formula = await _cactus_get(n, "formula") or ""
        mw = await _cactus_get(n, "mw") or ""
        iupac = await _cactus_get(n, "iupac_name") or "Not available"
        title = n.title() if mode == "name" else (iupac if iupac != "Not available" else n)
        return [_compound(
            id=f"cactus:{n}", title=title, molecularFormula=formula, molecularWeight=mw,
            iupacName=iupac, smiles=smiles, source="cactus",
        )]
    return []


async def _chembl(q: str, mode: str) -> List[Dict]:
    if mode != "name":
        return []
    data = await _get_json(f"{CHEMBL_BASE}/molecule/search.json?q={quote(q)}", provider="chembl")
    if data is None:
        raise ProviderError("chembl")

    ql = q.lower()
    for m in data.get("molecules", []):
        names = {(m.get("pref_name") or "").lower()}
        names |= {(s.get("molecule_synonym") or "").lower() for s in (m.get("molecule_synonyms") or [])}
        if ql not in names:  # exact only: ChEMBL search is fuzzy
            continue
        st = m.get("molecule_structures") or {}
        pr = m.get("molecule_properties") or {}
        if not st.get("canonical_smiles"):
            continue
        return [_compound(
            id=f"chembl:{m.get('molecule_chembl_id')}", title=(m.get("pref_name") or q).title(),
            molecularFormula=pr.get("full_molformula") or "", molecularWeight=str(pr.get("full_mwt") or ""),
            smiles=st["canonical_smiles"], inchiKey=st.get("standard_inchi_key") or "", source="chembl",
        )]
    return []


async def _wikipedia(q: str, mode: str) -> List[Dict]:
    if mode != "name":
        return []
    r = await _search_wikipedia(q.lower())
    if not r:
        return []
    return [_compound(
        id=f"wikipedia:{r['sourceId']}", title=r["title"], molecularFormula=r["molecularFormula"],
        iupacName=r["title"], smiles=r["smiles"], source="wikipedia",
    )]


CHAINS = {
    "name": [("pubchem", _pubchem), ("cactus", _cactus), ("chembl", _chembl), ("wikipedia", _wikipedia)],
    "formula": [("pubchem", _pubchem)],
    "smiles": [("pubchem", _pubchem), ("cactus", _cactus)],
    "cid": [("pubchem", _pubchem)],
}

_FORMULA_RE = re.compile(r"^([A-Z][a-z]?\d*){2,}$|^[A-Z][a-z]?\d+$")
_SMILES_RE = re.compile(r"[=#\[\]@\\/()]|\d")


def _modes(q: str, mode: str) -> List[str]:
    if mode != "auto":
        return [mode]
    if q.isdigit():
        return ["cid"]
    if _FORMULA_RE.match(q):
        # "CCO" is a valid formula-looking string AND a SMILES, so try name, SMILES, then formula
        return ["name", "smiles", "formula"]
    if " " not in q and _SMILES_RE.search(q) and not re.fullmatch(r"[\d-]+", q):
        return ["name", "smiles"]
    return ["name"]


async def _run_chain(q: str, mode: str) -> Tuple[List[Dict], bool]:
    """Returns (results, every_provider_failed)."""
    chain = CHAINS[mode]
    failed = 0
    for name, fn in chain:
        if not _is_provider_available(name):
            failed += 1
            continue
        try:
            res = await fn(q, mode)
            _record_success(name)
        except Exception as e:
            print(f"{name} failed: {e}")
            _record_failure(name)
            failed += 1
            continue
        if res:
            return res, False
    return [], failed == len(chain)


async def _enrich(c: Dict):
    """Best-effort synonyms and description for the top result."""
    try:
        if c["source"] == "pubchem" and c["cid"] and _is_provider_available("pubchem"):
            d = await _get_json(f"{PUBCHEM_BASE}/compound/cid/{c['cid']}/synonyms/JSON", provider="pubchem")
            info = ((d or {}).get("InformationList") or {}).get("Information") or [{}]
            c["synonyms"] = info[0].get("Synonym", [])[:12]
    except Exception:
        pass
    try:
        d = await _get_json(f"{WIKI_SUMMARY}/{quote(c['title'].replace(' ', '_'), safe='')}",
                            headers=UA, provider="wikipedia")
        if d and d.get("type") == "standard":
            c["description"] = d.get("extract", "")
    except Exception:
        pass


async def _suggestions(q: str) -> List[str]:
    if not _is_provider_available("pubchem"):
        return []
    try:
        d = await _get_json(f"{AUTOCOMPLETE}/{quote(q, safe='')}/json?limit=6", provider="pubchem")
        return ((d or {}).get("dictionary_terms") or {}).get("compound", [])
    except Exception:
        return []


async def _search(q: str, mode: str) -> Dict:
    flags: List[bool] = []
    for m in _modes(q, mode):
        if m == "name":
            local = _search_local(q.lower())
            if local:
                return {"results": [_compound(
                    id=f"local:{local['title']}", cid=local.get("cid", 0), title=local["title"],
                    molecularFormula=local["molecularFormula"], molecularWeight=str(local["molecularWeight"]),
                    iupacName=local["iupacName"], smiles=local["smiles"], source="local")]}

        results, all_failed = await _run_chain(q, m)
        flags.append(all_failed)
        if results:
            for c in results:
                _fill_formula(c)
            await _enrich(results[0])
            return {"results": results}

    if flags and all(flags):
        raise Unavailable()

    suggestions = await _suggestions(q) if mode in ("auto", "name") else []
    raise NotFound(f'No compound found for "{q}".', suggestions)


_inflight: Dict[str, asyncio.Task] = {}


async def explore(query: str, mode: str = "auto") -> Dict:
    q = query.strip()
    if not q:
        raise NotFound("Enter something to search for.")
    if mode not in ("auto", "name", "formula", "smiles", "cid"):
        mode = "auto"

    key = f"explore:{mode}:{q if mode in ('formula', 'smiles', 'auto') else q.lower()}"
    cached = _cache_get(key)
    if cached:
        return cached

    # Many students searching the same thing at once share a single lookup
    task = _inflight.get(key)
    if task is None:
        task = asyncio.create_task(_search(q, mode))
        _inflight[key] = task
        task.add_done_callback(lambda _t: _inflight.pop(key, None))

    data = await task
    _cache_set(key, data)
    return data
