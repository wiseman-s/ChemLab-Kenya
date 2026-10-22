// src/DrugLikenessPanel.tsx
import React from 'react';

interface MoleculeData {
  smiles: string;
  molecular_weight: number;
  logp: number;
  h_bond_donors: number;
  h_bond_acceptors: number;
  tpsa: number;
  qed_score: number;
  lipinski_violations: number;
  lipinski_pass: boolean;
}

interface Rule {
  name: string;
  value: number | string;
  threshold: string;
  passed: boolean;
  why: string;
}

const DrugLikenessPanel: React.FC<{ analysis: MoleculeData }> = ({ analysis }) => {
  const rules: Rule[] = [
    {
      name: 'Molecular Weight',
      value: `${analysis.molecular_weight.toFixed(1)} g/mol`,
      threshold: '≤ 500 g/mol',
      passed: analysis.molecular_weight <= 500,
      why: 'Large molecules struggle to cross cell membranes and be absorbed by the body.',
    },
    {
      name: 'LogP (Lipophilicity)',
      value: analysis.logp.toFixed(2),
      threshold: '≤ 5',
      passed: analysis.logp <= 5,
      why: 'Very fat-soluble molecules accumulate in body fat and may not reach their target.',
    },
    {
      name: 'H-Bond Donors',
      value: analysis.h_bond_donors,
      threshold: '≤ 5',
      passed: analysis.h_bond_donors <= 5,
      why: 'Too many donors make it hard to cross the lipid cell membrane.',
    },
    {
      name: 'H-Bond Acceptors',
      value: analysis.h_bond_acceptors,
      threshold: '≤ 10',
      passed: analysis.h_bond_acceptors <= 10,
      why: 'Same reason — too many acceptors reduce permeability.',
    },
  ];

  const passedCount = rules.filter((r) => r.passed).length;
  const overallPass = analysis.lipinski_pass;

  // QED score classification
  const qed = analysis.qed_score;
  const qedLabel =
    qed >= 0.7 ? 'Excellent' : qed >= 0.5 ? 'Good' : qed >= 0.3 ? 'Modest' : 'Poor';
  const qedColor =
    qed >= 0.7 ? '#2e7d32' : qed >= 0.5 ? '#558b2f' : qed >= 0.3 ? '#ef6c00' : '#c62828';

  return (
    <div
      style={{
        marginTop: '20px',
        padding: '18px',
        background: 'white',
        borderRadius: '10px',
        border: '1px solid #e0e0e0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div>
          <h3 style={{ color: '#00695c', margin: 0 }}>💊 Drug-Likeness Screening</h3>
          <p style={{ color: '#666', fontSize: '13px', margin: '4px 0 0' }}>
            Based on <strong>Lipinski's Rule of Five</strong> — the first filter in drug discovery.
          </p>
        </div>

        <div
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            background: overallPass ? '#e8f5e9' : '#fff3e0',
            border: `2px solid ${overallPass ? '#4caf50' : '#ff9800'}`,
            color: overallPass ? '#2e7d32' : '#e65100',
            fontWeight: 700,
            fontSize: '15px',
            textAlign: 'center',
          }}
        >
          {overallPass ? '✅ Drug-like' : '⚠️ Not drug-like'}
          <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '2px' }}>
            {passedCount}/4 rules passed
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {rules.map((rule) => (
          <div
            key={rule.name}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: rule.passed ? '#f1f8e9' : '#ffebee',
              borderLeft: `4px solid ${rule.passed ? '#7cb342' : '#e53935'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontWeight: 600, color: '#333' }}>
                {rule.passed ? '✅' : '❌'} {rule.name}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                <strong>{rule.value}</strong> <span style={{ opacity: 0.7 }}>({rule.threshold})</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{rule.why}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '14px',
          padding: '12px',
          borderRadius: '8px',
          background: '#f5f5f5',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            QED Score (Drug-likeness)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: qedColor }}>
            {qed.toFixed(2)} <span style={{ fontSize: '14px', fontWeight: 500 }}>({qedLabel})</span>
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
            0 = poor, 1 = excellent
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Polar Surface Area (TPSA)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#00695c' }}>
            {analysis.tpsa.toFixed(1)} Å²
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
            ≤ 140 Å² is good for oral absorption
          </div>
        </div>
      </div>

      {analysis.lipinski_violations > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: '#fffde7',
            border: '1px solid #fbc02d',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#795548',
          }}
        >
          <strong>Note:</strong> {analysis.lipinski_violations} Lipinski rule
          {analysis.lipinski_violations !== 1 ? 's' : ''} failed. A molecule with ≤ 1 violation
          is still often considered drug-like — many real drugs break one rule.
        </div>
      )}
    </div>
  );
};

export default DrugLikenessPanel;
