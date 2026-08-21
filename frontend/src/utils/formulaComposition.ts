import { ELEMENTS } from '../data/periodicTable';

export interface ElementComposition {
  symbol: string;
  name: string;
  count: number;
  atomicMass: number;
  massContribution: number;
  percentage: number;
}

const ATOMIC_MASSES: Record<string, number> =
  Object.fromEntries(
    ELEMENTS.map((element) => [
      element.symbol,
      Number(element.mass),
    ])
  );

const ELEMENT_NAMES: Record<string, string> =
  Object.fromEntries(
    ELEMENTS.map((element) => [
      element.symbol,
      element.name,
    ])
  );

/**
 * Parses molecular formulas such as:
 *
 * H2O
 * C6H12O6
 * Ca(OH)2
 * Al2(SO4)3
 *
 * The parser is deliberately strict.
 * If a formula cannot be confidently interpreted,
 * it throws an error instead of guessing.
 */
export function parseFormula(
  formula: string
): Record<string, number> {
  const clean = formula.replace(/\s+/g, '');

  if (!clean) {
    throw new Error('Empty molecular formula.');
  }

  let position = 0;

  function readNumber(): number {
    const start = position;

    while (
      position < clean.length &&
      /[0-9]/.test(clean[position])
    ) {
      position++;
    }

    if (start === position) {
      return 1;
    }

    const value = Number(
      clean.slice(start, position)
    );

    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(
        `Invalid multiplier in formula "${formula}".`
      );
    }

    return value;
  }

  function readElement(): string {
    if (
      position >= clean.length ||
      !/[A-Z]/.test(clean[position])
    ) {
      throw new Error(
        `Expected an element symbol near "${clean.slice(
          position
        )}".`
      );
    }

    let symbol = clean[position];
    position++;

    if (
      position < clean.length &&
      /[a-z]/.test(clean[position])
    ) {
      symbol += clean[position];
      position++;
    }

    if (!(symbol in ATOMIC_MASSES)) {
      throw new Error(
        `Unknown element symbol "${symbol}".`
      );
    }

    return symbol;
  }

  function parseGroup(): Record<string, number> {
    const counts: Record<string, number> = {};

    while (position < clean.length) {
      const char = clean[position];

      // End of the current parenthesized group
      if (char === ')') {
        break;
      }

      // Parenthesized group
      if (char === '(') {
        position++;

        const inner = parseGroup();

        if (
          position >= clean.length ||
          clean[position] !== ')'
        ) {
          throw new Error(
            `Mismatched parentheses in formula "${formula}".`
          );
        }

        position++;

        const multiplier = readNumber();

        for (const [symbol, count] of Object.entries(inner)) {
          counts[symbol] =
            (counts[symbol] || 0) +
            count * multiplier;
        }

        continue;
      }

      // We deliberately reject unsupported bracket types
      if (
        char === '[' ||
        char === ']' ||
        char === '{' ||
        char === '}'
      ) {
        throw new Error(
          `Unsupported bracket "${char}" in formula "${formula}".`
        );
      }

      // Element symbol
      if (/[A-Z]/.test(char)) {
        const symbol = readElement();
        const multiplier = readNumber();

        counts[symbol] =
          (counts[symbol] || 0) +
          multiplier;

        continue;
      }

      throw new Error(
        `Unexpected character "${char}" in formula "${formula}".`
      );
    }

    return counts;
  }

  const counts = parseGroup();

  // Unmatched closing parenthesis
  if (
    position < clean.length &&
    clean[position] === ')'
  ) {
    throw new Error(
      `Unexpected closing parenthesis in formula "${formula}".`
    );
  }

  // Something was left unparsed
  if (position !== clean.length) {
    throw new Error(
      `Could not completely parse formula "${formula}".`
    );
  }

  if (Object.keys(counts).length === 0) {
    throw new Error(
      `No elements were found in formula "${formula}".`
    );
  }

  return counts;
}

/**
 * Calculates elemental composition
 * and percentage composition by mass.
 */
export function calculateElementComposition(
  formula: string
): ElementComposition[] {
  const counts = parseFormula(formula);

  const rows = Object.entries(counts).map(
    ([symbol, count]) => {
      const atomicMass = ATOMIC_MASSES[symbol];

      if (!atomicMass) {
        throw new Error(
          `Atomic mass unavailable for ${symbol}.`
        );
      }

      return {
        symbol,
        name: ELEMENT_NAMES[symbol] || symbol,
        count,
        atomicMass,
        massContribution:
          count * atomicMass,
        percentage: 0,
      };
    }
  );

  const totalMass = rows.reduce(
    (sum, row) =>
      sum + row.massContribution,
    0
  );

  if (totalMass <= 0) {
    throw new Error(
      `Could not calculate molecular mass for "${formula}".`
    );
  }

  return rows.map((row) => ({
    ...row,
    percentage:
      (row.massContribution / totalMass) * 100,
  }));
}