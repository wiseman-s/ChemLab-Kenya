import React, { useState, useEffect } from 'react';
import KetcherEditor from './KetcherEditor';
import Mol3DViewer from './Mol3DViewer';
import NMRViewer from './NMRViewer';
import EquationBalancer from './EquationBalancer';
import ChemCalculators from './ChemCalculators';
import PhysicsCalculators from './PhysicsCalculators';
import PeriodicTableExplorer from './PeriodicTableExplorer';
import CompoundExplorer from './components/CompoundExplorer';
import ChatBot from './ChatBot';
import './App.css';

// Import the API URL from config
import { API_URL } from './config';

interface MoleculeData {
  smiles: string;
  canonical_smiles: string;
  formula: string;
  molecular_weight: number;
  exact_molecular_weight: number;
  logp: number;
  tpsa: number;
  heavy_atoms: number;
  h_bond_donors: number;
  h_bond_acceptors: number;
  num_atoms: number;
  rotatable_bonds: number;
  ring_count: number;
  aromatic_rings: number;
  saturated_rings: number;
  aliphatic_rings: number;
  fraction_csp3: number;
  num_heteroatoms: number;
  num_stereocenters: number;
  valence_electrons: number;
  formal_charge: number;
  molar_refractivity: number;
  inchi?: string;
  inchi_key?: string;
  qed_score: number;
  lipinski_violations: number;
  lipinski_pass: boolean;
  error?: string;
}

type Section =
  | 'analyzer'
  | 'balancer'
  | 'calculators'
  | 'periodic'
  | 'compound'
  | 'physics';

const cardStyle: React.CSSProperties = {
  background: 'white',
  padding: '10px',
  borderRadius: '4px'
};

const sectionHeaderStyle: React.CSSProperties = {
  color: '#00695c',
  marginTop: '20px',
  marginBottom: '10px'
};

const navBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '12px 20px',
  border: 'none',
  borderBottom: active
    ? '3px solid #00897b'
    : '3px solid transparent',
  background: 'transparent',
  color: active ? '#00897b' : '#666',
  fontWeight: active ? 700 : 500,
  cursor: 'pointer',
  fontSize: '15px'
});

const panelStyle: React.CSSProperties = {
  padding: '20px',
  background: '#f5f5f5',
  borderRadius: '8px'
};

function App() {
  const [section, setSection] =
    useState<Section>('analyzer');

  const [analysis, setAnalysis] =
    useState<MoleculeData | null>(null);

  const [loading, setLoading] = useState(false);

  const [smilesInput, setSmilesInput] =
    useState('CCO');

  const analyzeMolecule = async (smiles: string) => {
    if (!smiles) {
      alert('Please enter a SMILES string or draw a molecule');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/analyze?smiles=${encodeURIComponent(smiles)}`
      );

      const data = await response.json();

      setAnalysis(data);

      if (data.error) {
        console.error('Analysis error:', data.error);
      }
    } catch (error) {
      console.error('Error analyzing molecule:', error);

      setAnalysis({
        error:
          "Failed to connect to backend. Make sure it's running on port 5000."
      } as MoleculeData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleSmilesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newSmiles = customEvent.detail;

      setSmilesInput(newSmiles);
      analyzeMolecule(newSmiles);
    };

    window.addEventListener(
      'smilesUpdated',
      handleSmilesUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        'smilesUpdated',
        handleSmilesUpdate as EventListener
      );
    };
  }, []);

  useEffect(() => {
    analyzeMolecule('CCO');
  }, []);

  // Set document title
  useEffect(() => {
    document.title = 'ChemLab Kenya - Chemistry and Physics Software';
  }, []);

  return (
    <div className="App">

      {/* Header */}
      <header>
        <h1>ChemLab Kenya</h1>

        <p>
          Chemistry and Physics Software for Kenyan Schools and Universities
        </p>
      </header>

      {/* Top-level navigation */}
      <nav
        style={{
          display: 'flex',
          borderBottom: '2px solid #ddd',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}
      >
        <button
          style={navBtnStyle(section === 'analyzer')}
          onClick={() => setSection('analyzer')}
        >
          Molecule Analyzer
        </button>

        <button
          style={navBtnStyle(section === 'balancer')}
          onClick={() => setSection('balancer')}
        >
          Equation Balancer
        </button>

        <button
          style={navBtnStyle(section === 'calculators')}
          onClick={() => setSection('calculators')}
        >
          Chem Calculators
        </button>

        <button
          style={navBtnStyle(section === 'periodic')}
          onClick={() => setSection('periodic')}
        >
          Periodic Table
        </button>

        <button
          style={navBtnStyle(section === 'compound')}
          onClick={() => setSection('compound')}
        >
          Compound Explorer
        </button>

        <button
          style={navBtnStyle(section === 'physics')}
          onClick={() => setSection('physics')}
        >
          Physics Calculators
        </button>
      </nav>

      <main>

        {/* =====================================================
            MOLECULE ANALYZER
        ====================================================== */}
        {section === 'analyzer' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}
          >

            <div>
              <h3>Molecular Editor</h3>

              <KetcherEditor />

              {loading && (
                <div
                  style={{
                    marginTop: '10px',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}
                >
                  Analyzing...
                </div>
              )}
            </div>

            <div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '10px'
                }}
              >
                <h3>Analysis Results</h3>
              </div>

              {analysis &&
                !analysis.error &&
                analysis.smiles && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4>3D Structure</h4>

                    <Mol3DViewer
                      smiles={analysis.smiles}
                      height="300px"
                    />
                  </div>
                )}

              {analysis && !analysis.error && analysis.smiles && (
                <NMRViewer smiles={analysis.smiles} />
              )}

              <div style={panelStyle}>

                {analysis ? (

                  analysis.error ? (

                    <div style={{ color: '#d32f2f' }}>
                      <strong>Error:</strong>{' '}
                      {analysis.error}
                    </div>

                  ) : (

                    <div>

                      <h4
                        style={{
                          color: '#00695c',
                          marginBottom: '15px'
                        }}
                      >
                        {analysis.formula}
                      </h4>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px'
                        }}
                      >

                        <div style={cardStyle}>
                          <strong>SMILES</strong>

                          <div
                            style={{
                              fontSize: '0.9rem',
                              wordBreak: 'break-all'
                            }}
                          >
                            {analysis.smiles}
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Canonical SMILES</strong>

                          <div
                            style={{
                              fontSize: '0.9rem',
                              wordBreak: 'break-all'
                            }}
                          >
                            {analysis.canonical_smiles}
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Molecular Weight</strong>

                          <div>
                            {analysis.molecular_weight} g/mol
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Exact Mass</strong>

                          <div>
                            {analysis.exact_molecular_weight} g/mol
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <strong>LogP</strong>

                          <div>{analysis.logp}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>TPSA</strong>

                          <div>
                            {analysis.tpsa} Å²
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Heavy Atoms</strong>

                          <div>
                            {analysis.heavy_atoms}
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <strong>H-Bond Donors</strong>

                          <div>
                            {analysis.h_bond_donors}
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <strong>H-Bond Acceptors</strong>

                          <div>
                            {analysis.h_bond_acceptors}
                          </div>
                        </div>

                      </div>

                      {/* Structural Properties */}
                      <h4 style={sectionHeaderStyle}>
                        Structural Properties
                      </h4>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px'
                        }}
                      >

                        <div style={cardStyle}>
                          <strong>Rotatable Bonds</strong>
                          <div>{analysis.rotatable_bonds}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Ring Count</strong>
                          <div>{analysis.ring_count}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Aromatic Rings</strong>
                          <div>{analysis.aromatic_rings}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Saturated Rings</strong>
                          <div>{analysis.saturated_rings}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Aliphatic Rings</strong>
                          <div>{analysis.aliphatic_rings}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Fraction Csp3</strong>
                          <div>{analysis.fraction_csp3}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Heteroatoms</strong>
                          <div>{analysis.num_heteroatoms}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Stereocenters</strong>
                          <div>{analysis.num_stereocenters}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Valence Electrons</strong>
                          <div>{analysis.valence_electrons}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Formal Charge</strong>
                          <div>{analysis.formal_charge}</div>
                        </div>

                        <div style={cardStyle}>
                          <strong>Molar Refractivity</strong>
                          <div>{analysis.molar_refractivity}</div>
                        </div>

                      </div>

                      {/* Identifiers */}
                      <h4 style={sectionHeaderStyle}>
                        Identifiers
                      </h4>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: '10px'
                        }}
                      >

                        <div style={cardStyle}>
                          <strong>InChI</strong>

                          <div
                            style={{
                              fontSize: '0.85rem',
                              wordBreak: 'break-all',
                              fontFamily: 'monospace'
                            }}
                          >
                            {analysis.inchi ||
                              'Not available for this structure'}
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <strong>InChIKey</strong>

                          <div
                            style={{
                              fontSize: '0.9rem',
                              fontFamily: 'monospace'
                            }}
                          >
                            {analysis.inchi_key ||
                              'Not available for this structure'}
                          </div>
                        </div>

                      </div>

                      {/* Drug-likeness */}
                      <h4 style={sectionHeaderStyle}>
                        Drug-likeness
                      </h4>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px'
                        }}
                      >

                        <div style={cardStyle}>
                          <strong>QED Score</strong>

                          <div>
                            {analysis.qed_score}{' '}
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: '#666'
                              }}
                            >
                              (0-1, higher = more drug-like)
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            ...cardStyle,
                            background: analysis.lipinski_pass
                              ? '#e8f5e9'
                              : '#fff3e0'
                          }}
                        >
                          <strong>
                            Lipinski's Rule of 5
                          </strong>

                          <div>
                            {analysis.lipinski_pass
                              ? 'Pass'
                              : 'Fail'}{' '}
                            (
                            {analysis.lipinski_violations}{' '}
                            violation
                            {analysis.lipinski_violations !== 1
                              ? 's'
                              : ''}
                            )
                          </div>
                        </div>

                      </div>

                    </div>
                  )

                ) : (

                  <p style={{ color: '#666' }}>
                    Draw a molecule in Ketcher, click
                    "Get SMILES", then click "Analyze"
                    <br />
                    <br />
                    Or paste a SMILES string in the box
                    above the editor
                  </p>

                )}

              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            EQUATION BALANCER
        ====================================================== */}
        {section === 'balancer' && (
          <div>
            <h3>Chemical Equation Balancer</h3>

            <div style={panelStyle}>
              <EquationBalancer />
            </div>
          </div>
        )}

        {/* =====================================================
            CHEMISTRY CALCULATORS
        ====================================================== */}
        {section === 'calculators' && (
          <div>
            <h3>Chemistry Calculators</h3>

            <div style={panelStyle}>
              <ChemCalculators />
            </div>
          </div>
        )}

        {/* =====================================================
            PERIODIC TABLE
        ====================================================== */}
        {section === 'periodic' && (
          <div>
            <h3>Periodic Table Explorer</h3>

            <div style={panelStyle}>
              <PeriodicTableExplorer />
            </div>
          </div>
        )}

        {/* =====================================================
            COMPOUND EXPLORER
        ====================================================== */}
        {section === 'compound' && (
          <div>
            <h3>Compound Explorer</h3>

            <div style={panelStyle}>
              <CompoundExplorer />
            </div>
          </div>
        )}

        {/* =====================================================
            PHYSICS CALCULATORS
        ====================================================== */}
        {section === 'physics' && (
          <div>
            <h3>Physics Calculators</h3>

            <div style={panelStyle}>
              <PhysicsCalculators />
            </div>
          </div>
        )}

        {/* =====================================================
            KENYA CURRICULUM INTEGRATION
        ====================================================== */}
        <div
          style={{
            marginTop: '40px',
            padding: '20px',
            background: '#e8f5e9',
            borderRadius: '8px'
          }}
        >
          <h4 style={{ color: '#00695c' }}>
            Kenya Curriculum Integration
          </h4>

          <p>This tool is designed for:</p>

          <ul
            style={{
              marginLeft: '20px',
              marginTop: '10px'
            }}
          >
            <li>
              Form 3 Chemistry - Organic Chemistry
            </li>

            <li>
              Form 4 Chemistry - Industrial Chemistry
            </li>

            <li>
              Form 3-4 Physics - Mechanics & Energy
            </li>

            <li>
              University Chemistry - Organic Synthesis
            </li>

            <li>
              Laboratory Research at Kenyan Universities
            </li>
          </ul>
        </div>

      </main>

      {/* ChatBot - Floating button in bottom-right corner */}
      <ChatBot />

    </div>
  );
}

export default App;
