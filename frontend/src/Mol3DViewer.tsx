// src/Mol3DViewer.tsx

import React, { useEffect, useRef, useState } from 'react';
import { API_URL } from './config';

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

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // Load 3Dmol from CDN
  useEffect(() => {
    if (window.$3Dmol) {
      console.log('✅ 3Dmol already loaded');
      setScriptLoaded(true);
      return;
    }

    if (document.querySelector('script[src*="3dmol"]')) {
      const checkInterval = setInterval(() => {
        if (window.$3Dmol) {
          setScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    console.log('📥 Loading 3Dmol from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.0/3Dmol-min.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ 3Dmol loaded from CDN');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Failed to load 3Dmol from CDN');
      setError('Failed to load 3Dmol library from CDN');
    };
    document.head.appendChild(script);

    return () => {
      const scriptElement = document.querySelector('script[src*="3dmol"]');
      if (scriptElement) {
        document.head.removeChild(scriptElement);
      }
    };
  }, []);

  // Load molecule when SMILES changes and script is loaded
  useEffect(() => {
    console.log('🔍 useEffect triggered - scriptLoaded:', scriptLoaded, 'smiles:', smiles);
    
    if (!scriptLoaded) {
      console.log('⏳ Waiting for 3Dmol script to load...');
      return;
    }
    
    if (!smiles) {
      console.log('⏳ No SMILES provided');
      return;
    }
    
    if (!containerRef.current) {
      console.log('⏳ Container not ready');
      return;
    }
    
    if (!window.$3Dmol) {
      console.error('❌ 3Dmol library not available');
      setError('3Dmol library not available');
      return;
    }

    const loadMolecule = async () => {
      console.log('🔄 Loading molecule:', smiles);
      setLoading(true);
      setError(null);
      
      try {
        // ✅ FIXED: Use API_URL from config
        const url = `${API_URL}/generate_3d?smiles=${encodeURIComponent(smiles)}`;
        console.log('📡 Fetching:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        console.log('📦 Data received:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        const $3Dmol = window.$3Dmol;
        console.log('🔧 3Dmol library available');
        
        // Clear container
        while (containerRef.current?.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        console.log('🧹 Container cleared');
        
        console.log('🎨 Creating viewer...');
        const viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: 'white',
          defaultcolors: true,
          // Mobile-friendly settings
          antialias: !isMobile(),
          quality: isMobile() ? 'low' : 'high',
        });
        console.log('✅ Viewer created');
        
        console.log('📊 Adding model...');
        viewer.addModel(data.molblock, 'mol');
        console.log('✅ Model added');
        
        console.log('🎨 Setting style...');
        viewer.setStyle({}, {
          stick: { radius: 0.15 },
          sphere: { radius: 0.35 }
        });
        console.log('✅ Style set');
        
        console.log('🔍 Zooming...');
        viewer.zoomTo();
        console.log('✅ Zoomed');
        
        console.log('🔄 Rendering...');
        viewer.render();
        console.log('✅ Rendered');
        
        console.log('🔄 Spinning...');
        viewer.spin(true);
        console.log('✅ Spinning');
        
        viewerRef.current = viewer;
        setLoading(false);
        console.log('🎉 3D structure loaded successfully!');
      } catch (err) {
        console.error('❌ 3D load error:', err);
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
    <div style={{ position: 'relative' }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height, 
          minHeight: '200px',
          border: '1px solid #ccc', 
          borderRadius: '8px',
          background: 'white',
          position: 'relative',
          touchAction: 'none',
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

      {/* Mobile instructions */}
      {isMobile() && !loading && !error && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '11px',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          👆 Drag to rotate • Pinch to zoom
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
