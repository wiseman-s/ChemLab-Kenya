// src/EquationBalancer.tsx
import React, { useState } from 'react';

const EquationBalancer: React.FC = () => {
  const [equation, setEquation] = useState('CH4 + O2 -> CO2 + H2O');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const balanceEquation = async () => {
    if (!equation.trim()) {
      setError('Please enter an equation');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Clean the equation: remove spaces, keep ->
      const cleanEquation = equation
        .replace(/\s/g, '')
        .replace(/->/g, '->');

      const response = await fetch(
        `/balance_equation?equation=${encodeURIComponent(cleanEquation)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to balance equation');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (example: string) => {
    setEquation(example);
    setResult(null);
    setError('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Enter Chemical Equation:
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={equation}
            onChange={(e) => setEquation(e.target.value)}
            placeholder="e.g., CH4 + O2 -> CO2 + H2O"
            style={{
              flex: 1,
              padding: '10px',
              border: '2px solid #00897b',
              borderRadius: '4px',
              fontSize: '16px',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={balanceEquation}
            disabled={loading}
            style={{
              padding: '10px 25px',
              background: loading ? '#80cbc4' : '#00897b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            {loading ? '⏳ Balancing...' : '⚖️ Balance'}
          </button>
        </div>
      </div>

      <div>
        <strong>Quick Examples:</strong>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
          <button onClick={() => loadExample('CH4 + O2 -> CO2 + H2O')} style={exampleStyle}>
            🔥 CH4 + O2
          </button>
          <button onClick={() => loadExample('Fe + O2 -> Fe2O3')} style={exampleStyle}>
            🪨 Fe + O2
          </button>
          <button onClick={() => loadExample('H2 + O2 -> H2O')} style={exampleStyle}>
            💧 H2 + O2
          </button>
          <button onClick={() => loadExample('Na + Cl2 -> NaCl')} style={exampleStyle}>
            🧂 Na + Cl2
          </button>
          <button onClick={() => loadExample('C3H8 + O2 -> CO2 + H2O')} style={exampleStyle}>
            🔥 C3H8 + O2
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: '#ffebee',
          borderRadius: '4px',
          color: '#d32f2f',
        }}>
          ❌ {error}
        </div>
      )}

      {result && !error && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          background: '#e8f5e9',
          borderRadius: '4px',
          border: '1px solid #00897b',
        }}>
          <h4 style={{ color: '#00695c', margin: 0, marginBottom: '10px' }}>
            ✅ Balanced Equation
          </h4>
          <div style={{
            fontSize: '20px',
            fontFamily: 'monospace',
            padding: '10px',
            background: 'white',
            borderRadius: '4px',
            textAlign: 'center',
          }}>
            {result.balanced_equation}
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
            <strong>Reactants:</strong> {result.reactants?.map((r: any) => `${r.coefficient}${r.formula}`).join(' + ')}
            <br />
            <strong>Products:</strong> {result.products?.map((p: any) => `${p.coefficient}${p.formula}`).join(' + ')}
          </div>
        </div>
      )}
    </div>
  );
};

const exampleStyle: React.CSSProperties = {
  padding: '5px 15px',
  background: '#e0e0e0',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
};

export default EquationBalancer;
