import React, { useRef, useState, useEffect } from 'react';
import { Editor } from 'ketcher-react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import 'ketcher-react/dist/index.css';

declare global {
  interface Window {
    ketcher: any;
  }
}

// Created once at module load, not per-render
const structServiceProvider = new StandaloneStructServiceProvider();

type TabKey = 'draw' | 'smiles';

interface KetcherEditorProps {
  height?: string;
}

const exampleBtnStyle: React.CSSProperties = {
  padding: '5px 15px',
  background: '#e0e0e0',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 20px',
  border: 'none',
  borderBottom: active ? '3px solid #00897b' : '3px solid transparent',
  background: 'transparent',
  color: active ? '#00897b' : '#666',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  fontSize: '15px'
});

const EXAMPLES: { label: string; smiles: string }[] = [
  { label: '🍷 Ethanol', smiles: 'CCO' },
  { label: '🍋 Acetic Acid', smiles: 'CC(=O)O' },
  { label: '💊 Aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
  { label: '🔄 Benzene', smiles: 'c1ccccc1' },
  { label: '🍋 Valeric Acid', smiles: 'CC(C)CC(=O)O' },
];

const KetcherEditor: React.FC<KetcherEditorProps> = ({ height = '500px' }) => {
  const ketcherRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('draw');
  const [smilesText, setSmilesText] = useState('CCO');
  const [pendingSmiles, setPendingSmiles] = useState<string | null>(null);

  const handleInit = (ketcher: any) => {
    ketcherRef.current = ketcher;
    window.ketcher = ketcher; // handy for poking at from devtools
    setReady(true);
  };

  const emitSmiles = (smiles: string) => {
    window.dispatchEvent(new CustomEvent('smilesUpdated', { detail: smiles }));
  };

  const getSmilesFromCanvas = async () => {
    if (!ketcherRef.current) return;
    try {
      setError(null);
      const smiles = await ketcherRef.current.getSmiles();
      if (!smiles) {
        setError('Canvas is empty — draw a structure first.');
        return;
      }
      emitSmiles(smiles);
    } catch (err) {
      setError('Could not read structure: ' + (err as Error).message);
    }
  };

  const loadIntoCanvas = async (smiles: string) => {
    const cleanSmiles = smiles.trim();

    if (!cleanSmiles) {
      setError('Invalid SMILES string.');
      return;
    }

    setSmilesText(cleanSmiles);
    setPendingSmiles(cleanSmiles);
    setError(null);

    emitSmiles(cleanSmiles);
  };

  // useEffect to load pending molecule when Ketcher is ready
  useEffect(() => {
    if (!ready || !ketcherRef.current || !pendingSmiles) {
      return;
    }

    const loadPendingMolecule = async () => {
      try {
        await ketcherRef.current.setMolecule(pendingSmiles);
        setPendingSmiles(null);
      } catch (err) {
        console.error('Failed to load molecule into Ketcher:', err);
        setError(
          'Could not display this structure in the molecular editor.'
        );
      }
    };

    loadPendingMolecule();
  }, [ready, pendingSmiles]);

  const submitSmilesText = () => {
    const cleanSmiles = smilesText.trim();

    if (!cleanSmiles) {
      setError('Enter a SMILES string first.');
      return;
    }

    setError(null);
    setPendingSmiles(cleanSmiles);
    emitSmiles(cleanSmiles);
  };

  const loadExample = (smiles: string) => {
    setSmilesText(smiles);
    setPendingSmiles(smiles);
    setError(null);
    emitSmiles(smiles);
  };

  const clearCanvas = () => {
    try {
      ketcherRef.current?.editor?.clear();
    } catch (err) {
      console.error('Could not clear Ketcher:', err);
    }

    setSmilesText('');
    setPendingSmiles(null);
  };

  return (
    <div>
      {/* Persistent quick-paste bar — always visible, no need to switch tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input
          type="text"
          value={smilesText}
          onChange={(e) => setSmilesText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitSmilesText()}
          placeholder="Paste a SMILES string here (e.g., CCO)"
          style={{
            flex: 1,
            padding: '10px',
            border: '2px solid #00897b',
            borderRadius: '4px',
            fontSize: '15px'
          }}
        />
        <button
          onClick={submitSmilesText}
          style={{
            padding: '10px 20px',
            background: '#00897b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '15px',
            whiteSpace: 'nowrap'
          }}
        >
          🔬 Load
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '15px' }}>
        <button
          style={tabStyle(activeTab === 'draw')}
          onClick={() => {
            setActiveTab('draw');

            if (smilesText.trim()) {
              setPendingSmiles(smilesText.trim());
            }
          }}
        >
          ✏️ Draw
        </button>
        <button style={tabStyle(activeTab === 'smiles')} onClick={() => setActiveTab('smiles')}>
          📚 Library
        </button>
      </div>

      {/* Draw tab — canvas stays mounted always so Ketcher's WASM engine
          doesn't reinitialize every time you switch tabs; we just hide it. */}
      <div style={{ display: activeTab === 'draw' ? 'block' : 'none' }}>
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', height }}>
          <Editor
            staticResourcesUrl="/ketcher"
            structServiceProvider={structServiceProvider}
            onInit={handleInit}
            errorHandler={(msg: string) => setError(msg)}
          />
        </div>

        {!ready && !error && (
          <div style={{ padding: '8px 0', fontSize: '0.9rem', color: '#666' }}>
            ⏳ Loading editor engine (first load can take a few seconds)...
          </div>
        )}

        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={getSmilesFromCanvas}
            disabled={!ready}
            style={{
              padding: '8px 20px',
              background: ready ? '#00897b' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: ready ? 'pointer' : 'not-allowed'
            }}
          >
            🔬 Get SMILES & Analyze
          </button>
          <button
            onClick={clearCanvas}
            disabled={!ready}
            style={{
              padding: '8px 20px',
              background: '#e0e0e0',
              border: 'none',
              borderRadius: '4px',
              cursor: ready ? 'pointer' : 'not-allowed'
            }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* SMILES tab — a browsable reference, since quick pasting now lives in the bar above */}
      {activeTab === 'smiles' && (
        <div style={{ padding: '10px 0' }}>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '10px' }}>
            Paste a SMILES string in the box above, or click any structure below to load it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {EXAMPLES.map((ex) => (
              <div
                key={ex.smiles}
                onClick={() => loadExample(ex.smiles)}
                style={{
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0'
                }}
              >
                <strong>{ex.label}</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                  {ex.smiles}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: '#d32f2f', padding: '8px 0', fontSize: '0.9rem' }}>
          ❌ {error}
        </div>
      )}

      {/* Quick examples — shared by both tabs */}
      <div style={{ marginTop: '15px' }}>
        <strong>Quick Examples:</strong>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
          {EXAMPLES.map((ex) => (
            <button key={ex.smiles} onClick={() => loadExample(ex.smiles)} style={exampleBtnStyle}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KetcherEditor;