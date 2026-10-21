// src/NMRViewer.tsx

import React, { useState } from 'react';
import { API_URL } from './config';
import { useGuestLimits } from './contexts/GuestLimitsContext';

interface NMRSignal {
  shift: number;
  integral: number;
  multiplicity: string;
  count?: number;
}

interface NMRData {
  success: boolean;
  source: string;
  nucleus: string;
  signals: NMRSignal[];
  peakCount: number;
  smiles: string;
  note?: string;
  error?: string;
}

const NMRViewer: React.FC<{ smiles: string }> = ({ smiles }) => {
  const [data, setData] = useState<NMRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nucleus, setNucleus] = useState<'1H' | '13C'>('1H');
  const [lastPredictedSmiles, setLastPredictedSmiles] = useState<string | null>(null);

  const { tryUse, remaining } = useGuestLimits();
  const remainingNMR = remaining('nmr');

  const predict = async () => {
    if (!smiles) {
      setError('Draw a molecule first.');
      return;
    }

    // Guest limit — only fires on button click.
    if (!tryUse('nmr')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/predict_nmr?smiles=${encodeURIComponent(smiles)}&nucleus=${nucleus}`
      );
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const result: NMRData = await response.json();
      if (result.error || !result.success) {
        throw new Error(result.error || 'NMR prediction failed');
      }
      setData(result);
      setLastPredictedSmiles(smiles);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getMultiplicityLabel = (mult: string) => {
    const labels: Record<string, string> = {
      's': 'Singlet',
      'd': 'Doublet',
      't': 'Triplet',
      'q': 'Quartet',
      'quint': 'Quintet',
      'sext': 'Sextet',
      'm': 'Multiplet',
      'dd': 'Doublet of doublets',
      'dt': 'Doublet of triplets',
      'td': 'Triplet of doublets',
      'dq': 'Doublet of quartets',
      'CH3': 'CH3',
      'CH2': 'CH2',
      'CH': 'CH',
      'C': 'C (no attached H)',
    };
    return labels[mult] || mult;
  };

  if (!smiles) {
    return (
      <div style={{ color: '#666', padding: '15px', textAlign: 'center' }}>
        Draw a molecule first to predict its NMR spectrum.
      </div>
    );
  }

  // Show a stale-warning if the canvas has changed since the last prediction
  const isStale = data !== null && lastPredictedSmiles !== smiles;

  return (
    <div style={{
      padding: '15px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      marginTop: '15px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h4 style={{ color: '#00695c', margin: 0 }}>NMR Prediction</h4>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {Number.isFinite(remainingNMR) && (
            <span style={{ fontSize: '11px', color: '#888' }}>
              {remainingNMR} free left
            </span>
          )}

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setNucleus('1H')}
              aria-pressed={nucleus === '1H'}
              disabled={loading}
              style={{
                padding: '4px 12px',
                background: nucleus === '1H' ? '#00897b' : '#e0e0e0',
                color: nucleus === '1H' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'default' : 'pointer',
                fontSize: '12px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              1H
            </button>
            <button
              onClick={() => setNucleus('13C')}
              aria-pressed={nucleus === '13C'}
              disabled={loading}
              style={{
                padding: '4px 12px',
                background: nucleus === '13C' ? '#00897b' : '#e0e0e0',
                color: nucleus === '13C' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'default' : 'pointer',
                fontSize: '12px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              13C
            </button>
          </div>

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
            {loading ? 'Predicting...' : 'Predict NMR'}
          </button>
        </div>
      </div>

      {!data && !loading && !error && (
        <div style={{ color: '#666', fontSize: '13px', marginTop: '10px' }}>
          Click <strong>Predict NMR</strong> to run a {nucleus} spectrum prediction
          for the current structure.
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
          The structure has changed since this prediction. Click <strong>Predict NMR</strong> again to refresh.
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Predicting NMR spectrum...
        </div>
      )}

      {error && (
        <div style={{ color: '#d32f2f', padding: '10px', background: '#ffebee', borderRadius: '4px', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}

      {data && data.success && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px',
            marginTop: '10px',
            fontSize: '13px',
          }}>
            <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              <strong>Signals</strong>
              <div>{data.peakCount}</div>
            </div>
            <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              <strong>Nucleus</strong>
              <div>{data.nucleus}</div>
            </div>
            <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              <strong>Source</strong>
              <div>{data.source}</div>
            </div>
          </div>

          {data.source === 'fallback' && (
            <div style={{
              marginTop: '10px',
              padding: '8px 10px',
              background: '#fff3e0',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#7a5c00',
            }}>
              Note: This is a rough estimate, not a database-backed prediction
              {data.note ? ` (${data.note})` : ''}. Treat these numbers as
              approximate.
            </div>
          )}

          {data.signals && data.signals.length > 0 ? (
            <div style={{ marginTop: '10px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#e0e0e0' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>d (ppm)</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>
                      {data.nucleus === '13C' ? 'Carbon Type' : 'Multiplicity'}
                    </th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Integral</th>
                  </tr>
                </thead>
                <tbody>
                  {data.signals.map((peak, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px', fontWeight: 'bold', color: '#00695c' }}>
                        {peak.shift.toFixed(2)}
                      </td>
                      <td style={{ padding: '6px' }}>{getMultiplicityLabel(peak.multiplicity)}</td>
                      <td style={{ padding: '6px' }}>{peak.integral}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: '#666', padding: '10px' }}>No NMR signals predicted.</div>
          )}

          <div style={{ marginTop: '10px', fontSize: '11px', color: '#999' }}>
            * {data.source === 'nmrshiftdb2'
              ? 'From nmrshiftdb2 (measured or HOSE-code predicted)'
              : 'Rough rule-based estimate'}
          </div>
        </>
      )}
    </div>
  );
};

export default NMRViewer;
