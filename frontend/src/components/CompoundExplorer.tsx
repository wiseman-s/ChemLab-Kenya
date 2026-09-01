// src/components/CompoundExplorer.tsx

import React, { useState } from 'react';
import {
  calculateElementComposition,
  type ElementComposition,
} from '../utils/formulaComposition';
import { API_URL } from '../config';

// ✅ Backend API URL - using config
const API_BASE = `${API_URL}/api`;

async function searchCompoundBackend(name: string) {
  const response = await fetch(
    `${API_BASE}/compound/name?name=${encodeURIComponent(name)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(error.error || error.detail || 'Search failed');
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

const CompoundExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [compound, setCompound] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [composition, setComposition] = useState<ElementComposition[] | null>(null);

  // Custom toast notification (replaces browser alert())
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSearch = async () => {
    const query = searchTerm.trim();

    if (!query) {
      setError('Enter a compound name to search.');
      return;
    }

    setLoading(true);
    setError('');
    setCompound(null);
    setComposition(null);

    try {
      const result = await searchCompoundBackend(query);
      setCompound(result);

      try {
        const compositionResult = calculateElementComposition(
          result.molecularFormula
        );
        setComposition(compositionResult);
      } catch (compositionError) {
        console.warn('Could not calculate elemental composition:', compositionError);
        setComposition(null);
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Copy SMILES to clipboard
  const copySmiles = () => {
    if (!compound || !compound.smiles) {
      return;
    }

    const onCopied = () => {
      showToast('✅ SMILES copied! You can now paste it into the Molecular Analyzer.');
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(compound.smiles).then(onCopied).catch(() => {
        fallbackCopy(compound.smiles, onCopied);
      });
    } else {
      fallbackCopy(compound.smiles, onCopied);
    }
  };

  const fallbackCopy = (text: string, onCopied: () => void) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    onCopied();
  };

  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        marginTop: '20px',
        position: 'relative',
      }}
    >
      <h2 style={{ color: '#00695c', marginBottom: '8px' }}>
        🧪 Compound Explorer
      </h2>

      <p style={{ color: '#666', marginTop: 0, marginBottom: '20px' }}>
        Search for a compound by its common or chemical name. 
        Copy the SMILES string and paste it into the Molecular Analyzer to view its 2D and 3D structure.
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. water, aspirin, ethanol..."
          disabled={loading}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '12px',
            border: '2px solid #00897b',
            borderRadius: '5px',
            fontSize: '16px',
            outline: 'none',
          }}
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '12px 20px',
            background: loading ? '#80cbc4' : '#00897b',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: '15px',
            padding: '12px',
            background: '#ffebee',
            border: '1px solid #ef9a9a',
            borderRadius: '5px',
            color: '#c62828',
          }}
        >
          {error}
        </div>
      )}

      {compound && (
        <div
          style={{
            marginTop: '25px',
            padding: '20px',
            background: '#f5f5f5',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          }}
        >
          <h2 style={{ color: '#00695c', marginTop: 0, marginBottom: '10px' }}>
            {compound.title}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ padding: '12px', background: 'white', borderRadius: '5px' }}>
              <strong>Molecular Formula</strong>
              <div style={{ fontSize: '18px', marginTop: '5px', fontFamily: 'monospace' }}>
                {compound.molecularFormula}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'white', borderRadius: '5px' }}>
              <strong>Molecular Weight</strong>
              <div style={{ marginTop: '5px' }}>
                {compound.molecularWeight ? `${compound.molecularWeight} g/mol` : 'Not available'}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'white', borderRadius: '5px', gridColumn: '1 / -1' }}>
              <strong>IUPAC Name</strong>
              <div style={{ marginTop: '5px', wordBreak: 'break-word' }}>
                {compound.iupacName}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'white', borderRadius: '5px', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>SMILES</strong>
                <button
                  onClick={copySmiles}
                  style={{
                    padding: '6px 16px',
                    background: '#00897b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  📋 Copy SMILES
                </button>
              </div>
              <div
                style={{
                  marginTop: '5px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  wordBreak: 'break-all',
                  background: '#fafafa',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0'
                }}
              >
                {compound.smiles}
              </div>
              <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                💡 Copy this SMILES and paste it into the <strong>Molecular Analyzer</strong> tab to view the 2D and 3D structure.
              </div>
            </div>
          </div>

          {composition && composition.length > 0 && (
            <div
              style={{
                marginTop: '15px',
                padding: '15px',
                background: '#eef7f6',
                borderRadius: '6px',
                border: '1px solid #b2dfdb',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: '#00695c',
                  fontSize: '17px',
                }}
              >
                ⚛️ Element Composition
              </strong>

              <div style={{ display: 'grid', gap: '8px' }}>
                {composition.map((element) => (
                  <div
                    key={element.symbol}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 100px',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                    }}
                  >
                    <div>
                      <strong>{element.symbol}</strong>{' '}
                      <span style={{ color: '#666' }}>{element.name}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {element.count} atom{element.count !== 1 ? 's' : ''}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {element.percentage.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>

              <p
                style={{
                  marginTop: '12px',
                  marginBottom: 0,
                  fontSize: '13px',
                  color: '#666',
                }}
              >
                Percentages represent the contribution of each element to the compound's total molecular mass.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Custom toast notification — replaces the native alert() popup */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#00695c',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 1000,
            maxWidth: '90vw',
            textAlign: 'center',
          }}
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default CompoundExplorer;
