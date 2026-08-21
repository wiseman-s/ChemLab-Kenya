import React, { useEffect, useRef, useState } from 'react';

interface Mol3DViewerProps {
  smiles: string;
  height?: string;
}

declare global {
  interface Window {
    $3Dmol: any;
  }
}

const Mol3DViewer: React.FC<Mol3DViewerProps> = ({
  smiles,
  height = '300px'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);

  // Load 3Dmol from CDN
  useEffect(() => {
    // Check if already loaded
    if (window.$3Dmol) {
      setScriptLoaded(true);
      return;
    }

    // Check if script tag already exists
    if (document.querySelector('script[src*="3dmol"]')) {
      // Script tag exists but library may not be ready yet — poll for it
      const checkInterval = setInterval(() => {
        if (window.$3Dmol) {
          setScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.0/3Dmol-min.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ 3Dmol loaded from CDN');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load 3Dmol library from CDN');
    };
    document.head.appendChild(script);

    // Intentionally no cleanup here — we want the script to stay loaded
    // globally rather than being removed/re-added on every unmount.
  }, []);

  // Load molecule when SMILES changes and script is loaded
  useEffect(() => {
    if (!scriptLoaded || !smiles || !containerRef.current) return;
    if (!window.$3Dmol) {
      setError('3Dmol library not available');
      return;
    }

    const loadMolecule = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`http://localhost:5000/generate_3d?smiles=${encodeURIComponent(smiles)}`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.molblock) {
          throw new Error('No molblock returned from server');
        }

        const $3Dmol = window.$3Dmol;

        // Clear container
        while (containerRef.current?.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }

        const viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: 'white',
          defaultcolors: true,
        });

        // NOTE: RDKit's MolToMolBlock() produces an MDL Molfile (V2000/V3000),
        // NOT a Mol2/Tripos file. The correct 3Dmol format string is 'mol',
        // not 'mol2'. Passing 'mol2' here silently fails to parse (no atoms,
        // no error) which is why nothing was rendering before.
        viewer.addModel(data.molblock, 'mol');

        const atomCount = viewer.getModel().selectedAtoms({}).length;
        if (atomCount === 0) {
          throw new Error('Parsed model has no atoms — check molblock format');
        }

        viewer.setStyle({}, {
          stick: { radius: 0.15 },
          sphere: { radius: 0.35 }
        });
        viewer.zoomTo();
        viewer.render();
        viewer.spin(true);

        viewerRef.current = viewer;
        setLoading(false);
      } catch (err) {
        console.error('3D load error:', err);
        setError('Failed to load 3D structure: ' + (err as Error).message);
        setLoading(false);
      }
    };

    loadMolecule();

    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.clear();
          viewerRef.current.removeAllModels();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [scriptLoaded, smiles]);

  const toggleSpin = () => {
    if (viewerRef.current) {
      viewerRef.current.spin(true);
      viewerRef.current.render();
    }
  };

  const resetView = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomTo();
      viewerRef.current.render();
    }
  };

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          border: '1px solid #ccc',
          borderRadius: '8px',
          background: 'white',
          position: 'relative'
        }}
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: '10px', color: '#666' }}>
          ⏳ Loading 3D structure...
        </div>
      )}

      {error && (
        <div style={{ color: '#d32f2f', padding: '10px' }}>
          ❌ {error}
        </div>
      )}

      <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
        <button
          onClick={toggleSpin}
          style={{
            padding: '5px 15px',
            background: '#00897b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Toggle Spin
        </button>
        <button
          onClick={resetView}
          style={{
            padding: '5px 15px',
            background: '#e0e0e0',
            color: '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔍 Reset View
        </button>
      </div>

      <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#666' }}>
        💡 Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
};

export default Mol3DViewer;