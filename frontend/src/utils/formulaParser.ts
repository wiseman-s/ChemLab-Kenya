import { ELEMENTS } from '../data/periodicTable';

const MASS_BY_SYMBOL: Record<string, number> = Object.fromEntries(
  ELEMENTS.map(e => [e.symbol, e.mass])
);

export interface ParsedFormula {
  counts: Record<string, number>;
  molarMass: number;
  totalMass: number; // alias of molarMass, kept for callers expecting this name
}

/**
 * Parses formulas like "H2O", "Ca(OH)2", "C6H12O6", "Fe2(SO4)3".
 * Throws an Error with a human-readable message on invalid input.
 */
export function parseFormula(formula: string): ParsedFormula {
  const clean = formula.replace(/\s+/g, '');
  if (!clean) {
    throw new Error('Enter a chemical formula.');
  }

  let pos = 0;

  function parseGroup(): Record<string, number> {
    const counts: Record<string, number> = {};

    while (pos < clean.length && clean[pos] !== ')') {
      if (clean[pos] === '(') {
        pos++; // consume '('
        const inner = parseGroup();
        if (clean[pos] !== ')') {
          throw new Error('Mismatched parentheses in formula.');
        }
        pos++; // consume ')'
        const multiplier = readNumber();
        for (const [el, count] of Object.entries(inner)) {
          counts[el] = (counts[el] || 0) + count * multiplier;
        }
      } else if (/[A-Z]/.test(clean[pos])) {
        const symbol = readElementSymbol();
        const count = readNumber();
        if (!(symbol in MASS_BY_SYMBOL)) {
          throw new Error(`Unknown element symbol: "${symbol}"`);
        }
        counts[symbol] = (counts[symbol] || 0) + count;
      } else {
        throw new Error(`Unexpected character "${clean[pos]}" in formula.`);
      }
    }

    return counts;
  }

  function readElementSymbol(): string {
    let symbol = clean[pos];
    pos++;
    if (pos < clean.length && /[a-z]/.test(clean[pos])) {
      symbol += clean[pos];
      pos++;
    }
    return symbol;
  }

  function readNumber(): number {
    let numStr = '';
    while (pos < clean.length && /[0-9]/.test(clean[pos])) {
      numStr += clean[pos];
      pos++;
    }
    return numStr ? parseInt(numStr, 10) : 1;
  }

  const counts = parseGroup();
  if (pos < clean.length) {
    throw new Error('Mismatched parentheses in formula.');
  }
  if (Object.keys(counts).length === 0) {
    throw new Error('Could not parse any elements from formula.');
  }

  const molarMass = Math.round(
    Object.entries(counts).reduce((sum, [el, count]) => sum + MASS_BY_SYMBOL[el] * count, 0) * 1000
  ) / 1000;

  return { counts, molarMass, totalMass: molarMass };
}

/** Alias for parseFormula — some callers expect this name. */
export const calculateMolarMass = parseFormula;

/** moles * molar mass = mass (g) */
export function molesToMass(moles: number, molarMass: number): number {
  return moles * molarMass;
}

/** mass (g) / molar mass = moles */
export function massToMoles(mass: number, molarMass: number): number {
  return mass / molarMass;
}