import React, { useState } from 'react';

type CalcTab = 'motion' | 'forces' | 'energy';

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  border: 'none',
  borderBottom: active ? '3px solid #1565c0' : '3px solid transparent',
  background: 'transparent',
  color: active ? '#1565c0' : '#666',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  fontSize: '14px',
});

const inputStyle: React.CSSProperties = {
  padding: '8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  width: '100%',
  boxSizing: 'border-box',
};

const fieldWrapStyle: React.CSSProperties = { marginBottom: '12px' };

const resultBoxStyle: React.CSSProperties = {
  marginTop: '15px',
  padding: '15px',
  background: '#e3f2fd',
  borderRadius: '6px',
  color: '#0d47a1',
  fontWeight: 600,
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: '15px',
  padding: '12px',
  background: '#ffebee',
  borderRadius: '6px',
  color: '#d32f2f',
  fontSize: '0.9rem',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 20px',
  background: '#1565c0',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

function blankField(values: Record<string, number>): string | null {
  const blanks = Object.entries(values).filter(([, v]) => isNaN(v));
  if (blanks.length !== 1) return null;
  return blanks[0][0];
}

const PhysicsCalculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalcTab>('motion');

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '15px', flexWrap: 'wrap' }}>
        <button style={tabStyle(activeTab === 'motion')} onClick={() => setActiveTab('motion')}>Motion</button>
        <button style={tabStyle(activeTab === 'forces')} onClick={() => setActiveTab('forces')}>Forces</button>
        <button style={tabStyle(activeTab === 'energy')} onClick={() => setActiveTab('energy')}>Energy</button>
      </div>

      {activeTab === 'motion' && <MotionCalc />}
      {activeTab === 'forces' && <ForcesCalc />}
      {activeTab === 'energy' && <EnergyCalc />}
    </div>
  );
};

// ---------- Motion: v = u + at ----------
const MotionCalc: React.FC = () => {
  const [u, setU] = useState('0');
  const [v, setV] = useState('');
  const [a, setA] = useState('9.8');
  const [t, setT] = useState('2');

  const values = { u: parseFloat(u), v: parseFloat(v), a: parseFloat(a), t: parseFloat(t) };
  const missing = blankField(values);

  let result: string | null = null;
  let error: string | null = null;

  const filledCount = Object.values(values).filter(x => !isNaN(x)).length;
  if (filledCount === 4) {
    error = 'Leave exactly one field blank — that\'s the one being solved for.';
  } else if (filledCount < 3) {
    error = 'Fill in three of the four fields; leave one blank to solve for it.';
  } else if (missing === 'v') {
    result = `v = u + at = ${(values.u + values.a * values.t).toFixed(4)} m/s`;
  } else if (missing === 'u') {
    result = `u = v − at = ${(values.v - values.a * values.t).toFixed(4)} m/s`;
  } else if (missing === 'a') {
    result = `a = (v − u) / t = ${((values.v - values.u) / values.t).toFixed(4)} m/s²`;
  } else if (missing === 't') {
    result = `t = (v − u) / a = ${((values.v - values.u) / values.a).toFixed(4)} s`;
  }

  return (
    <div>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>Kinematics: v = u + at (final velocity = initial velocity + acceleration × time). Leave ONE field blank to solve for it.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={fieldWrapStyle}><label>u — initial velocity (m/s)</label><input style={inputStyle} value={u} onChange={e => setU(e.target.value)} type="number" /></div>
        <div style={fieldWrapStyle}><label>v — final velocity (m/s)</label><input style={inputStyle} value={v} onChange={e => setV(e.target.value)} type="number" placeholder="leave blank to solve" /></div>
        <div style={fieldWrapStyle}><label>a — acceleration (m/s²)</label><input style={inputStyle} value={a} onChange={e => setA(e.target.value)} type="number" /></div>
        <div style={fieldWrapStyle}><label>t — time (s)</label><input style={inputStyle} value={t} onChange={e => setT(e.target.value)} type="number" /></div>
      </div>
      {error ? <div style={errorBoxStyle}>Error: {error}</div> : result && <div style={resultBoxStyle}>{result}</div>}

      <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '15px' }}>
        For displacement, use s = ut + ½at² once you have all of u, a, t.
      </p>
    </div>
  );
};

// ---------- Forces: F = ma, weight = mg ----------
const ForcesCalc: React.FC = () => {
  const [mode, setMode] = useState<'newton' | 'weight'>('newton');

  // F = ma
  const [m, setM] = useState('10');
  const [a, setA] = useState('');
  const [f, setF] = useState('50');

  const values = { m: parseFloat(m), a: parseFloat(a), f: parseFloat(f) };
  const missing = blankField(values);
  const filledCount = Object.values(values).filter(x => !isNaN(x)).length;

  let result: string | null = null;
  let error: string | null = null;

  if (mode === 'newton') {
    if (filledCount === 3) error = 'Leave exactly one field blank — that\'s the one being solved for.';
    else if (filledCount < 2) error = 'Fill in two of the three fields; leave one blank to solve for it.';
    else if (missing === 'f') result = `F = ma = ${(values.m * values.a).toFixed(4)} N`;
    else if (missing === 'm') result = `m = F / a = ${(values.f / values.a).toFixed(4)} kg`;
    else if (missing === 'a') result = `a = F / m = ${(values.f / values.m).toFixed(4)} m/s²`;
  }

  // weight = mg
  const g = 9.8;
  const [wMass, setWMass] = useState('10');
  const weight = parseFloat(wMass) * g;

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={() => setMode('newton')}
          style={{ ...buttonStyle, background: mode === 'newton' ? '#1565c0' : '#e0e0e0', color: mode === 'newton' ? 'white' : '#333' }}
        >
          Newton's 2nd Law
        </button>
        <button
          onClick={() => setMode('weight')}
          style={{ ...buttonStyle, background: mode === 'weight' ? '#1565c0' : '#e0e0e0', color: mode === 'weight' ? 'white' : '#333' }}
        >
          Weight
        </button>
      </div>

      {mode === 'newton' && (
        <div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Newton's Second Law: F = ma. Leave ONE field blank to solve for it.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={fieldWrapStyle}><label>m — mass (kg)</label><input style={inputStyle} value={m} onChange={e => setM(e.target.value)} type="number" /></div>
            <div style={fieldWrapStyle}><label>a — acceleration (m/s²)</label><input style={inputStyle} value={a} onChange={e => setA(e.target.value)} type="number" placeholder="leave blank" /></div>
            <div style={fieldWrapStyle}><label>F — force (N)</label><input style={inputStyle} value={f} onChange={e => setF(e.target.value)} type="number" /></div>
          </div>
          {error ? <div style={errorBoxStyle}>Error: {error}</div> : result && <div style={resultBoxStyle}>{result}</div>}
        </div>
      )}

      {mode === 'weight' && (
        <div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Weight: W = mg (using g = 9.8 m/s² on Earth's surface)</p>
          <div style={fieldWrapStyle}><label>Mass (kg)</label><input style={inputStyle} value={wMass} onChange={e => setWMass(e.target.value)} type="number" /></div>
          {!isNaN(weight) && <div style={resultBoxStyle}>W = mg = {weight.toFixed(4)} N</div>}
        </div>
      )}
    </div>
  );
};

// ---------- Energy: KE, PE, Work, Power ----------
const EnergyCalc: React.FC = () => {
  const [mode, setMode] = useState<'ke' | 'pe' | 'work' | 'power'>('ke');

  const [keMass, setKeMass] = useState('2');
  const [keV, setKeV] = useState('5');

  const [peMass, setPeMass] = useState('2');
  const [peH, setPeH] = useState('10');

  const [wF, setWF] = useState('20');
  const [wD, setWD] = useState('5');

  const [pW, setPW] = useState('100');
  const [pT, setPT] = useState('4');

  const g = 9.8;
  const ke = 0.5 * parseFloat(keMass) * Math.pow(parseFloat(keV), 2);
  const pe = parseFloat(peMass) * g * parseFloat(peH);
  const work = parseFloat(wF) * parseFloat(wD);
  const power = parseFloat(pW) / parseFloat(pT);

  const modeBtn = (key: typeof mode, label: string) => (
    <button
      onClick={() => setMode(key)}
      style={{ ...buttonStyle, background: mode === key ? '#1565c0' : '#e0e0e0', color: mode === key ? 'white' : '#333' }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        {modeBtn('ke', 'Kinetic Energy')}
        {modeBtn('pe', 'Potential Energy')}
        {modeBtn('work', 'Work')}
        {modeBtn('power', 'Power')}
      </div>

      {mode === 'ke' && (
        <div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Kinetic Energy: KE = ½mv²</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={fieldWrapStyle}><label>Mass (kg)</label><input style={inputStyle} value={keMass} onChange={e => setKeMass(e.target.value)} type="number" /></div>
            <div style={fieldWrapStyle}><label>Velocity (m/s)</label><input style={inputStyle} value={keV} onChange={e => setKeV(e.target.value)} type="number" /></div>
          </div>
          {!isNaN(ke) && <div style={resultBoxStyle}>KE = ½mv² = {ke.toFixed(4)} J</div>}
        </div>
      )}

      {mode === 'pe' && (
        <div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Gravitational Potential Energy: PE = mgh (g = 9.8 m/s²)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={fieldWrapStyle}><label>Mass (kg)</label><input style={inputStyle} value={peMass} onChange={e => setPeMass(e.target.value)} type="number" /></div>
            <div style={fieldWrapStyle}><label>Height (m)</label><input style={inputStyle} value={peH} onChange={e => setPeH(e.target.value)} type="number" /></div>
          </div>
          {!isNaN(pe) && <div style={resultBoxStyle}>PE = mgh = {pe.toFixed(4)} J</div>}
        </div>
      )}

      {mode === 'work' && (
        <div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Work: W = F × d (force applied in the direction of motion)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={fieldWrapStyle}><label>Force (N)</label><input style={inputStyle} value={wF} onChange={e => setWF(e.target.value)} type="number" /></div>
            <div style={fieldWrapStyle}><label>Distance (m)</label><input style={inputStyle} value={wD} onChange={e => setWD(e.target.value)} type="number" /></div>
          </div>
          {!isNaN(work) && <div style={resultBoxStyle}>W = F × d = {work.toFixed(4)} J</div>}
        </div>
      )}

      {mode === 'power' && (
        <div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Power: P = W / t (work done per unit time)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={fieldWrapStyle}><label>Work (J)</label><input style={inputStyle} value={pW} onChange={e => setPW(e.target.value)} type="number" /></div>
            <div style={fieldWrapStyle}><label>Time (s)</label><input style={inputStyle} value={pT} onChange={e => setPT(e.target.value)} type="number" /></div>
          </div>
          {!isNaN(power) && <div style={resultBoxStyle}>P = W / t = {power.toFixed(4)} W</div>}
        </div>
      )}
    </div>
  );
};

export default PhysicsCalculators;
