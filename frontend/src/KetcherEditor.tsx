import React, { useRef, useState, useEffect, useCallback } from 'react';
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

const INIT_TIMEOUT_MS = 15000;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB — structure files are tiny; guards against pasting the wrong file
const ACCEPTED_EXTENSIONS = ['.mol', '.sdf', '.smi', '.txt'];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const [editorKey, setEditorKey] = useState(0); // bump to force a full remount of <Editor>
  const [activeTab, setActiveTab] = useState<TabKey>('draw');
  const [smilesText, setSmilesText] = useState('CCO');
  const [pendingSmiles, setPendingSmiles] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Give the WASM engine a bounded amount of time to report ready; if it
  // never does (blocked asset, slow network, silent failure), surface a
  // retry option instead of leaving the user on a spinner forever.
  useEffect(() => {
    setInitTimedOut(false);
    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);

    initTimeoutRef.current = setTimeout(() => {
      if (!ready) setInitTimedOut(true);
    }, INIT_TIMEOUT_MS);

    return () => {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    };
  }, [editorKey, ready]);

  const handleInit = (ketcher: any) => {
    ketcherRef.current = ketcher;
    window.ketcher = ketcher; // handy for poking at from devtools
    setReady(true);
    setInitTimedOut(false);
    setError(null);
  };

  const reloadEditor = useCallback(() => {
    ketcherRef.current = null;
    setReady(false);
    setInitTimedOut(false);
    setError(null);
    setEditorKey((k) => k + 1); // remount <Editor> from scratch
  }, []);

  const emitSmiles = (smiles: string) => {
    window.dispatchEvent(new CustomEvent('smilesUpdated', { detail: smiles }));
  };

  const getSmilesFromCanvas = async () => {
    if (!ketcherRef.current) {
      setError('The editor is still loading — please wait a moment and try again.');
      return;
    }
    try {
      setError(null);
      const smiles = await ketcherRef.current.getSmiles();
      if (!smiles) {
        setError('Canvas is empty — draw a structure first.');
        return;
      }
      emitSmiles(smiles);
    } catch (err) {
      setError('Could not read structure from the canvas: ' + (err as Error).message);
    }
  };

  // Loads pending structure text (SMILES, or raw molfile/SDF content from
  // an upload) once the editor is ready. Shared by manual SMILES entry,
  // example clicks, and file uploads — one retry-safe path for all three.
  //
  // After a successful load we re-derive the canonical SMILES from Ketcher
  // itself (rather than trusting whatever text we fed in) and emit that.
  // This is what lets uploaded .mol/.sdf files feed the rest of the app
  // (analysis panel etc.) the same way typed SMILES does, without needing
  // to track "was this already a SMILES string" separately.
  useEffect(() => {
    if (!ready || !ketcherRef.current || !pendingSmiles) {
      return;
    }

    const loadPendingMolecule = async () => {
      try {
        await ketcherRef.current.setMolecule(pendingSmiles);
        setPendingSmiles(null);

        try {
          const canonicalSmiles = await ketcherRef.current.getSmiles();
          if (canonicalSmiles) {
            setSmilesText(canonicalSmiles);
            emitSmiles(canonicalSmiles);
          }
        } catch (smilesErr) {
          // The structure loaded fine but SMILES extraction failed — rare,
          // but don't block the user over it; they can still hit
          // "Get SMILES & Analyze" manually.
          console.warn('Loaded structure but could not derive SMILES:', smilesErr);
        }
      } catch (err) {
        console.error('Failed to load structure into Ketcher:', err);
        setError(
          'Could not display this structure — check that it\'s valid, then try again.'
        );
        // Clear pendingSmiles even on failure. Leaving it set would mean
        // resubmitting the exact same text does nothing, since React sees
        // no state change and this effect never re-fires.
        setPendingSmiles(null);
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
  };

  const loadExample = (smiles: string) => {
    setSmilesText(smiles);
    setError(null);
    setPendingSmiles(smiles);
  };

  const clearCanvas = async () => {
    if (!ketcherRef.current) {
      setSmilesText('');
      setPendingSmiles(null);
      setError(null);
      return;
    }
    try {
      // Prefer the public setMolecule API over reaching into internal
      // properties like `.editor.clear()`, which isn't part of Ketcher's
      // documented interface and can break across library versions.
      await ketcherRef.current.setMolecule('');
      setError(null);
    } catch (err) {
      console.error('Could not clear Ketcher:', err);
      setError('Could not clear the canvas — try the Reload Editor button below.');
    }
    setSmilesText('');
    setPendingSmiles(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input immediately so selecting the same file again still
    // fires onChange (browsers otherwise dedupe identical selections).
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    setError(null);

    const extension = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError(
        `Unsupported file type "${extension}". Please upload one of: ${ACCEPTED_EXTENSIONS.join(', ')}`
      );
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(
        `That file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
        `Structure files should be under ${MAX_UPLOAD_BYTES / 1024 / 1024}MB — ` +
        `double-check you picked the right file.`
      );
      return;
    }

    setUploading(true);
    const reader = new FileReader();

    reader.onload = () => {
      setUploading(false);
      const content = (reader.result as string)?.trim();
      if (!content) {
        setError('That file appears to be empty.');
        return;
      }

      // .smi/.txt are treated as plain SMILES (first non-empty line, in
      // case of trailing name/ID columns some tools append).
      // .mol/.sdf content is passed through as-is — Ketcher's setMolecule
      // auto-detects molfile/SDF format.
      let structureText = content;
      if (extension === '.smi' || extension === '.txt') {
        const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) || '';
        structureText = firstLine.split(/\s+/)[0]; // drop any trailing name/ID after whitespace
      }

      if (!structureText) {
        setError('Could not find a structure in that file.');
        return;
      }

      // Feed it into the same pendingSmiles pipeline used everywhere else.
      // Once loaded, the canonical SMILES is re-derived from Ketcher and
      // emitted automatically (see the loadPendingMolecule effect) —
      // works the same whether this came from a .smi/.txt SMILES line or
      // a full .mol/.sdf structure.
      setPendingSmiles(structureText);
    };

    reader.onerror = () => {
      setUploading(false);
      setError('Could not read that file — it may be corrupted or in an unreadable encoding.');
    };

    reader.readAsText(file);
  };

  return (
    <div>
      {/* Persistent quick-paste bar — always visible, no need to switch tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={smilesText}
          onChange={(e) => setSmilesText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitSmilesText()}
          placeholder="Paste a SMILES string here (e.g., CCO)"
          style={{
            flex: 1,
            minWidth: '200px',
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
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '10px 20px',
            background: uploading ? '#ccc' : '#e0e0e0',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'default' : 'pointer',
            fontSize: '15px',
            whiteSpace: 'nowrap'
          }}
        >
          {uploading ? '⏳ Reading...' : '📁 Upload File'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mol,.sdf,.smi,.txt"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
      <div style={{ marginTop: '-10px', marginBottom: '15px', fontSize: '0.8rem', color: '#888' }}>
        Accepts .mol, .sdf, .smi, or .txt files (max {MAX_UPLOAD_BYTES / 1024 / 1024}MB)
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
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', height, position: 'relative' }}>
          <Editor
            key={editorKey}
            staticResourcesUrl="/ketcher"
            structServiceProvider={structServiceProvider}
            onInit={handleInit}
            errorHandler={(msg: string) => setError(msg)}
          />
        </div>

        {!ready && !initTimedOut && (
          <div style={{ padding: '8px 0', fontSize: '0.9rem', color: '#666' }}>
            ⏳ Loading editor engine (first load can take a few seconds)...
          </div>
        )}

        {!ready && initTimedOut && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: '#fff3e0',
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: '#7a5c00',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <span>⚠️ The editor is taking longer than expected to load. It may be a slow connection, or it failed to start.</span>
            <button
              onClick={reloadEditor}
              style={{
                padding: '6px 14px',
                background: '#00897b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🔄 Retry
            </button>
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
          <button
            onClick={reloadEditor}
            title="If the canvas is acting up, this reloads the editor engine from scratch"
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#666',
              fontSize: '0.85rem'
            }}
          >
            🔄 Reload Editor
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
        <div style={{
          color: '#d32f2f',
          padding: '8px 10px',
          background: '#ffebee',
          borderRadius: '4px',
          fontSize: '0.9rem',
          marginTop: '10px'
        }}>
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
