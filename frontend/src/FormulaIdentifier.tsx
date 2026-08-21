// src/FormulaIdentifier.tsx

import React, { useState } from 'react';
import { searchByFormula, looksLikeMolecularFormula } from './services/formulaIdentifier';

const FormulaIdentifier: React.FC = () => {
  const [formula, setFormula] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!formula.trim()) {
      setError('Please enter a molecular formula.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setSearched(true);

    try {
      const compounds = await searchByFormula(formula.trim());
      setResults(compounds);
      
      if (compounds.length === 0) {
        setError(`No known compounds were found for the formula "${formula.trim()}".`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong while searching.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleExample = (example: string) => {
    setFormula(example);
    setResults([]);
    setError('');
    setSearched(false);
  };

  return (
    <div style={{
      padding: '20px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
    }}>
      <h2 style={{ color: '#00695c', marginBottom: '8px' }}>
        🧪 Formula → Compound Identifier
      </h2>

      <p style={{ color: '#666', marginTop: 0, marginBottom: '20px' }}>
        Enter a molecular formula to find known compounds with that formula.
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. H2O, C2H6O, C6H12O6"
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '12px',
            border: '2px solid #00897b',
            borderRadius: '4px',
            fontSize: '16px',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading ? '#80cbc4' : '#00897b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {loading ? '⏳ Searching...' : '🔍 Identify'}
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        <strong style={{ fontSize: '0.9rem', color: '#666' }}>Examples:</strong>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
          <button onClick={() => handleExample('H2O')} style={exampleStyle}>💧 H2O</button>
          <button onClick={() => handleExample('C2H6O')} style={exampleStyle}>🍷 C2H6O</button>
          <button onClick={() => handleExample('C6H12O6')} style={exampleStyle}>🍬 C6H12O6</button>
          <button onClick={() => handleExample('CaCO3')} style={exampleStyle}>🧱 CaCO3</button>
          <button onClick={() => handleExample('C6H13NO2')} style={exampleStyle}>🧪 C6H13NO2</button>
          <button onClick={() => handleExample('C12H22O11')} style={exampleStyle}>🍭 C12H22O11</button>
          <button onClick={() => handleExample('Ni(CO)4')} style={exampleStyle}>🧪 Ni(CO)4</button>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: '#ffebee',
          border: '1px solid #ef9a9a',
          borderRadius: '4px',
          color: '#c62828',
        }}>
          ⚠️ {error}
        </div>
      )}

      {results.length > 0 && !error && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: '#00695c', marginBottom: '10px' }}>
            Found {results.length} compound{results.length > 1 ? 's' : ''}
          </h4>
          
          {results.map((compound, index) => (
            <div
              key={index}
              style={{
                padding: '15px',
                background: '#e8f5e9',
                borderRadius: '6px',
                border: '1px solid #00897b',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <strong style={{ color: '#00695c' }}>Name</strong>
                  <div style={{ fontSize: '18px' }}>{compound.title}</div>
                </div>
                <div>
                  <strong style={{ color: '#00695c' }}>Formula</strong>
                  <div style={{ fontSize: '18px', fontFamily: 'monospace' }}>
                    {compound.molecularFormula}
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#00695c' }}>Molecular Weight</strong>
                  <div>{compound.molecularWeight} g/mol</div>
                </div>
                <div>
                  <strong style={{ color: '#00695c' }}>IUPAC Name</strong>
                  <div style={{ fontSize: '0.9rem' }}>{compound.iupacName}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: '#00695c' }}>SMILES</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {compound.smiles}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: '#00695c' }}>Source</strong>
                  <div>{compound.source || 'Unknown'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !error && !loading && (
        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: '#fff3e0',
          border: '1px solid #ffcc80',
          borderRadius: '4px',
          color: '#e65100',
        }}>
          ⚠️ No compounds found for "{formula}". Try checking the formula or use the Compound Explorer.
        </div>
      )}
    </div>
  );
};

const exampleStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#e0e0e0',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};

export default FormulaIdentifier;