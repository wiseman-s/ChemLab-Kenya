// src/api.ts
//
// Central place for all calls to the ChemLab Kenya backend.
// Import functions from this file anywhere in your React components,
// e.g.  import { analyzeMolecule, balanceEquation } from "./api";

const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ------------------------------------------------------------
// Shared types
// ------------------------------------------------------------

export interface MoleculeResponse {
  smiles: string;
  canonical_smiles: string;
  formula: string;
  molecular_weight: number;
  exact_molecular_weight: number;
  logp: number;
  tpsa: number;
  heavy_atoms: number;
  h_bond_donors: number;
  h_bond_acceptors: number;
  num_atoms: number;
  rotatable_bonds: number;
  ring_count: number;
  aromatic_rings: number;
  saturated_rings: number;
  aliphatic_rings: number;
  fraction_csp3: number;
  num_heteroatoms: number;
  num_stereocenters: number;
  valence_electrons: number;
  formal_charge: number;
  molar_refractivity: number;
  inchi: string | null;
  inchi_key: string | null;
  qed_score: number;
  lipinski_violations: number;
  lipinski_pass: boolean;
  error: string | null;
}

export interface Generate3DResponse {
  smiles?: string;
  molblock?: string;
  num_atoms?: number;
  error?: string | null;
}

export interface BalancedCompound {
  formula: string;
  coefficient: number;
}

export interface BalanceEquationResponse {
  balanced_equation: string;
  reactants: BalancedCompound[];
  products: BalancedCompound[];
  error: string | null;
}

export interface CompoundResult {
  [key: string]: any; // backend returns a flexible/varying shape per provider
}

export interface CompoundByFormulaResponse {
  formula: string;
  compounds: CompoundResult[];
  source: string | null;
  providerAvailable: boolean;
  error: string | null;
}

export interface CacheStats {
  pubchem: Record<string, any>;
  formula: Record<string, any>;
  total: {
    memory_count: number;
    file_count: number;
    size_kb: number;
  };
}

// ------------------------------------------------------------
// Internal request helper
// ------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, options);
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned an invalid response");
  }
  if (!res.ok) {
    throw new Error(data.detail || data.error || "Request failed");
  }
  return data as T;
}

// ------------------------------------------------------------
// Health / status
// ------------------------------------------------------------

export async function getStatus(): Promise<{ message: string; version: string; status: string }> {
  return request("/");
}

export async function getHealth(): Promise<{ status: string; rdkit: string }> {
  return request("/health");
}

// ------------------------------------------------------------
// Molecule analysis
// ------------------------------------------------------------

export async function analyzeMolecule(smiles: string): Promise<MoleculeResponse> {
  return request(`/analyze?smiles=${encodeURIComponent(smiles)}`);
}

export async function analyzeMoleculePost(smiles: string): Promise<MoleculeResponse> {
  return request("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles }),
  });
}

export async function generate3D(smiles: string): Promise<Generate3DResponse> {
  return request(`/generate_3d?smiles=${encodeURIComponent(smiles)}`);
}

// ------------------------------------------------------------
// Equation balancing
// ------------------------------------------------------------

export async function balanceEquation(equation: string): Promise<BalanceEquationResponse> {
  return request(`/balance_equation?equation=${encodeURIComponent(equation)}`);
}

// ------------------------------------------------------------
// Compound search
// ------------------------------------------------------------

export async function searchCompoundByName(name: string): Promise<CompoundResult> {
  return request(`/api/compound/name?name=${encodeURIComponent(name)}`);
}

export async function searchCompoundByFormula(
  formula: string
): Promise<CompoundByFormulaResponse> {
  return request(`/api/compound/formula?formula=${encodeURIComponent(formula)}`);
}

// ------------------------------------------------------------
// Cache management
// ------------------------------------------------------------

export async function getCacheStats(): Promise<CacheStats> {
  return request("/api/compound/cache/stats");
}

export async function clearCache(): Promise<{ status: string }> {
  return request("/api/compound/cache/clear", { method: "POST" });
}
