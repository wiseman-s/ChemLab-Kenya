// src/api.js
//
// Central place for all calls to the ChemLab Kenya backend.
// Import functions from this file anywhere in your React components,
// e.g.  import { analyzeMolecule, balanceEquation } from "./api";

// Falls back to your live Render URL if the env var isn't set yet
// (useful while you're still setting up .env / Vercel env vars).
const API_URL = process.env.REACT_APP_API_URL || "https://chemlab-kenya.onrender.com";

// Small helper so every function doesn't repeat the same error handling
async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned an invalid response");
  }
  if (!res.ok) {
    throw new Error(data.detail || data.error || "Request failed");
  }
  return data;
}

// ------------------------------------------------------------
// Health / status
// ------------------------------------------------------------

export async function getStatus() {
  return request("/");
}

export async function getHealth() {
  return request("/health");
}

// ------------------------------------------------------------
// Molecule analysis
// ------------------------------------------------------------

// GET version
export async function analyzeMolecule(smiles) {
  return request(`/analyze?smiles=${encodeURIComponent(smiles)}`);
}

// POST version (same result, sends SMILES in the body instead of the URL)
export async function analyzeMoleculePost(smiles) {
  return request("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles }),
  });
}

export async function generate3D(smiles) {
  return request(`/generate_3d?smiles=${encodeURIComponent(smiles)}`);
}

// ------------------------------------------------------------
// Equation balancing
// ------------------------------------------------------------

export async function balanceEquation(equation) {
  return request(`/balance_equation?equation=${encodeURIComponent(equation)}`);
}

// ------------------------------------------------------------
// Compound search
// ------------------------------------------------------------

export async function searchCompoundByName(name) {
  return request(`/api/compound/name?name=${encodeURIComponent(name)}`);
}

export async function searchCompoundByFormula(formula) {
  return request(`/api/compound/formula?formula=${encodeURIComponent(formula)}`);
}

// ------------------------------------------------------------
// Cache management
// ------------------------------------------------------------

export async function getCacheStats() {
  return request("/api/compound/cache/stats");
}

export async function clearCache() {
  return request("/api/compound/cache/clear", { method: "POST" });
}
