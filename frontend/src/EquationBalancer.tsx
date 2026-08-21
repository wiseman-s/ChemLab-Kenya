import React, { useState } from 'react';

const API_URL = 'http://localhost:5000';

interface BalanceResult {
  balanced_equation: string;
  reactants: { formula: string; coefficient: number }[];
  products: { formula: string; coefficient: number }[];
  error?: string;
}

const EXAMPLE_EQUATIONS = [
  'H2 + O2 -> H2O',
  'CH4 + O2 -> CO2 + H2O',
  'Fe + O2 -> Fe2O3',
  'Na + Cl2 -> NaCl',
  'C3H8 + O2 -> CO2 + H2O',
];

const EquationBalancer: React.FC = () => {
  const [equation, setEquation] = useState('CH4 + O2 -> CO2 + H2O');
  const [result, setResult] = useState<BalanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const balance = async (eq: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`${API_URL}/balance_equation?equation=${encodeURIComponent(eq)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Could not balance this equation.');
      }
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Enter an unbalanced equation using <code>+</code> between compounds and <code>-&gt;</code> (or <code>=</code>) between reactants and products — e.g. <code>CH4 + O2 -&gt; CO2 + H2O</code>
      </p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <input
          type="text"
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && balance(equation)}
          placeholder="e.g. CH4 + O2 -> CO2 + H2O"
          style={{
            flex: 1,
            padding: '10px',
            border: '2px solid #00897b',
            borderRadius: '4px',
            fontSize: '15px',
            fontFamily: 'monospace'
          }}
        />
        <button
          onClick={() => balance(equation)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: loading ? '#ccc' : '#00897b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '15px'
          }}
        >
          {loading ? '⏳ Balancing...' : '⚖️ Balance'}
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <strong style={{ fontSize: '0.85rem' }}>Try:</strong>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
          {EXAMPLE_EQUATIONS.map((eq) => (
            <button
              key={eq}
              onClick={() => { setEquation(eq); balance(eq); }}
              style={{ padding: '4px 10px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'monospace' }}
            >
              {eq}
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

export default EquationBalancer;