// src/ChemCalculators.tsx
import React, { useState } from 'react';
import { parseFormula, calculateMolarMass, molesToMass, massToMoles } from './utils/formulaParser';

const ChemCalculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'molarity' | 'molesMass' | 'dilution' | 'gas'>('molarity');

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
      <h2 style={{ color: '#00695c', marginBottom: '20px' }}>🧮 Chemistry Calculators</h2>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('molarity')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'molarity' ? '#00897b' : '#e0e0e0',
            color: activeTab === 'molarity' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Molarity
        </button>
        <button
          onClick={() => setActiveTab('molesMass')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'molesMass' ? '#00897b' : '#e0e0e0',
            color: activeTab === 'molesMass' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Moles ↔ Mass
        </button>
        <button
          onClick={() => setActiveTab('dilution')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'dilution' ? '#00897b' : '#e0e0e0',
            color: activeTab === 'dilution' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Dilution (C₁V₁=C₂V₂)
        </button>
        <button
          onClick={() => setActiveTab('gas')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'gas' ? '#00897b' : '#e0e0e0',
            color: activeTab === 'gas' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Ideal Gas Law
        </button>
      </div>

      {/* Content */}
      <div style={{ minHeight: '300px' }}>
        {activeTab === 'molarity' && <MolarityCalculator />}
        {activeTab === 'molesMass' && <MolesMassCalculator />}
        {activeTab === 'dilution' && <DilutionCalculator />}
        {activeTab === 'gas' && <GasLawCalculator />}
      </div>
    </div>
  );
};

// ----- Molarity Calculator -----
const MolarityCalculator: React.FC = () => {
  const [moles, setMoles] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = () => {
    setError(null);
    const m = parseFloat(moles);
    const l = parseFloat(liters);
    
    if (isNaN(m) || isNaN(l) || l === 0) {
      setError('Please enter valid numbers (volume cannot be zero)');
      setResult(null);
      return;
    }
    
    setResult(m / l);
  };

  const clearFields = () => {
    setMoles('');
    setLiters('');
    setResult(null);
    setError(null);
  };

  return (
    <div>
      <h3 style={{ color: '#00695c' }}>Molarity (M = moles / liters)</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Calculate the molarity of a solution given moles of solute and volume in liters.
      </p>
      
      <div style={{ display: 'grid', gap: '15px', maxWidth: '400px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Moles of solute (mol):
          </label>
          <input
            type="number"
            value={moles}
            onChange={(e) => setMoles(e.target.value)}
            placeholder="e.g., 2.5"
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Volume (liters):
          </label>
          <input
            type="number"
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            placeholder="e.g., 1.0"
            style={inputStyle}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={calculate} style={buttonStyle}>
            Calculate Molarity
          </button>
          <button onClick={clearFields} style={{ ...buttonStyle, background: '#e0e0e0', color: '#333' }}>
            Clear
          </button>
        </div>
        
        {error && (
          <div style={{ color: '#d32f2f', padding: '10px', background: '#ffebee', borderRadius: '4px' }}>
            ❌ {error}
          </div>
        )}
        
        {result !== null && !error && (
          <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '4px' }}>
            <strong>Molarity:</strong> {result.toFixed(4)} M (mol/L)
          </div>
        )}
      </div>
    </div>
  );
};

// ----- Moles ↔ Mass Calculator -----
const MolesMassCalculator: React.FC = () => {
  const [formula, setFormula] = useState<string>('');
  const [moles, setMoles] = useState<string>('');
  const [mass, setMass] = useState<string>('');
  const [result, setResult] = useState<{ type: string; value: number; unit: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [molarMass, setMolarMass] = useState<number | null>(null);

  const calculateMolarMass = () => {
    setError(null);
    try {
      const mass = parseFormula(formula).totalMass;
      setMolarMass(mass);
      return mass;
    } catch (err) {
      setError('Invalid formula: ' + (err as Error).message);
      return null;
    }
  };

  const calculateMolesToMass = () => {
    setError(null);
    const m = parseFloat(moles);
    if (isNaN(m) || m <= 0) {
      setError('Please enter a valid number of moles');
      return;
    }
    
    const mm = calculateMolarMass();
    if (mm === null) return;
    
    const massResult = m * mm;
    setResult({ type: 'mass', value: massResult, unit: 'g' });
  };

  const calculateMassToMoles = () => {
    setError(null);
    const m = parseFloat(mass);
    if (isNaN(m) || m <= 0) {
      setError('Please enter a valid mass');
      return;
    }
    
    const mm = calculateMolarMass();
    if (mm === null) return;
    
    const molesResult = m / mm;
    setResult({ type: 'moles', value: molesResult, unit: 'mol' });
  };

  const clearFields = () => {
    setFormula('');
    setMoles('');
    setMass('');
    setResult(null);
    setError(null);
    setMolarMass(null);
  };

  return (
    <div>
      <h3 style={{ color: '#00695c' }}>Moles ↔ Mass Conversion</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Convert between moles and mass using the molar mass of a compound.
      </p>
      
      <div style={{ display: 'grid', gap: '15px', maxWidth: '450px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Chemical Formula:
          </label>
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g., H2O, NaCl, Ca(OH)2"
            style={inputStyle}
          />
          <button
            onClick={calculateMolarMass}
            style={{ ...buttonStyle, marginTop: '5px', padding: '5px 15px', fontSize: '14px' }}
          >
            Get Molar Mass
          </button>
          {molarMass !== null && (
            <div style={{ marginTop: '5px', color: '#00897b' }}>
              Molar mass: <strong>{molarMass.toFixed(4)} g/mol</strong>
            </div>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Moles (mol):
            </label>
            <input
              type="number"
              value={moles}
              onChange={(e) => setMoles(e.target.value)}
              placeholder="e.g., 2.5"
              style={inputStyle}
            />
            <button
              onClick={calculateMolesToMass}
              style={{ ...buttonStyle, marginTop: '5px', width: '100%' }}
            >
              → Mass
            </button>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Mass (g):
            </label>
            <input
              type="number"
              value={mass}
              onChange={(e) => setMass(e.target.value)}
              placeholder="e.g., 50.0"
              style={inputStyle}
            />
            <button
              onClick={calculateMassToMoles}
              style={{ ...buttonStyle, marginTop: '5px', width: '100%' }}
            >
              → Moles
            </button>
          </div>
        </div>
        
        <button onClick={clearFields} style={{ ...buttonStyle, background: '#e0e0e0', color: '#333' }}>
          Clear All
        </button>
        
        {error && (
          <div style={{ color: '#d32f2f', padding: '10px', background: '#ffebee', borderRadius: '4px' }}>
            ❌ {error}
          </div>
        )}
        
        {result && !error && (
          <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '4px' }}>
            <strong>Result:</strong> {result.value.toFixed(4)} {result.unit}
          </div>
        )}
      </div>
    </div>
  );
};

// ----- Dilution Calculator -----
const DilutionCalculator: React.FC = () => {
  const [c1, setC1] = useState<string>('');
  const [v1, setV1] = useState<string>('');
  const [c2, setC2] = useState<string>('');
  const [v2, setV2] = useState<string>('');
  const [result, setResult] = useState<{ variable: string; value: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = () => {
    setError(null);
    const c1v = parseFloat(c1);
    const v1v = parseFloat(v1);
    const c2v = parseFloat(c2);
    const v2v = parseFloat(v2);
    
    // Count how many fields are filled
    const filled = [c1v, v1v, c2v, v2v].filter(v => !isNaN(v) && v > 0).length;
    
    if (filled < 3) {
      setError('Please fill in 3 of the 4 fields (leave one blank to solve for it)');
      setResult(null);
      return;
    }
    
    let resultVar = '';
    let resultValue = 0;
    
    if (isNaN(c1v)) {
      resultVar = 'C₁';
      resultValue = (c2v * v2v) / v1v;
    } else if (isNaN(v1v)) {
      resultVar = 'V₁';
      resultValue = (c2v * v2v) / c1v;
    } else if (isNaN(c2v)) {
      resultVar = 'C₂';
      resultValue = (c1v * v1v) / v2v;
    } else if (isNaN(v2v)) {
      resultVar = 'V₂';
      resultValue = (c1v * v1v) / c2v;
    }
    
    setResult({ variable: resultVar, value: resultValue });
  };

  const clearFields = () => {
    setC1('');
    setV1('');
    setC2('');
    setV2('');
    setResult(null);
    setError(null);
  };

  return (
    <div>
      <h3 style={{ color: '#00695c' }}>Dilution (C₁V₁ = C₂V₂)</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Leave one field blank to calculate it.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '500px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            C₁ (Initial Concentration):
          </label>
          <input
            type="number"
            value={c1}
            onChange={(e) => setC1(e.target.value)}
            placeholder="e.g., 2.0"
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            V₁ (Initial Volume):
          </label>
          <input
            type="number"
            value={v1}
            onChange={(e) => setV1(e.target.value)}
            placeholder="e.g., 1.0"
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            C₂ (Final Concentration):
          </label>
          <input
            type="number"
            value={c2}
            onChange={(e) => setC2(e.target.value)}
            placeholder="e.g., 0.5"
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            V₂ (Final Volume):
          </label>
          <input
            type="number"
            value={v2}
            onChange={(e) => setV2(e.target.value)}
            placeholder="e.g., 4.0"
            style={inputStyle}
          />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <button onClick={calculate} style={buttonStyle}>
          Calculate
        </button>
        <button onClick={clearFields} style={{ ...buttonStyle, background: '#e0e0e0', color: '#333' }}>
          Clear
        </button>
      </div>
      
      {error && (
        <div style={{ color: '#d32f2f', padding: '10px', background: '#ffebee', borderRadius: '4px', marginTop: '15px' }}>
          ❌ {error}
        </div>
      )}
      
      {result && !error && (
        <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '4px', marginTop: '15px' }}>
          <strong>{result.variable} =</strong> {result.value.toFixed(4)}
        </div>
      )}
    </div>
  );
};

// ----- Ideal Gas Law Calculator -----
const GasLawCalculator: React.FC = () => {
  const [pressure, setPressure] = useState<string>('');
  const [volume, setVolume] = useState<string>('');
  const [moles, setMoles] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [result, setResult] = useState<{ variable: string; value: number; unit: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const R = 0.08206; // L·atm/(mol·K)

  const calculate = () => {
    setError(null);
    const p = parseFloat(pressure);
    const v = parseFloat(volume);
    const n = parseFloat(moles);
    const t = parseFloat(temperature);
    
    // Count filled fields
    const filled = [p, v, n, t].filter(val => !isNaN(val) && val > 0).length;
    
    if (filled < 3) {
      setError('Please fill in 3 of the 4 fields (leave one blank to solve for it)');
      setResult(null);
      return;
    }
    
    let resultVar = '';
    let resultValue = 0;
    let unit = '';
    
    if (isNaN(p)) {
      resultVar = 'P';
      resultValue = (n * R * t) / v;
      unit = 'atm';
    } else if (isNaN(v)) {
      resultVar = 'V';
      resultValue = (n * R * t) / p;
      unit = 'L';
    } else if (isNaN(n)) {
      resultVar = 'n';
      resultValue = (p * v) / (R * t);
      unit = 'mol';
    } else if (isNaN(t)) {
      resultVar = 'T';
      resultValue = (p * v) / (n * R);
      unit = 'K';
    }
    
    setResult({ variable: resultVar, value: resultValue, unit });
  };

  const clearFields = () => {
    setPressure('');
    setVolume('');
    setMoles('');
    setTemperature('');
    setResult(null);
    setError(null);
  };

  return (
    <div>
      <h3 style={{ color: '#00695c' }}>Ideal Gas Law (PV = nRT)</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        R = 0.08206 L·atm/(mol·K). Leave one field blank to calculate it.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '500px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            P (Pressure, atm):
          </label>
          <input
            type="number"
            value={pressure}
            onChange={(e) => setPressure(e.target.value)}
            placeholder="e.g., 1.0"
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            V (Volume, L):
          </label>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="e.g., 22.4"
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            n (Moles, mol):
          </label>
          <input
            type="number"
            value={moles}
            onChange={(e) => setMoles(e.target.value)}
            placeholder="e.g., 1.0"
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            T (Temperature, K):
          </label>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="e.g., 273.15"
            style={inputStyle}
          />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <button onClick={calculate} style={buttonStyle}>
          Calculate
        </button>
        <button onClick={clearFields} style={{ ...buttonStyle, background: '#e0e0e0', color: '#333' }}>
          Clear
        </button>
      </div>
      
      {error && (
        <div style={{ color: '#d32f2f', padding: '10px', background: '#ffebee', borderRadius: '4px', marginTop: '15px' }}>
          ❌ {error}
        </div>
      )}
      
      {result && !error && (
        <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '4px', marginTop: '15px' }}>
          <strong>{result.variable} =</strong> {result.value.toFixed(4)} {result.unit}
        </div>
      )}
    </div>
  );
};

// ----- Shared Styles -----
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '16px',
  boxSizing: 'border-box'
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#00897b',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '16px'
};

export default ChemCalculators;