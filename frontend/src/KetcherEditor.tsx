import React, { useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import 'ketcher-react/dist/index.css';

declare global {
  interface Window {
    ketcher: any;
  }
}

const Editor = lazy(() =>
  import('ketcher-react').then((module) => ({ default: module.Editor }))
);

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

interface KetcherEditorProps {
  height?: string;
}

// Increased from 15s to 45s — the Standalone WASM engine is heavy (~10MB)
// and on school Wi-Fi it regularly exceeds 20-30 seconds on first load.
const INIT_TIMEOUT_MS = 45000;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.mol', '.sdf', '.smi', '.txt'];

const exampleBtnStyle: React.CSSProperties = {
  padding: '5px 15px',
  background: '#e0e0e0',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  touchAction: 'manipulation'
};

const EXAMPLES: { label: string; smiles: string }[] = [
  { label: 'Ethanol', smiles: 'CCO' },
  { label: 'Acetic Acid', smiles: 'CC(=O)O' },
  { label: 'Aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
  { label: 'Benzene', smiles: 'c1ccccc1' },
  { label: 'Valeric Acid', smiles: 'CC(C)CC(=O)O' },
];

const KetcherEditor: React.FC<KetcherEditorProps> = ({ height = '500px' }) => {
  const ketcherRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [activated, setActivated] = useState(false);
  const [smilesText, setSmilesText] = useState('CCO');
  const [pendingSmiles, setPendingSmiles] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [structProvider, setStructProvider] = useState<any>(null);
  const [structProviderError, setStructProviderError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Load ketcher-standalone WASM engine once, on activation.
  useEffect(() => {
    if (!activated || structProvider) return;

    let cancelled = false;
    import('ketcher-standalone')
      .then(({ StandaloneStructServiceProvider }) => {
        if (!cancelled) setStructProvider(new StandaloneStructServiceProvider());
      })
      .catch((err) => {
        if (!cancelled) {
          setStructProviderError(
            'Could not load the chemistry engine. Check your internet connection and tap Retry.'
          );
          console.error('Ketcher standalone load error:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activated, structProvider]);

  // Timer to detect "stuck" editor + show progress seconds.
  useEffect(() => {
    if (!activated || ready) {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      return;
    }

    setInitTimedOut(false);
    setElapsed(0);

    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    initTimeoutRef.current = setTimeout(() => {
      if (!ready) setInitTimedOut(true);
    }, INIT_TIMEOUT_MS);

    return () => {
      clearInterval(tick);
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    };
  }, [activated, editorKey, ready]);

  const handleInit = (ketcher: any) => {
    ketcherRef.current = ketcher;
    window.ketcher = ketcher;
    setReady(true);
    setInitTimedOut(false);
    setError(null);
  };

  const activate = useCallback(() => {
    setActivated(true);
    setError(null);
  }, []);

  const reloadEditor = useCallback(() => {
    ketcherRef.current = null;
    setReady(false);
    setInitTimedOut(false);
    setError(null);
    setStructProvider(null);
    setStructProviderError(null);
    setElapsed(0);
    setEditorKey((k) => k + 1);
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

  useEffect(() => {
    if (!ready || !ketcherRef.current || !pendingSmiles) return;

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
        setError('Could not display this structure — check that it\'s valid, then try again.');
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
    activate();
    setPendingSmiles(cleanSmiles);
  };

  const loadExample = (smiles: string) => {
    setSmilesText(smiles);
    activate();
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
      setError(`Unsupported file type "${extension}". Please upload one of: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(
        `That file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
        `Structure files should be under ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`
      );
      return;
    }

    activate();
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
      setError('Could not read that file — it may be corrupted.');
    };

    reader.readAsText(file);
  };

  return (
    <div>
      {/* Quick-paste bar */}
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
            fontSize: isMobileDevice ? '16px' : '15px',
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
          Load
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
          {uploading ? 'Reading...' : 'Upload File'}
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

      {/* Quick examples */}
      <div style={{ marginBottom: '15px' }}>
        <strong style={{ fontSize: '0.9rem' }}>Quick Examples:</strong>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
          {EXAMPLES.map((ex) => (
            <button key={ex.smiles} onClick={() => loadExample(ex.smiles)} style={exampleBtnStyle}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {!activated ? (
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
          <div style={{ fontSize: '13px', marginTop: '5px', maxWidth: '300px' }}>
            The drawing tools take <strong>15-30 seconds</strong> to load on the first visit.
            After that, they load instantly from your browser cache.
          </div>
          <button
            onClick={activate}
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
          <div style={{ maxWidth: '400px' }}>{structProviderError}</div>
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
            Retry
          </button>
        </div>
      ) : !structProvider ? (
        <div style={{
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
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧪</div>
          <div style={{ fontWeight: 'bold' }}>Starting chemistry engine...</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
            Downloading drawing tools ({elapsed}s)
          </div>
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
                <div>Loading molecular editor...</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>({elapsed}s)</div>
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

      {activated && structProvider && !ready && !initTimedOut && (
        <div style={{ padding: '8px 0', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          Initializing editor ({elapsed}s / 45s max)...
        </div>
      )}

      {activated && !ready && initTimedOut && (
        <div style={{
          marginTop: '10px',
          padding: '12px',
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
          <span>
            <strong>The editor is still loading after 45 seconds.</strong><br />
            <span style={{ fontSize: '0.85rem' }}>
              This is unusual. Check your internet connection, or tap Retry.
            </span>
          </span>
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
            Retry
          </button>
        </div>
      )}

      {activated && (
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
            Get SMILES & Analyze
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
            Clear
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
            Reload Editor
          </button>
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
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default KetcherEditor;
