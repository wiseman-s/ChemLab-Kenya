// src/utils/reactionPredictor.ts

export type ReactionType =
  | 'combustion'
  | 'synthesis'
  | 'decomposition'
  | 'single_displacement'
  | 'double_displacement'
  | 'neutralization'
  | 'unknown';

export interface ReactionPrediction {
  type: ReactionType;
  typeLabel: string;
  reactants: string[];
  products: string[];
  equation: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

/* =========================================================
   COMMON IONS
========================================================= */

const COMMON_IONS: Record<string, number> = {
  H: 1,
  Li: 1,
  Na: 1,
  K: 1,
  Ag: 1,
  NH4: 1,

  Mg: 2,
  Ca: 2,
  Ba: 2,
  Zn: 2,
  Fe: 2,
  Cu: 2,
  Pb: 2,

  Al: 3,
  Fe3: 3,

  F: -1,
  Cl: -1,
  Br: -1,
  I: -1,
  OH: -1,
  NO3: -1,
  NO2: -1,

  SO4: -2,
  SO3: -2,
  CO3: -2,
  S: -2,

  PO4: -3,
};

/* =========================================================
   ACTIVITY SERIES
   Higher = more reactive
========================================================= */

const ACTIVITY_SERIES = [
  'K',
  'Na',
  'Ca',
  'Mg',
  'Al',
  'Zn',
  'Fe',
  'Pb',
  'H',
  'Cu',
  'Ag',
  'Au',
];

/* =========================================================
   BASIC FORMULA HELPERS
========================================================= */

function cleanFormula(formula: string): string {
  return formula.trim().replace(/\s+/g, '');
}

function splitReactants(input: string): string[] {
  return input
    .split('+')
    .map(cleanFormula)
    .filter(Boolean);
}

function containsElement(formula: string, element: string): boolean {
  return new RegExp(`(^|[^A-Za-z])${element}`).test(formula);
}

function isOxygen(formula: string): boolean {
  return cleanFormula(formula) === 'O2';
}

function isWater(formula: string): boolean {
  return cleanFormula(formula) === 'H2O';
}

function isAcid(formula: string): boolean {
  const f = cleanFormula(formula);

  return (
    /^H[A-Z]/.test(f) ||
    f === 'HCl' ||
    f === 'HBr' ||
    f === 'HI' ||
    f === 'HNO3' ||
    f === 'H2SO4' ||
    f === 'H2CO3'
  );
}

function isBase(formula: string): boolean {
  const f = cleanFormula(formula);

  return (
    /OH/.test(f) &&
    (
      f.startsWith('Na') ||
      f.startsWith('K') ||
      f.startsWith('Ca') ||
      f.startsWith('Ba') ||
      f.startsWith('Mg')
    )
  );
}

function isMetal(formula: string): boolean {
  const metals = [
    'Li',
    'K',
    'Na',
    'Ca',
    'Mg',
    'Al',
    'Zn',
    'Fe',
    'Pb',
    'Cu',
    'Ag',
    'Au',
  ];

  return metals.some((metal) =>
    new RegExp(`^${metal}(\\d|$|\\()`).test(formula)
  );
}

/* =========================================================
   ELEMENT EXTRACTION
========================================================= */

function extractElements(formula: string): string[] {
  const matches = formula.match(/[A-Z][a-z]?/g);

  return matches ? [...new Set(matches)] : [];
}

/* =========================================================
   SIMPLE HYDROCARBON DETECTION
========================================================= */

function isHydrocarbon(formula: string): boolean {
  const f = cleanFormula(formula);

  return /^C\d*H\d+$/.test(f);
}

/* =========================================================
   COMBUSTION
========================================================= */

function predictCombustion(
  reactants: string[]
): ReactionPrediction | null {
  const fuel = reactants.find(
    (r) => isHydrocarbon(r) || /C.*H/.test(r)
  );

  const oxygen = reactants.find(isOxygen);

  if (!fuel || !oxygen) {
    return null;
  }

  return {
    type: 'combustion',
    typeLabel: 'Combustion',
    reactants,
    products: ['CO2', 'H2O'],
    equation: `${fuel} + O2 → CO2 + H2O`,
    explanation:
      'A carbon/hydrogen-containing compound reacts with oxygen. Complete combustion produces carbon dioxide and water.',
    confidence: 'high',
  };
}

/* =========================================================
   ACID + BASE
========================================================= */

function predictNeutralization(
  reactants: string[]
): ReactionPrediction | null {
  const acid = reactants.find(isAcid);
  const base = reactants.find(isBase);

  if (!acid || !base) {
    return null;
  }

  return {
    type: 'neutralization',
    typeLabel: 'Acid–Base Neutralization',
    reactants,
    products: ['salt', 'H2O'],
    equation: `${acid} + ${base} → salt + H2O`,
    explanation:
      'An acid reacts with a base to form a salt and water. The equation must then be balanced according to the ions present.',
    confidence: 'high',
  };
}

/* =========================================================
   SINGLE DISPLACEMENT
========================================================= */

function getLeadingMetal(formula: string): string | null {
  const elements = extractElements(formula);

  for (const element of elements) {
    if (ACTIVITY_SERIES.includes(element)) {
      return element;
    }
  }

  return null;
}

function activityIndex(element: string): number {
  return ACTIVITY_SERIES.indexOf(element);
}

function predictSingleDisplacement(
  reactants: string[]
): ReactionPrediction | null {
  if (reactants.length !== 2) {
    return null;
  }

  const [first, second] = reactants;

  const metal =
    getLeadingMetal(first) && isMetal(first)
      ? getLeadingMetal(first)
      : getLeadingMetal(second) && isMetal(second)
      ? getLeadingMetal(second)
      : null;

  if (!metal) {
    return null;
  }

  const other = metal === getLeadingMetal(first) ? second : first;

  /*
   * Metal + acid
   */

  if (isAcid(other)) {
    const hydrogenIndex = activityIndex('H');
    const metalIndex = activityIndex(metal);

    if (
      metalIndex !== -1 &&
      hydrogenIndex !== -1 &&
      metalIndex < hydrogenIndex
    ) {
      return {
        type: 'single_displacement',
        typeLabel: 'Single Displacement',
        reactants,
        products: ['metal salt', 'H2'],
        equation: `${first} + ${second} → metal salt + H2`,
        explanation:
          `${metal} is above hydrogen in the activity series, so it can displace hydrogen from an acid.`,
        confidence: 'high',
      };
    }

    return {
      type: 'single_displacement',
      typeLabel: 'No Reaction Predicted',
      reactants,
      products: [],
      equation: `${first} + ${second} → No reaction`,
      explanation:
        `${metal} is not sufficiently active to displace hydrogen from this acid under the standard activity-series rule.`,
      confidence: 'high',
    };
  }

  /*
   * Metal + metal salt
   */

  if (isMetal(first) !== isMetal(second)) {
    const metalA = getLeadingMetal(first);
    const metalB = getLeadingMetal(second);

    if (metalA && metalB && metalA !== metalB) {
      const freeMetal = isMetal(first) ? metalA : metalB;
      const saltMetal = isMetal(first) ? metalB : metalA;

      if (
        activityIndex(freeMetal) <
        activityIndex(saltMetal)
      ) {
        return {
          type: 'single_displacement',
          typeLabel: 'Single Displacement',
          reactants,
          products: ['new metal salt', freeMetal],
          equation: `${first} + ${second} → new metal salt + ${freeMetal}`,
          explanation:
            `${freeMetal} is higher in the activity series than ${saltMetal}, so it can displace ${saltMetal} from its compound.`,
          confidence: 'high',
        };
      }
    }
  }

  return null;
}

/* =========================================================
   DOUBLE DISPLACEMENT
========================================================= */

function predictDoubleDisplacement(
  reactants: string[]
): ReactionPrediction | null {
  if (reactants.length !== 2) {
    return null;
  }

  const [a, b] = reactants;

  /*
   * Two ionic compounds are candidates for double displacement.
   */

  if (
    !isMetal(a) &&
    !isMetal(b) &&
    !isAcid(a) &&
    !isAcid(b)
  ) {
    return null;
  }

  if (
    (a.includes('NO3') ||
      a.includes('Cl') ||
      a.includes('SO4') ||
      a.includes('CO3')) &&
    (b.includes('NO3') ||
      b.includes('Cl') ||
      b.includes('SO4') ||
      b.includes('CO3'))
  ) {
    return {
      type: 'double_displacement',
      typeLabel: 'Double Displacement',
      reactants,
      products: ['new ionic compound', 'new ionic compound'],
      equation: `${a} + ${b} → new ionic compound + new ionic compound`,
      explanation:
        'The positive and negative ions exchange partners. A complete prediction requires checking ion charges and, where applicable, solubility rules.',
      confidence: 'medium',
    };
  }

  return null;
}

/* =========================================================
   DECOMPOSITION
========================================================= */

function predictDecomposition(
  reactants: string[]
): ReactionPrediction | null {
  if (reactants.length !== 1) {
    return null;
  }

  const compound = cleanFormula(reactants[0]);

  /*
   * Metal carbonates
   */

  if (
    /^(Ca|Mg|Zn|Cu|Fe|Ba|Na|K)CO3/.test(compound)
  ) {
    return {
      type: 'decomposition',
      typeLabel: 'Decomposition',
      reactants,
      products: ['metal oxide', 'CO2'],
      equation: `${compound} → metal oxide + CO2`,
      explanation:
        'Many metal carbonates decompose on heating to form a metal oxide and carbon dioxide.',
      confidence: 'high',
    };
  }

  /*
   * Metal hydroxides
   */

  if (
    /^(Cu|Fe|Mg|Ca|Zn)(OH)\d/.test(compound)
  ) {
    return {
      type: 'decomposition',
      typeLabel: 'Decomposition',
      reactants,
      products: ['metal oxide', 'H2O'],
      equation: `${compound} → metal oxide + H2O`,
      explanation:
        'Many metal hydroxides decompose on heating to form a metal oxide and water.',
      confidence: 'high',
    };
  }

  /*
   * Hydrogen peroxide
   */

  if (compound === 'H2O2') {
    return {
      type: 'decomposition',
      typeLabel: 'Decomposition',
      reactants,
      products: ['H2O', 'O2'],
      equation: '2H2O2 → 2H2O + O2',
      explanation:
        'Hydrogen peroxide decomposes into water and oxygen.',
      confidence: 'high',
    };
  }

  return null;
}

/* =========================================================
   SYNTHESIS
========================================================= */

function predictSynthesis(
  reactants: string[]
): ReactionPrediction | null {
  if (reactants.length !== 2) {
    return null;
  }

  const [a, b] = reactants;

  /*
   * Element + element
   */

  const aElements = extractElements(a);
  const bElements = extractElements(b);

  if (
    aElements.length === 1 &&
    bElements.length === 1
  ) {
    return {
      type: 'synthesis',
      typeLabel: 'Synthesis / Combination',
      reactants,
      products: ['single compound'],
      equation: `${a} + ${b} → compound`,
      explanation:
        'Two simpler substances combine to form one compound. The product formula is determined from the ions or valencies involved.',
      confidence: 'medium',
    };
  }

  return null;
}

/* =========================================================
   MAIN PREDICTOR
========================================================= */

export function predictReaction(
  input: string
): ReactionPrediction {
  const reactants = splitReactants(input);

  if (reactants.length < 1) {
    return {
      type: 'unknown',
      typeLabel: 'Unknown',
      reactants: [],
      products: [],
      equation: '',
      explanation:
        'Enter one or more reactants separated by +.',
      confidence: 'low',
    };
  }

  /*
   * Order matters.
   * Specific reactions are tested before general ones.
   */

  const combustion = predictCombustion(reactants);

  if (combustion) {
    return combustion;
  }

  const neutralization =
    predictNeutralization(reactants);

  if (neutralization) {
    return neutralization;
  }

  const single =
    predictSingleDisplacement(reactants);

  if (single) {
    return single;
  }

  const double =
    predictDoubleDisplacement(reactants);

  if (double) {
    return double;
  }

  const decomposition =
    predictDecomposition(reactants);

  if (decomposition) {
    return decomposition;
  }

  const synthesis =
    predictSynthesis(reactants);

  if (synthesis) {
    return synthesis;
  }

  return {
    type: 'unknown',
    typeLabel: 'Reaction Not Confidently Identified',
    reactants,
    products: [],
    equation: `${reactants.join(' + ')} → ?`,
    explanation:
      'The current rule set does not contain enough information to confidently predict this reaction. No product has been invented.',
    confidence: 'low',
  };
}