// src/services/formulaIdentifier.ts

export interface FormulaCompound {
  cid: number;
  title: string;
  molecularFormula: string;
  molecularWeight: number;
  iupacName: string;
  smiles: string;
  structureImage: string;
}

interface FormulaSearchResponse {
  formula: string;
  compounds: FormulaCompound[];
  source: string | null;
  providerAvailable: boolean;
  error: string | null;
}

// ============================================================
// SIMPLIFIED VALIDATION
// ============================================================

function normalizeFormula(formula: string): string {
  return formula
    .replace(/\s+/g, '')
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₄/g, '4')
    .replace(/₅/g, '5')
    .replace(/₆/g, '6')
    .replace(/₇/g, '7')
    .replace(/₈/g, '8')
    .replace(/₉/g, '9');
}

function validateFormula(formula: string): string {
  const clean = normalizeFormula(formula);

  if (!clean) {
    throw new Error('Please enter a molecular formula.');
  }

  if (!/^[A-Z(]/.test(clean)) {
    throw new Error('A molecular formula must begin with an element symbol or "(", e.g. H2O, C2H6O, or (NH4)2SO4.');
  }

  if (!/^[A-Za-z0-9()]+$/.test(clean)) {
    throw new Error('Formula contains unsupported characters.');
  }

  let depth = 0;
  for (const char of clean) {
    if (char === '(') depth++;
    if (char === ')') {
      depth--;
      if (depth < 0) {
        throw new Error('Mismatched parentheses in molecular formula.');
      }
    }
  }
  if (depth !== 0) {
    throw new Error('Mismatched parentheses in molecular formula.');
  }

  return clean;
}

// ============================================================
// MAIN SEARCH FUNCTION - CALLS BACKEND ONLY!
// ============================================================

export async function searchByFormula(formula: string): Promise<FormulaCompound[]> {
  const cleanFormula = validateFormula(formula);
  console.log(`🧪 Formula search (backend): ${cleanFormula}`);

  // ✅ ALL external calls go through your backend!
  const response = await fetch(
    `/api/compound/formula?formula=${encodeURIComponent(cleanFormula)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(error.error || 'Chemical search failed');
  }

  const data: FormulaSearchResponse = await response.json();

  if (!data.providerAvailable) {
    console.warn('⚠️ Formula search provider unavailable');
    return [];
  }

  return data.compounds || [];
}

// ============================================================
// FORMULA DETECTION
// ============================================================

export function looksLikeMolecularFormula(value: string): boolean {
  try {
    validateFormula(value);
    return true;
  } catch {
    return false;
  }
}