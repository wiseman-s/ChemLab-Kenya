// src/DrugLikenessPanel.tsx
import React, { useState } from 'react';

/* ---------- Types ---------- */

export interface MoleculeData {
  smiles: string;
  molecular_weight: number;
  logp: number;
  h_bond_donors: number;
  h_bond_acceptors: number;
  tpsa: number;
  qed_score: number;
  lipinski_violations: number;
  lipinski_pass: boolean;
  // New fields from drug_likeness.py. All optional, so the panel still
  // works if the backend has not been updated yet.
  rotatable_bonds?: number;
  pains_alerts?: string[];
  brenk_alerts?: string[];
  sa_score?: number | null;
  fsp3?: number;
  aromatic_rings?: number;
  heavy_atoms?: number;
}

type Status = 'pass' | 'fail' | 'warn' | 'unknown';

interface Rule {
  name: string;
  value: string;
  threshold: string;
  status: Status;
  why: string;
}

/* ---------- Palette ---------- */

const C = {
  teal: '#00695c',
  pass: { bg: '#f1f8e9', bar: '#7cb342', text: '#2e7d32' },
  fail: { bg: '#ffebee', bar: '#e53935', text: '#c62828' },
  warn: { bg: '#fff8e1', bar: '#ffa000', text: '#e65100' },
  unknown: { bg: '#f5f5f5', bar: '#bdbdbd', text: '#757575' },
};

const ICON: Record<Status, string> = { pass: '✓', fail: '✗', warn: '!', unknown: '?' };

/* ---------- Small building blocks ---------- */

const StatusDot: React.FC<{ status: Status }> = ({ status }) => (
  <span
    aria-label={status}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: C[status].bar,
      color: 'white',
      fontSize: 12,
      fontWeight: 700,
      flexShrink: 0,
    }}
  >
    {ICON[status]}
  </span>
);

const RuleRow: React.FC<{ rule: Rule }> = ({ rule }) => (
  <div
    style={{
      padding: '10px 12px',
      borderRadius: 8,
      background: C[rule.status].bg,
      borderLeft: `4px solid ${C[rule.status].bar}`,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#333' }}>
        <StatusDot status={rule.status} />
        {rule.name}
      </div>
      <div style={{ fontSize: 13, color: '#666' }}>
        <strong>{rule.value}</strong> <span style={{ opacity: 0.7 }}>({rule.threshold})</span>
      </div>
    </div>
    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{rule.why}</div>
  </div>
);

const Section: React.FC<{
  title: string;
  subtitle: string;
  badge?: { label: string; status: Status };
  children: React.ReactNode;
}> = ({ title, subtitle, badge, children }) => (
  <section style={{ marginTop: 22 }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
      }}
    >
      <div>
        <h4 style={{ margin: 0, color: C.teal, fontSize: 16 }}>{title}</h4>
        <p style={{ margin: '2px 0 0', color: '#777', fontSize: 12 }}>{subtitle}</p>
      </div>
      {badge && (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background: C[badge.status].bg,
            color: C[badge.status].text,
            border: `1px solid ${C[badge.status].bar}`,
          }}
        >
          {badge.label}
        </span>
      )}
    </div>
    <div style={{ display: 'grid', gap: 8 }}>{children}</div>
  </section>
);

/* ---------- Property radar (optimal zone vs. this molecule) ---------- */

interface Axis {
  label: string;
  value: number;
  lo: number; // optimal range
  hi: number;
  unit: string;
}

const PropertyRadar: React.FC<{ axes: Axis[] }> = ({ axes }) => {
  const cx = 130, cy = 120, R = 78;
  const n = axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, t: number) =>
    `${(cx + t * R * Math.cos(angle(i))).toFixed(1)},${(cy + t * R * Math.sin(angle(i))).toFixed(1)}`;
  const ring = (t: number) => axes.map((_, i) => pt(i, t)).join(' ');

  // The optimal range always sits between 40% and 70% of the radius.
  const toT = (a: Axis) =>
    Math.min(1, Math.max(0.03, 0.4 + (0.3 * (a.value - a.lo)) / (a.hi - a.lo)));

  const band = `M${ring(0.7).split(' ').join('L')}Z M${ring(0.4).split(' ').join('L')}Z`;
  const shape = axes.map((a, i) => pt(i, toT(a))).join(' ');
  const outside = axes.filter((a) => a.value < a.lo || a.value > a.hi);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      <svg
        viewBox="0 0 260 240"
        width="260"
        height="240"
        role="img"
        aria-label="Radar chart comparing six physical properties with their optimal ranges"
      >
        <polygon points={ring(1)} fill="none" stroke="#e0e0e0" />
        <path d={band} fill="#b2dfdb" fillOpacity={0.55} fillRule="evenodd" />
        {axes.map((_, i) => (
          <line key={i} x1={cx} y1={cy} x2={pt(i, 1).split(',')[0]} y2={pt(i, 1).split(',')[1]} stroke="#eee" />
        ))}
        <polygon points={shape} fill="#00695c" fillOpacity={0.22} stroke="#00695c" strokeWidth={2} />
        {axes.map((a, i) => {
          const [x, y] = pt(i, 1.2).split(',').map(Number);
          const out = a.value < a.lo || a.value > a.hi;
          return (
            <text
              key={a.label}
              x={x}
              y={y}
              fontSize={10.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={out ? C.fail.text : '#555'}
              fontWeight={out ? 700 : 400}
            >
              {a.label}
            </text>
          );
        })}
      </svg>
      <div style={{ flex: '1 1 200px', fontSize: 12, color: '#666', lineHeight: 1.6 }}>
        <div>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              background: '#b2dfdb',
              marginRight: 6,
              verticalAlign: 'middle',
            }}
          />
          Teal band = optimal range for an oral drug.
        </div>
        <div style={{ marginTop: 6 }}>
          {outside.length === 0 ? (
            'Every property sits inside the band. This is a balanced molecule.'
          ) : (
            <>
              Outside the band:{' '}
              <strong style={{ color: C.fail.text }}>
                {outside
                  .map((a) => `${a.label} (${a.value.toFixed(a.unit === '' ? 2 : 1)}${a.unit})`)
                  .join(', ')}
              </strong>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Synthetic accessibility gauge ---------- */

const SAGauge: React.FC<{ score: number }> = ({ score }) => {
  const pos = Math.min(100, Math.max(0, ((score - 1) / 9) * 100));
  return (
    <div style={{ padding: '12px', borderRadius: 8, background: '#f5f5f5' }}>
      <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'linear-gradient(90deg,#7cb342 0%,#fdd835 40%,#ef6c00 65%,#c62828 100%)' }}>
        <div
          style={{
            position: 'absolute',
            left: `${pos}%`,
            top: -4,
            width: 4,
            height: 20,
            marginLeft: -2,
            background: '#263238',
            borderRadius: 2,
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#777', marginTop: 6 }}>
        <span>1 · easy to make</span>
        <span>10 · nearly impossible</span>
      </div>
    </div>
  );
};

/* ---------- Main panel ---------- */

const DrugLikenessPanel: React.FC<{ analysis: MoleculeData }> = ({ analysis }) => {
  const [showPains, setShowPains] = useState(true);
  const [showBrenk, setShowBrenk] = useState(false);
  const [copied, setCopied] = useState(false);

  const { rotatable_bonds: rotB, pains_alerts: pains, brenk_alerts: brenk, sa_score: sa, fsp3 } = analysis;
  const hasRotB = typeof rotB === 'number';

  /* --- Lipinski --- */
  const lipinski: Rule[] = [
    {
      name: 'Molecular weight',
      value: `${analysis.molecular_weight.toFixed(1)} g/mol`,
      threshold: '≤ 500',
      status: analysis.molecular_weight <= 500 ? 'pass' : 'fail',
      why: 'Large molecules struggle to cross cell membranes and be absorbed by the body.',
    },
    {
      name: 'LogP (lipophilicity)',
      value: analysis.logp.toFixed(2),
      threshold: '≤ 5',
      status: analysis.logp <= 5 ? 'pass' : 'fail',
      why: 'Very fat-soluble molecules accumulate in body fat and may not reach their target.',
    },
    {
      name: 'H-bond donors',
      value: String(analysis.h_bond_donors),
      threshold: '≤ 5',
      status: analysis.h_bond_donors <= 5 ? 'pass' : 'fail',
      why: 'Too many donors make it hard to cross the lipid cell membrane.',
    },
    {
      name: 'H-bond acceptors',
      value: String(analysis.h_bond_acceptors),
      threshold: '≤ 10',
      status: analysis.h_bond_acceptors <= 10 ? 'pass' : 'fail',
      why: 'Too many acceptors reduce permeability, for the same reason.',
    },
  ];
  const lipPassed = lipinski.filter((r) => r.status === 'pass').length;

  /* --- Veber --- */
  const veber: Rule[] = [
    {
      name: 'Rotatable bonds',
      value: hasRotB ? String(rotB) : 'n/a',
      threshold: '≤ 10',
      status: !hasRotB ? 'unknown' : rotB! <= 10 ? 'pass' : 'fail',
      why: 'A floppy molecule pays an energy penalty to freeze into the shape that fits its target, and it is absorbed less well.',
    },
    {
      name: 'Polar surface area (TPSA)',
      value: `${analysis.tpsa.toFixed(1)} Å²`,
      threshold: '≤ 140',
      status: analysis.tpsa <= 140 ? 'pass' : 'fail',
      why: 'Polar surface drags a molecule into water. Above 140 Å², oral absorption drops sharply.',
    },
  ];
  const veberStatus: Status = veber.some((r) => r.status === 'fail')
    ? 'fail'
    : veber.some((r) => r.status === 'unknown')
    ? 'unknown'
    : 'pass';

  /* --- PAINS & structural alerts --- */
  const painsStatus: Status = !pains ? 'unknown' : pains.length > 0 ? 'fail' : 'pass';
  const brenkStatus: Status = !brenk ? 'unknown' : brenk.length > 0 ? 'warn' : 'pass';

  /* --- Synthetic accessibility --- */
  const hasSA = typeof sa === 'number';
  const saStatus: Status = !hasSA ? 'unknown' : sa! <= 3.5 ? 'pass' : sa! <= 6 ? 'warn' : 'fail';
  const saLabel = !hasSA
    ? 'Not available'
    : sa! <= 3.5
    ? 'Easy to make'
    : sa! <= 6
    ? 'Moderate'
    : 'Hard to make';

  /* --- Extra filters --- */
  const egan: Rule = {
    name: 'Egan absorption filter',
    value: `TPSA ${analysis.tpsa.toFixed(0)}, LogP ${analysis.logp.toFixed(1)}`,
    threshold: 'TPSA ≤ 131.6 and LogP ≤ 5.88',
    status: analysis.tpsa <= 131.6 && analysis.logp <= 5.88 ? 'pass' : 'fail',
    why: 'A stricter test of gut absorption and passive membrane crossing.',
  };
  const leadLike: Rule = {
    name: 'Lead-likeness',
    value: `MW ${analysis.molecular_weight.toFixed(0)}`,
    threshold: 'MW 200–350, LogP ≤ 3.5, rot. bonds ≤ 7',
    status: !hasRotB
      ? 'unknown'
      : analysis.molecular_weight >= 200 &&
        analysis.molecular_weight <= 350 &&
        analysis.logp <= 3.5 &&
        rotB! <= 7
      ? 'pass'
      : 'warn',
    why: 'Good starting points are small, because chemists add atoms while optimising. A "warn" here is not a failure.',
  };

  /* --- QED --- */
  const qed = analysis.qed_score;
  const qedLabel = qed >= 0.7 ? 'Excellent' : qed >= 0.5 ? 'Good' : qed >= 0.3 ? 'Modest' : 'Poor';
  const qedColor = qed >= 0.7 ? '#2e7d32' : qed >= 0.5 ? '#558b2f' : qed >= 0.3 ? '#ef6c00' : '#c62828';

  /* --- Overall verdict --- */
  const lipStatus: Status = analysis.lipinski_pass ? 'pass' : 'fail';
  const checks: { label: string; status: Status; detail: string }[] = [
    { label: 'Lipinski', status: lipStatus, detail: `${analysis.lipinski_violations} violation${analysis.lipinski_violations === 1 ? '' : 's'}` },
    { label: 'Veber', status: veberStatus, detail: veberStatus === 'pass' ? 'Flexibility and polarity OK' : veberStatus === 'fail' ? 'Fails oral bioavailability test' : 'No data' },
    { label: 'PAINS', status: painsStatus, detail: !pains ? 'No data' : pains.length ? `${pains.length} alert${pains.length === 1 ? '' : 's'}` : 'Clean' },
    { label: 'Brenk', status: brenkStatus, detail: !brenk ? 'No data' : brenk.length ? `${brenk.length} reactive group${brenk.length === 1 ? '' : 's'}` : 'Clean' },
    { label: 'Synthesis', status: saStatus, detail: hasSA ? `SA ${sa!.toFixed(1)}` : 'No data' },
  ];
  const known = checks.filter((c) => c.status !== 'unknown');
  const problems = known.filter((c) => c.status === 'fail' || c.status === 'warn').length;
  const verdict: { title: string; status: Status } =
    known.length === 0
      ? { title: 'Not enough data', status: 'unknown' }
      : problems === 0 && known.length < checks.length
      ? { title: 'Incomplete screening', status: 'unknown' }
      : problems === 0
      ? { title: 'Promising candidate', status: 'pass' }
      : problems === 1 && painsStatus !== 'fail'
      ? { title: 'Proceed with caution', status: 'warn' }
      : { title: painsStatus === 'fail' && problems === 1 ? 'Proceed with caution' : 'Weak candidate', status: painsStatus === 'fail' && problems === 1 ? 'warn' : 'fail' };

  /* --- Radar axes (need rotatable bonds and Fsp3) --- */
  const radarAxes: Axis[] | null =
    hasRotB && typeof fsp3 === 'number'
      ? [
          { label: 'Lipophilicity', value: analysis.logp, lo: -0.7, hi: 5.0, unit: '' },
          { label: 'Size', value: analysis.molecular_weight, lo: 150, hi: 500, unit: ' Da' },
          { label: 'Polarity', value: analysis.tpsa, lo: 20, hi: 130, unit: ' Å²' },
          { label: 'Flexibility', value: rotB!, lo: 0, hi: 9, unit: '' },
          { label: 'Saturation', value: fsp3!, lo: 0.25, hi: 1, unit: '' },
        ]
      : null;

  /* --- Copyable report for lab notebooks --- */
  const buildReport = () =>
    [
      `Drug-likeness report`,
      `SMILES: ${analysis.smiles}`,
      `Verdict: ${verdict.title}`,
      ``,
      `MW ${analysis.molecular_weight.toFixed(1)} | LogP ${analysis.logp.toFixed(2)} | HBD ${analysis.h_bond_donors} | HBA ${analysis.h_bond_acceptors} | TPSA ${analysis.tpsa.toFixed(1)}`,
      `Rotatable bonds: ${hasRotB ? rotB : 'n/a'} | Fsp3: ${typeof fsp3 === 'number' ? fsp3.toFixed(2) : 'n/a'}`,
      `Lipinski: ${lipStatus === 'pass' ? 'pass' : 'fail'} (${analysis.lipinski_violations} violations)`,
      `Veber: ${veberStatus}`,
      `PAINS: ${pains ? (pains.length ? pains.join(', ') : 'none') : 'n/a'}`,
      `Brenk alerts: ${brenk ? (brenk.length ? brenk.join(', ') : 'none') : 'n/a'}`,
      `SA score: ${hasSA ? sa!.toFixed(2) : 'n/a'}`,
      `QED: ${qed.toFixed(2)} (${qedLabel})`,
    ].join('\n');

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const chipButton: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: C.teal,
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    textDecoration: 'underline',
  };

  return (
    <div
      style={{
        marginTop: 20,
        padding: 18,
        background: 'white',
        borderRadius: 10,
        border: '1px solid #e0e0e0',
      }}
    >
      {/* Header + verdict */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <h3 style={{ color: C.teal, margin: 0 }}>Drug-likeness screening</h3>
          <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>
            Four filters used in real drug discovery: <strong>Lipinski</strong>, <strong>Veber</strong>,{' '}
            <strong>PAINS</strong> and <strong>synthetic accessibility</strong>.
          </p>
        </div>
        <div
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            background: C[verdict.status].bg,
            border: `2px solid ${C[verdict.status].bar}`,
            color: C[verdict.status].text,
            fontWeight: 700,
            fontSize: 15,
            textAlign: 'center',
          }}
        >
          {verdict.title}
          <div style={{ fontSize: 12, fontWeight: 400, marginTop: 2 }}>
            {known.length - problems}/{known.length} filters clean
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        {checks.map((c) => (
          <div
            key={c.label}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: C[c.status].bg,
              borderTop: `3px solid ${C[c.status].bar}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#333', fontSize: 13 }}>
              <StatusDot status={c.status} />
              {c.label}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{c.detail}</div>
          </div>
        ))}
      </div>

      {/* Radar */}
      {radarAxes && (
        <Section title="Property profile" subtitle="How the molecule compares with the ideal zone for an oral drug.">
          <PropertyRadar axes={radarAxes} />
        </Section>
      )}

      {/* Lipinski */}
      <Section
        title="1. Lipinski's Rule of Five"
        subtitle="The first filter. Is the molecule the right size and polarity to be absorbed?"
        badge={{ label: `${lipPassed}/4 rules passed`, status: lipStatus }}
      >
        {lipinski.map((r) => (
          <RuleRow key={r.name} rule={r} />
        ))}
        {analysis.lipinski_violations > 0 && (
          <div style={{ fontSize: 12, color: '#795548', background: '#fffde7', border: '1px solid #fbc02d', borderRadius: 6, padding: '8px 10px' }}>
            <strong>Note:</strong> a molecule with one violation is still often considered drug-like. Many real drugs
            (and most antibiotics and natural-product drugs) break at least one rule.
          </div>
        )}
      </Section>

      {/* Veber */}
      <Section
        title="2. Veber rules"
        subtitle="Lipinski ignores flexibility. Veber adds the shape and polarity checks."
        badge={{ label: veberStatus === 'pass' ? 'Good oral bioavailability' : veberStatus === 'fail' ? 'Poor oral bioavailability' : 'Incomplete', status: veberStatus }}
      >
        {veber.map((r) => (
          <RuleRow key={r.name} rule={r} />
        ))}
        {!hasRotB && (
          <div style={{ fontSize: 12, color: '#777' }}>
            Rotatable bond count is missing. Update the backend <code>/analyze</code> route to return{' '}
            <code>rotatable_bonds</code>.
          </div>
        )}
      </Section>

      {/* PAINS */}
      <Section
        title="3. PAINS and structural alerts"
        subtitle="Pan-assay interference compounds give false positives in lab tests, so they look like hits when they are not."
        badge={{
          label: !pains ? 'No data' : pains.length ? `${pains.length} PAINS alert${pains.length === 1 ? '' : 's'}` : 'No PAINS alerts',
          status: painsStatus,
        }}
      >
        {pains && pains.length > 0 && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: C.fail.bg, borderLeft: `4px solid ${C.fail.bar}` }}>
            <button
              style={chipButton}
              onClick={() => setShowPains((s) => !s)}
              aria-expanded={showPains}
            >
              {showPains ? 'Hide' : 'Show'} matched patterns
            </button>
            {showPains && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#444' }}>
                {pains.map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              A PAINS alert is a warning, not proof. It means a positive result in a screening assay needs a second,
              independent test before you trust it. Many natural products (quinones, catechols, rhodanines) trigger
              these patterns.
            </div>
          </div>
        )}
        {pains && pains.length === 0 && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: C.pass.bg, borderLeft: `4px solid ${C.pass.bar}`, fontSize: 13, color: '#444' }}>
            No PAINS patterns (families A, B and C) found in this structure.
          </div>
        )}
        {!pains && (
          <div style={{ fontSize: 12, color: '#777' }}>
            PAINS data is missing. Add <code>advanced_descriptors(mol)</code> to the backend response.
          </div>
        )}

        {brenk && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: C[brenkStatus].bg, borderLeft: `4px solid ${C[brenkStatus].bar}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#333' }}>
                <StatusDot status={brenkStatus} />
                Unwanted groups (Brenk filter)
              </div>
              <span style={{ fontSize: 13, color: '#666' }}>
                <strong>{brenk.length}</strong> found
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Reactive or toxic-looking groups, such as aldehydes, nitro groups and Michael acceptors, that chemists try
              to avoid.
            </div>
            {brenk.length > 0 && (
              <>
                <button
                  style={{ ...chipButton, marginTop: 6 }}
                  onClick={() => setShowBrenk((s) => !s)}
                  aria-expanded={showBrenk}
                >
                  {showBrenk ? 'Hide' : 'Show'} groups
                </button>
                {showBrenk && (
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: '#444' }}>
                    {brenk.map((b) => (
                      <li key={b}>
                        <code>{b}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </Section>

      {/* SA score */}
      <Section
        title="4. Synthetic accessibility"
        subtitle="Can a chemist actually make it? A drug nobody can synthesise is not a drug."
        badge={{ label: hasSA ? `SA ${sa!.toFixed(1)} · ${saLabel}` : 'No data', status: saStatus }}
      >
        {hasSA ? (
          <>
            <SAGauge score={sa!} />
            <div style={{ fontSize: 12, color: '#666' }}>
              Scores penalise rare ring systems, many stereocentres and large macrocycles, and reward fragments that
              are common in known molecules. It is an estimate: complex natural products can score lower than the
              real effort needed to make them.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: '#777' }}>
            SA score is missing. Check that <code>sascorer.py</code> and <code>fpscores.pkl.gz</code> are available to
            the backend.
          </div>
        )}
      </Section>

      {/* QED + TPSA + other filters */}
      <Section title="Overall scores and extra filters" subtitle="More ways to judge the same molecule.">
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: '#f5f5f5',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>QED score</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: qedColor }}>
              {qed.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 500 }}>({qedLabel})</span>
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>0 = poor, 1 = excellent</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>Fraction sp³ carbons</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.teal }}>
              {typeof fsp3 === 'number' ? fsp3.toFixed(2) : 'n/a'}
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>Higher = less flat, usually better solubility</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>Aromatic rings</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.teal }}>
              {analysis.aromatic_rings ?? 'n/a'}
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>More than 3 tends to hurt solubility</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>Heavy atoms</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.teal }}>{analysis.heavy_atoms ?? 'n/a'}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Atoms other than hydrogen</div>
          </div>
        </div>
        <RuleRow rule={egan} />
        <RuleRow rule={leadLike} />
      </Section>

      {/* Footer */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 12,
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: '#888', maxWidth: 520 }}>
          These are computational filters. They help you decide what to test first. They do not predict toxicity,
          potency or clinical success.
        </p>
        <button
          onClick={copyReport}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: `1px solid ${C.teal}`,
            background: copied ? C.teal : 'white',
            color: copied ? 'white' : C.teal,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {copied ? 'Copied' : 'Copy report'}
        </button>
      </div>
    </div>
  );
};

export default DrugLikenessPanel;
