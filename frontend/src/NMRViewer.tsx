// src/NMRViewer.tsx

import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from './config';

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
  error?: string;
}

const DEBOUNCE_MS = 500;

const NMRViewer: React.FC<{ smiles: string }> = ({ smiles }) => {
  const [data, setData] = useState<NMRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nucleus, setNucleus] = useState<'1H' | '13C'>('1H');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!smiles) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // 13C isn't supported by the backend yet — show a clear message
    // instead of firing a request that's guaranteed to fail.
    if (nucleus === '13C') {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    // Debounce so we don't hit the backend (and nmrdb.org behind it)
    // on every keystroke/draw update while someone is editing a structure.
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);

      fetch(
        `${API_URL}/api/predict_nmr?smiles=${encodeURIComponent(smiles)}&nucleus=${nucleus}`,
        { signal: controller.signal }
      )
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }
          const result: NMRData = await response.json();
          if (result.error || !result.success) {
            throw new Error(result.error || 'NMR prediction failed');
          }
          if (!cancelled) {
            setData(result);
          }
        })
        .catch((err: unknown) => {
          if (cancelled || (err as Error).name === 'AbortError') return;
          setError((err as Error).message);
          setData(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [smiles, nucleus]);

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
    };
    return labels[mult] || mult;
  };

  if (!smiles) {
    return (
      <div style={{ color: '#666', padding: '15px', textAlign: 'center' }}>
        🧪 Draw a molecule first to predict its NMR spectrum.
      </div>
    );
  }

  return (
    <div style={{
      padding: '15px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      marginTop: '15px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h4 style={{ color: '#00695c', margin: 0 }}>🧪 NMR Prediction</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
            ¹H
          </button>
          <button
            onClick={() => setNucleus('13C')}
            aria-pressed={nucleus === '13C'}
            disabled={loading}
            title="13C prediction is coming soon"
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
            ¹³C
          </button>
          {data && (
            <span style={{ fontSize: '11px', color: '#999' }}>
              via {data.source}
            </span>
          )}
        </div>
      </div>

      {nucleus === '13C' && (
        <div style={{ color: '#666', padding: '15px', textAlign: 'center' }}>
          ¹³C prediction isn't available yet — switch to ¹H above.
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          ⏳ Predicting NMR spectrum...
        </div>
      )}

      {error && (
        <div style={{ color: '#d32f2f', padding: '10px', background: '#ffebee', borderRadius: '4px', marginTop: '10px' }}>
          ❌ {error}
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

          {data.signals && data.signals.length > 0 ? (
            <div style={{ marginTop: '10px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#e0e0e0' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>δ (ppm)</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Multiplicity</th>
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
            * {data.source === 'nmrdb.org' ? 'Predicted by nmrdb.org SPINUS neural network' : 'Rule-based prediction'}
          </div>
        </>
      )}
    </div>
  );
};

export default NMRViewer;
