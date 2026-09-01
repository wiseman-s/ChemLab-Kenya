import React, { useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import 'ketcher-react/dist/index.css';

declare global {
  interface Window {
    ketcher: any;
  }
}

// Both of these are dynamically imported at runtime instead of statically
// at the top of the file. A static `import ... from 'ketcher-standalone'`
// here would run the moment KetcherEditor.tsx itself loads — and since
// App.tsx imports KetcherEditor statically too, that would drag the WASM
// engine into the initial bundle regardless of the lazy() below. Wrapping
// the UI component in lazy() alone doesn't help if its dependency is still
// imported eagerly one line above it.
const Editor = lazy(() =>
  import('ketcher-react').then((module) => ({ default: module.Editor }))
);

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

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
  cursor: 'pointer',
  touchAction: 'manipulation'
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 20px',
  border: 'none',
  borderBottom: active ? '3px solid #00897b' : '3px solid transparent',
  background: 'transparent',
  color: active ? '#00897b' : '#666',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  fontSize: '15px',
  touchAction: 'manipulation'
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
  const [activeTab, setActiveTab] = useState<TabKey>('draw'); // unchanged default
  const [drawTabActivated, setDrawTabActivated] = useState(false); // gates the actual lazy load
  const [smilesText, setSmilesText] = useState('CCO');
  const [pendingSmiles, setPendingSmiles] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [structProvider, setStructProvider] = useState<any>(null);
  const [structProviderError, setStructProviderError] = useState<string | null>(null);

  // Loads ketcher-standalone (the WASM structure service) only once the
  // Draw tab is activated — this is the other half of the lazy-load fix,
  // alongside the lazy() import of the Editor component above. Without
  // this, ketcher-standalone would still load eagerly with the rest of
  // the app even though the Editor UI itself was deferred.
  useEffect(() => {
    if (!drawTabActivated || structProvider) return;

    let cancelled = false;
    import('ketcher-standalone')
      .then(({ StandaloneStructServiceProvider }) => {
        if (!cancelled) setStructProvider(new StandaloneStructServiceProvider());
      })
      .catch((err) => {
        if (!cancelled) {
          setStructProviderError('Could not load the chemistry engine: ' + (err as Error).message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [drawTabActivated, structProvider]);

  // Only start the "is it stuck?" timer once loading has actually begun
  // (i.e. after the user has triggered the lazy load), not on mount.
  useEffect(() => {
    if (!drawTabActivated) return;

    setInitTimedOut(false);
    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);

    initTimeoutRef.current = setTimeout(() => {
      if (!ready) setInitTimedOut(true);
    }, INIT_TIMEOUT_MS);

    return () => {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    };
  }, [drawTabActivated, editorKey, ready]);

  const handleInit = (ketcher: any) => {
    ketcherRef.current = ketcher;
    window.ketcher = ketcher; // handy for poking at from devtools
    setReady(true);
    setInitTimedOut(false);
    setError(null);
  };

  // Triggers the actual lazy load. Called by the Draw tab button, the
  // "Tap to Load Editor" placeholder, or automatically by file upload
  // (since uploading a structure implies wanting to see it on canvas).
  const activateDrawTab = useCallback(() => {
    setDrawTabActivated(true);
    setActiveTab('draw');
    setError(null);
  }, []);

  const reloadEditor = useCallback(() => {
    ketcherRef.current = null;
    setReady(false);
    setInitTimedOut(false);
    setError(null);
    setStructProvider(null);
    setStructProviderError(null);
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
  // itself and emit that, so uploaded .mol/.sdf files feed the rest of the
  // app (analysis panel etc.) the same way typed SMILES does.
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
          console.warn('Loaded structure but could not derive SMILES:', smilesErr);
        }
      } catch (err) {
        console.error('Failed to load structure into Ketcher:', err);
        setError(
          'Could not display this structure — check that it\'s valid, then try again.'
        );
        // Clear pendingSmiles even on failure, so retrying with the exact
        // same text isn't a no-op (React sees no state change otherwise).
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
      // Public setMolecule API, not the undocumented `.editor.clear()`
      // internal property, which can break across Ketcher versions.
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

    // Uploading implies the user wants to see it on the canvas — trigger
    // the lazy load now so the editor is warming up while we read the file.
    activateDrawTab();

    setUploading(true);
    const reader = new FileReader();

    reader.onload = () => {
      setUploading(false);
      const content = (reader.result as string)?.trim();
      if (!content) {
        setError('That file appears to be empty.');
        return;
      }

      let structureText = content;
      if (extension === '.smi' || extension === '.txt') {
        const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) || '';
        structureText = firstLine.split(/\s+/)[0];
      }

      if (!structureText) {
        setError('Could not find a structure in that file.');
        return;
      }

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
            fontSize: isMobileDevice ? '16px' : '15px', // 16px avoids iOS auto-zoom-on-focus
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
            whiteSpace: 'nowrap',
            touchAction: 'manipulation'
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
            whiteSpace: 'nowrap',
            touchAction: 'manipulation'
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
            activateDrawTab();
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

      {/* Draw tab */}
      <div style={{ display: activeTab === 'draw' ? 'block' : 'none' }}>
        {!drawTabActivated ? (
          // Nothing has loaded yet — no network request has fired for the
          // Ketcher bundle. This is what actually fixes the slow-load
          // complaint: the heavy engine only starts downloading here.
          <div
            style={{
              height,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fafafa',
              border: '1px solid #ddd',
              borderRadius: '8px',
              color: '#666',
              textAlign: 'center',
              padding: '20px'
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>✏️</div>
            <div style={{ fontWeight: 'bold', color: '#00695c' }}>Tap to Load Molecular Editor</div>
            <div style={{ fontSize: '13px', marginTop: '5px' }}>
              Loads the drawing tools. Takes a few seconds on first load.
            </div>
            <button
              onClick={activateDrawTab}
              style={{
                marginTop: '15px',
                padding: '10px 30px',
                background: '#00897b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              Load Editor
            </button>
          </div>
        ) : structProviderError ? (
          <div style={{
            height,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff3e0',
            border: '1px solid #ffcc80',
            borderRadius: '8px',
            color: '#7a5c00',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
            <div>{structProviderError}</div>
            <button
              onClick={reloadEditor}
              style={{
                marginTop: '15px',
                padding: '8px 20px',
                background: '#00897b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              🔄 Retry
            </button>
          </div>
        ) : !structProvider ? (
          // ketcher-standalone (the WASM structure service) is still being
          // fetched — the Editor UI component isn't even requested yet.
          <div style={{
            height,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            border: '1px solid #ddd',
            borderRadius: '8px',
            color: '#666'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧪</div>
            <div>⏳ Starting chemistry engine...</div>
          </div>
        ) : (
          <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', height, position: 'relative' }}>
            <Suspense
              fallback={
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fafafa',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧪</div>
                  <div>⏳ Loading molecular editor...</div>
                </div>
              }
            >
              <Editor
                key={editorKey}
                staticResourcesUrl="/ketcher"
                structServiceProvider={structProvider}
                onInit={handleInit}
                errorHandler={(msg: string) => setError(msg)}
              />
            </Suspense>
          </div>
        )}

        {drawTabActivated && structProvider && !ready && !initTimedOut && (
          <div style={{ padding: '8px 0', fontSize: '0.9rem', color: '#666' }}>
            ⏳ Initializing editor (first load can take a few seconds)...
          </div>
        )}

        {drawTabActivated && !ready && initTimedOut && (
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
            <span>⚠️ The editor is taking longer than expected. It may be a slow connection, or it failed to start.</span>
            <button
              onClick={reloadEditor}
              style={{
                padding: '6px 14px',
                background: '#00897b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                touchAction: 'manipulation'
              }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {drawTabActivated && (
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
                cursor: ready ? 'pointer' : 'not-allowed',
                touchAction: 'manipulation'
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
                cursor: ready ? 'pointer' : 'not-allowed',
                touchAction: 'manipulation'
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
                fontSize: '0.85rem',
                touchAction: 'manipulation'
              }}
            >
              🔄 Reload Editor
            </button>
          </div>
        )}
      </div>

      {/* SMILES/Library tab — no dependency on Ketcher at all, always fast */}
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
                  border: '1px solid #e0e0e0',
                  touchAction: 'manipulation'
                }}
              >
                <strong>{ex.label}</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#666', marginTop: '4px', wordBreak: 'break-all' }}>
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

      {/* Quick examples — shared by both tabs. Clicking one queues the
          structure but doesn't force-load Ketcher; it'll apply once the
          Draw tab is actually opened. */}
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
