import React, { useState } from 'react';
import {
  searchByFormula,
  type FormulaCompound
} from '../services/formulaIdentifier';

const FormulaIdentifier: React.FC = () => {
  const [formula, setFormula] = useState('');
  const [results, setResults] = useState<FormulaCompound[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const cleanFormula = formula.trim();

    if (!cleanFormula) {
      setError('Enter a molecular formula, for example C2H6O.');
      setResults([]);
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const compounds = await searchByFormula(cleanFormula);

      if (compounds.length === 0) {
        setError(
          `No known compounds were found for the formula "${cleanFormula}".`
        );
        return;
      }

      setResults(compounds);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to search PubChem.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}
    >
      <h2
        style={{
          color: '#00695c',
          marginTop: 0
        }}
      >
        🧪 Formula → Compound Identifier
      </h2>

      <p
        style={{
          color: '#666',
          marginBottom: '20px'
        }}
      >
        Enter a molecular formula to find known compounds
        with that formula.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}
      >
        <input
          type="text"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. H2O, C2H6O, C6H12O6"
          disabled={loading}
          style={{
            flex: 1,
            minWidth: '250px',
            padding: '12px',
            border: '2px solid #00897b',
            borderRadius: '5px',
            fontSize: '16px',
            outline: 'none'
          }}
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '12px 22px',
            background: loading
              ? '#80cbc4'
              : '#00897b',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading
              ? 'not-allowed'
              : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Searching...' : 'Identify'}
        </button>
      </div>

      {/* Helpful examples */}
      <div
        style={{
          marginTop: '15px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <span
          style={{
            color: '#666',
            fontSize: '14px'
          }}
        >
          Examples:
        </span>

        {['H2O', 'C2H6O', 'C6H12O6', 'CaCO3'].map(
          (example) => (
            <button
              key={example}
              onClick={() => {
                setFormula(example);
                setError('');
                setResults([]);
              }}
              style={{
                padding: '4px 10px',
                border: '1px solid #ccc',
                background: '#f5f5f5',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {example}
            </button>
          )
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            background: '#ffebee',
            border: '1px solid #ef9a9a',
            borderRadius: '5px',
            color: '#c62828'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: '25px' }}>
          <h3 style={{ color: '#00695c' }}>
            Found {results.length} known compound
            {results.length !== 1 ? 's' : ''}
          </h3>

          {results.length > 1 && (
            <div
              style={{
                padding: '12px',
                marginBottom: '15px',
                background: '#fff8e1',
                border: '1px solid #ffe082',
                borderRadius: '5px',
                color: '#6d4c41'
              }}
            >
              <strong>ℹ️ Important:</strong>{' '}
              A molecular formula does not always uniquely
              identify a compound. Different compounds can
              have the same molecular formula because of
              structural isomerism.
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '15px'
            }}
          >
            {results.map((compound) => (
              <div
                key={compound.cid}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#fafafa'
                }}
              >
                <div
                  style={{
                    padding: '15px',
                    textAlign: 'center',
                    background: 'white'
                  }}
                >
                  <img
                    src={compound.structureImage}
                    alt={`Structure of ${compound.title}`}
                    style={{
                      maxWidth: '100%',
                      height: '180px',
                      objectFit: 'contain'
                    }}
                  />
                </div>

                <div style={{ padding: '15px' }}>
                  <h3
                    style={{
                      marginTop: 0,
                      color: '#00695c'
                    }}
                  >
                    {compound.title}
                  </h3>

                  <div
                    style={{
                      display: 'grid',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <strong>IUPAC Name:</strong>
                      <div>
                        {compound.iupacName}
                      </div>
                    </div>

                    <div>
                      <strong>Formula:</strong>{' '}
                      {compound.molecularFormula}
                    </div>

                    <div>
                      <strong>Molecular Weight:</strong>{' '}
                      {compound.molecularWeight
                        ? `${compound.molecularWeight} g/mol`
                        : 'Not available'}
                    </div>

                    <div>
                      <strong>SMILES:</strong>

                      <div
                        style={{
                          marginTop: '4px',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          wordBreak: 'break-all'
                        }}
                      >
                        {compound.smiles ||
                          'Not available'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaIdentifier;