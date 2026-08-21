import React, { useState } from 'react';
import { API_URL } from './config';

type ReactionType = 'combustion' | 'synthesis' | 'decomposition' | 'single_displacement' | 'double_displacement' | 'acid_base';

interface ReactionOption {
  key: ReactionType;
  label: string;
  fields: string[]; // labels for each reactant input
  placeholders: string[];
  examples: string[][]; // list of example reactant sets
  hint: string;
}

const REACTION_OPTIONS: ReactionOption[] = [
  {
    key: 'combustion',
    label: '🔥 Combustion',
    fields: ['Fuel', 'Oxygen'],
    placeholders: ['e.g. C3H8', 'O2'],
    examples: [['CH4', 'O2'], ['C3H8', 'O2'], ['C2H5OH', 'O2']],
    hint: 'Fuel made of C, H, and O — burns in oxygen to give CO2 and H2O.'
  },
  {
    key: 'synthesis',
    label: '⚗️ Synthesis',
    fields: ['Metal', 'Nonmetal'],
    placeholders: ['e.g. Na', 'e.g. Cl2'],
    examples: [['Na', 'Cl2'], ['Mg', 'O2'], ['Fe', 'O2'], ['Al', 'Cl2']],
    hint: 'A metal and a nonmetal element combine to form an ionic compound.'
  },
  {
    key: 'decomposition',
    label: '💥 Decomposition',
    fields: ['Compound'],
    placeholders: ['e.g. CaCO3'],
    examples: [['CaCO3'], ['NaOH'], ['KClO3'], ['H2O2'], ['NaHCO3']],
    hint: 'Carbonates, hydroxides, chlorates, bicarbonates, and hydrogen peroxide are supported.'
  },
  {
    key: 'single_displacement',
    label: '🔁 Single Displacement',
    fields: ['Metal', 'Acid or Salt'],
    placeholders: ['e.g. Zn', 'e.g. HCl'],
    examples: [['Zn', 'HCl'], ['Mg', 'CuSO4'], ['Fe', 'AgNO3']],
    hint: 'A more reactive metal displaces a less reactive one from an acid or salt.'
  },
  {
    key: 'double_displacement',
    label: '🔀 Double Displacement',
    fields: ['Compound A', 'Compound B'],
    placeholders: ['e.g. AgNO3', 'e.g. NaCl'],
    examples: [['AgNO3', 'NaCl'], ['BaCl2', 'Na2SO4'], ['Pb(NO3)2', 'KI']],
    hint: 'Two ionic compounds swap partners — often forms a precipitate.'
  },
  {
    key: 'acid_base',
    label: '⚖️ Acid–Base Neutralization',
    fields: ['Acid', 'Base'],
    placeholders: ['e.g. HCl', 'e.g. NaOH'],
    examples: [['HCl', 'NaOH'], ['H2SO4', 'Ca(OH)2'], ['HNO3', 'KOH']],
    hint: 'Acid + base → salt + water.'
  },
];

interface BalanceResult {
  balanced_equation: string;
  reactants: { formula: string; coefficient: number }[];
  products: { formula: string; coefficient: number }[];
  error?: string;
}

const ReactionPredictor: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ReactionType>('combustion');
  const current = REACTION_OPTIONS.find(o => o.key === selectedType)!;

  const [inputs, setInputs] = useState<string[]>(current.placeholders.map(() => ''));
  const [result, setResult] = useState<BalanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const changeType = (type: ReactionType) => {
    const opt = REACTION_OPTIONS.find(o => o.key === type)!;
    setSelectedType(type);
    setInputs(opt.fields.map(() => ''));
    setResult(null);
    setError(null);
  };

  const predict = async (reactants: string[]) => {
    const clean = reactants.map(r => r.trim()).filter(Boolean);
    if (clean.length !== current.fields.length) {
      setError(`Fill in all ${current.fields.length} field(s) first.`);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `${API_URL}/predict_reaction?reactants=${encodeURIComponent(clean.join(','))}&reaction_type=${selectedType}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Could not predict products for this reaction.');
      }
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (example: string[]) => {
    setInputs(example);
    predict(example);
  };

  return (
    <div>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>
        Rule-based prediction for common reaction types — not a general AI predictor. Covers standard
        Form 3/4 patterns: known ions, a reactivity series, and textbook decomposition rules.
      </p>

      {/* Reaction type selector */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {REACTION_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => changeType(opt.key)}
            style={{
              padding: '8px 14px',
              background: selectedType === opt.key ? '#00897b' : '#e0e0e0',
              color: selectedType === opt.key ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '10px' }}>{current.hint}</p>

      {/* Reactant inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${current.fields.length}, 1fr)`, gap: '10px' }}>
        {current.fields.map((label, i) => (
          <div key={label}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{label}</label>
            <input
              type="text"
              value={inputs[i] || ''}
              onChange={(e) => {
                const next = [...inputs];
                next[i] = e.target.value;
                setInputs(next);
              }}
              placeholder={current.placeholders[i]}
              style={{ padding: '8px', border: '2px solid #00897b', borderRadius: '4px', width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => predict(inputs)}
        disabled={loading}
        style={{
          marginTop: '12px',
          padding: '10px 20px',
          background: loading ? '#ccc' : '#00897b',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '⏳ Predicting...' : '🔮 Predict Products'}
      </button>

      {/* Examples */}
      <div style={{ marginTop: '15px' }}>
        <strong style={{ fontSize: '0.85rem' }}>Try:</strong>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
          {current.examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => loadExample(ex)}
              style={{ padding: '4px 10px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'monospace' }}
            >
              {ex.join(' + ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '15px', padding: '12px', background: '#ffebee', borderRadius: '6px', color: '#d32f2f', fontSize: '0.9rem' }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '15px' }}>
          <div style={{
            padding: '20px',
            background: '#e8f5e9',
            borderRadius: '8px',
            fontSize: '1.2rem',
            fontFamily: 'monospace',
            textAlign: 'center',
            color: '#00695c',
            fontWeight: 600
          }}>
            {result.balanced_equation}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#666' }}>REACTANTS</strong>
              {result.reactants.map((r) => (
                <div key={r.formula} style={{ background: 'white', padding: '8px 12px', borderRadius: '4px', marginTop: '6px' }}>
                  <span style={{ fontFamily: 'monospace' }}>{r.formula}</span>
                  <span style={{ float: 'right', fontWeight: 600 }}>× {r.coefficient}</span>
                </div>
              ))}
            </div>
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#666' }}>PRODUCTS</strong>
              {result.products.map((p) => (
                <div key={p.formula} style={{ background: 'white', padding: '8px 12px', borderRadius: '4px', marginTop: '6px' }}>
                  <span style={{ fontFamily: 'monospace' }}>{p.formula}</span>
                  <span style={{ float: 'right', fontWeight: 600 }}>× {p.coefficient}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReactionPredictor;
