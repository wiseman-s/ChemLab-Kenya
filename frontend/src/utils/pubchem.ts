// src/utils/pubchem.ts
const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const AUTOCOMPLETE = 'https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound';

export type SearchMode = 'auto' | 'name' | 'formula' | 'smiles' | 'cid';

export interface Compound {
  cid: number;
  title: string;
  molecularFormula: string;
  molecularWeight: string;
  iupacName: string;
  smiles: string;
  inchiKey: string;
  exactMass?: string;
  xlogp?: number;
  tpsa?: number;
  hbd?: number;
  hba?: number;
  rotatableBonds?: number;
  charge?: number;
  complexity?: number;
}

export interface CompoundExtras {
  synonyms: string[];
  description: string;
}

export class SearchError extends Error {
  suggestions: string[];
  constructor(message: string, suggestions: string[] = []) {
    super(message);
    this.suggestions = suggestions;
    Object.setPrototypeOf(this, SearchError.prototype);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Returns parsed JSON, or null when PubChem says "not found / bad input". */
async function getJson(url: string, init?: RequestInit): Promise<any | null> {
  const res = await fetch(url, init);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) {
    throw new SearchError(`PubChem is unavailable right now (${res.status}). Please try again.`);
  }
  return res.json();
}

/** Some searches (formula, etc.) are async and return a ListKey to poll. */
async function resolveCids(json: any): Promise<number[]> {
  if (!json) return [];
  if (json.IdentifierList?.CID) return json.IdentifierList.CID;

  const key = json.Waiting?.ListKey;
  if (!key) return [];

  for (let i = 0; i < 10; i++) {
    await sleep(1000);
    const next = await getJson(`${BASE}/compound/listkey/${key}/cids/JSON`);
    if (next?.IdentifierList?.CID) return next.IdentifierList.CID;
    if (!next?.Waiting) return [];
  }
  throw new SearchError('The search took too long. Try a more specific query.');
}

const looksLikeFormula = (q: string) =>
  /^([A-Z][a-z]?\d*){2,}$/.test(q) || /^[A-Z][a-z]?\d+$/.test(q);

const looksLikeSmiles = (q: string) =>
  !/\s/.test(q) && /[=#\[\]@\\/]|^[A-Za-z]*\d/.test(q) && /^[A-Za-z0-9@+\-\[\]()\\/=#%.:*$]+$/.test(q);

async function searchByName(q: string): Promise<number[]> {
  // 1) Exact name / synonym / CAS match (PubChem does the matching)
  const exact = await getJson(
    `${BASE}/compound/name/${encodeURIComponent(q)}/cids/JSON?MaxRecords=10`
  );
  const exactCids = await resolveCids(exact);
  if (exactCids.length) return exactCids;

  // 2) Word-based fallback for partial names
  const words = await getJson(
    `${BASE}/compound/name/${encodeURIComponent(q)}/cids/JSON?name_type=word&MaxRecords=10`
  );
  return resolveCids(words);
}

async function searchByFormula(q: string): Promise<number[]> {
  const json = await getJson(
    `${BASE}/compound/fastformula/${encodeURIComponent(q)}/cids/JSON?MaxRecords=12`
  );
  return resolveCids(json);
}

async function searchBySmiles(q: string): Promise<number[]> {
  // POST is recommended because SMILES contain characters like / and #
  const json = await getJson(`${BASE}/compound/smiles/cids/JSON`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `smiles=${encodeURIComponent(q)}`,
  });
  return resolveCids(json);
}

export async function getSuggestions(term: string): Promise<string[]> {
  try {
    const json = await getJson(`${AUTOCOMPLETE}/${encodeURIComponent(term)}/json?limit=6`);
    return json?.dictionary_terms?.compound ?? [];
  } catch {
    return [];
  }
}

export async function fetchCompounds(cids: number[]): Promise<Compound[]> {
  const props = [
    'Title', 'MolecularFormula', 'MolecularWeight', 'IUPACName',
    'SMILES', 'ConnectivitySMILES', 'InChIKey', 'ExactMass',
    'XLogP', 'TPSA', 'HBondDonorCount', 'HBondAcceptorCount',
    'RotatableBondCount', 'Charge', 'Complexity',
  ].join(',');

  const json = await getJson(`${BASE}/compound/cid/${cids.join(',')}/property/${props}/JSON`);
  const rows: any[] = json?.PropertyTable?.Properties ?? [];

  const compounds = rows.map((p): Compound => ({
    cid: p.CID,
    title: p.Title ?? p.IUPACName ?? `CID ${p.CID}`,
    molecularFormula: p.MolecularFormula ?? '',
    molecularWeight: p.MolecularWeight ?? '',
    iupacName: p.IUPACName ?? 'Not available',
    // PubChem renamed SMILES fields; accept old and new names
    smiles: p.SMILES ?? p.ConnectivitySMILES ?? p.CanonicalSMILES ?? p.IsomericSMILES ?? '',
    inchiKey: p.InChIKey ?? '',
    exactMass: p.ExactMass,
    xlogp: p.XLogP,
    tpsa: p.TPSA,
    hbd: p.HBondDonorCount,
    hba: p.HBondAcceptorCount,
    rotatableBonds: p.RotatableBondCount,
    charge: p.Charge,
    complexity: p.Complexity,
  }));

  // Keep PubChem's relevance order
  return compounds.sort((a, b) => cids.indexOf(a.cid) - cids.indexOf(b.cid));
}

export async function searchCompounds(query: string, mode: SearchMode): Promise<Compound[]> {
  const q = query.trim();
  let cids: number[] = [];

  switch (mode) {
    case 'cid':
      cids = /^\d+$/.test(q) ? [Number(q)] : [];
      break;
    case 'formula':
      cids = await searchByFormula(q);
      break;
    case 'smiles':
      cids = await searchBySmiles(q);
      break;
    case 'name':
      cids = await searchByName(q);
      break;
    default: {
      // auto-detect
      if (/^\d+$/.test(q)) cids = [Number(q)];
      else if (looksLikeFormula(q)) {
        cids = await searchByFormula(q);
        if (!cids.length) cids = await searchByName(q);
      } else {
        cids = await searchByName(q);
        if (!cids.length && looksLikeSmiles(q)) cids = await searchBySmiles(q);
      }
    }
  }

  if (!cids.length) {
    const suggestions = mode === 'name' || mode === 'auto' ? await getSuggestions(q) : [];
    throw new SearchError(`No compound found for "${q}".`, suggestions);
  }

  const compounds = await fetchCompounds(cids);
  if (!compounds.length) throw new SearchError(`No compound data found for "${q}".`);
  return compounds;
}

export async function fetchExtras(cid: number): Promise<CompoundExtras> {
  const [syn, desc] = await Promise.all([
    getJson(`${BASE}/compound/cid/${cid}/synonyms/JSON`).catch(() => null),
    getJson(`${BASE}/compound/cid/${cid}/description/JSON`).catch(() => null),
  ]);

  const synonyms: string[] = syn?.InformationList?.Information?.[0]?.Synonym?.slice(0, 12) ?? [];
  const description: string =
    desc?.InformationList?.Information?.find((i: any) => i.Description)?.Description ?? '';

  return { synonyms, description };
}

export const structureImageUrl = (cid: number) =>
  `${BASE}/compound/cid/${cid}/PNG?image_size=300x300`;

export const pubchemPageUrl = (cid: number) =>
  `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
