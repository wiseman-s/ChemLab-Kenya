// src/NMR13CViewer.tsx
import React, { useState } from 'react';
import { useGuestLimits } from './contexts/GuestLimitsContext';

interface NMRSignal {
  shift: number;
  atom: string;
  hose: string;
  smiles: string;
}

const NMR13CViewer: React.FC<{ smiles: string }> = ({ smiles }) => {
  const [signals, setSignals] = useState<NMRSignal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSmiles, setLastSmiles] = useState<string | null>(null);

  const { tryUse, remaining } = useGuestLimits();
  const remainingNMR = remaining('nmr');

  const predict = async () => {
    if (!smiles) {
      setError('Draw a molecule first.');
      return;
    }

    if (!tryUse('nmr')) return;

    setLoading(true);
    setError(null);

    try {
      // Dynamic import so the library only loads when needed
      const { lookupNmrShifts } = await import('vamos-hose');
      const result = await lookupNmrShifts(smiles, { nucleus: '13C' });

      if (!result || result.length === 0) {
        setError('No 13C signals could be predicted for this structure.');
        setSignals(null);
        return;
      }

      setSignals(result);
      setLastSmiles(smiles);
    } catch (err) {
      console.error('vamos-hose error:', err);
      setError('Could not run 13C prediction. The molecule may be too complex.');
      setSignals(null);
    } finally {
      setLoading(false);
    }
  };

  if (!smiles) {
    return (
      <div style={{ color: '#666', padding: '15px', textAlign: 'center' }}>
        Draw a molecule first to predict its 13C NMR spectrum.
      </div>
    );
  }

  const isStale = signals !== null && lastSmiles !== smiles;

  return (
    <div style={{
      padding: '15px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      marginTop: '15px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h4 style={{ color: '#00695c', margin: 0 }}>13C NMR Prediction</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {Number.isFinite(remainingNMR) && (
            <span style={{ fontSize: '11px', color: '#888' }}>
              {remainingNMR} free left
            </span>
          )}
          <button
            onClick={predict}
            disabled={loading}
            style={{
              padding: '6px 16px',
              background: loading ? '#80cbc4' : '#00897b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {loading ? 'Predicting...' : 'Predict 13C NMR'}
          </button>
        </div>
      </div>

      {!signals && !loading && !error && (
        <div style={{ color: '#666', fontSize: '13px', marginTop: '10px' }}>
          Click <strong>Predict 13C NMR</strong> to run a prediction for the current structure.
          This runs entirely in your browser using a local database — no internet needed.
        </div>
      )}

      {isStale && (
        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          background: '#fff3e0',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#7a5c00',
        }}>
          The structure has changed since this prediction. Click <strong>Predict 13C NMR</strong> again.
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Loading database and predicting shifts...
        </div>
      )}

      {error && (
        <div style={{ color: '#d32f2f', padding: '10px', background: '#ffebee', borderRadius: '4px', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}

      {signals && signals.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginTop: '10px',
            fontSize: '13px',
          }}>
            <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              <strong>Signals</strong>
              <div>{signals.length}</div>
            </div>
            <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              <strong>Source</strong>
              <div>NMRShiftDB2 (local)</div>
            </div>
          </div>

          <div style={{ marginTop: '10px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#e0e0e0' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>δ (ppm)</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Atom</th>
                </tr>
              </thead>
              <tbody>
                {signals
                  .slice()
                  .sort((a, b) => b.shift - a.shift)
                  .map((peak, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px', fontWeight: 'bold', color: '#00695c' }}>
                        {peak.shift.toFixed(2)}
                      </td>
                      <td style={{ padding: '6px' }}>{peak.atom}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '10px', fontSize: '11px', color: '#999' }}>
            * Predicted using HOSE codes from NMRShiftDB2. Runs entirely in your browser.
          </div>
        </>
      )}
    </div>
  );
};

export default NMR13CViewer;
