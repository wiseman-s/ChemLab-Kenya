// src/components/CompoundExplorer.tsx
import React, { useMemo, useRef, useState } from 'react';
import { useGuestLimits } from '../contexts/GuestLimitsContext';
import {
  calculateElementComposition,
  type ElementComposition,
} from '../utils/formulaComposition';
import {
  searchCompounds,
  fetchExtras,
  structureImageUrl,
  SearchError,
  type Compound,
  type CompoundExtras,
  type SearchMode,
} from '../utils/pubchem';

const MODES: { value: SearchMode; label: string; placeholder: string }[] = [
  { value: 'auto', label: 'Auto-detect', placeholder: 'e.g. nitrobenzene, C6H5NO2, 50-00-0, aspirin...' },
  { value: 'name', label: 'Name / CAS', placeholder: 'e.g. nitrobenzene, acetic acid, 98-95-3' },
  { value: 'formula', label: 'Formula', placeholder: 'e.g. C6H5NO2 (case-sensitive)' },
  { value: 'smiles', label: 'SMILES', placeholder: 'e.g. C1=CC=C(C=C1)[N+](=O)[O-]' },
  { value: 'cid', label: 'PubChem CID', placeholder: 'e.g. 7416' },
];

const card: React.CSSProperties = { padding: '12px', background: 'white', borderRadius: '5px' };

const CompoundExplorer: React.FC = () => {
  const { tryUse } = useGuestLimits();

  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<SearchMode>('auto');
  const [results, setResults] = useState<Compound[]>([]);
  const [selected, setSelected] = useState<Compound | null>(null);
  const [extras, setExtras] = useState<CompoundExtras | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const requestId = useRef(0);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const composition: ElementComposition[] | null = useMemo(() => {
    if (!selected?.molecularFormula) return null;
    try {
      return calculateElementComposition(selected.molecularFormula);
    } catch (e) {
      console.warn('Could not calculate elemental composition:', e);
      return null;
    }
  }, [selected]);

  const selectCompound = (compound: Compound) => {
    setSelected(compound);
    setExtras(null);
    const id = requestId.current;
    fetchExtras(compound.cid)
      .then((e) => {
        if (id === requestId.current) setExtras(e);
      })
      .catch(() => {});
  };

  const runSearch = async (query: string, searchMode: SearchMode = mode) => {
    const q = query.trim();
    if (!q) {
      setError('Enter something to search for.');
      return;
    }

    if (!tryUse('compound')) return;

    const id = ++requestId.current;
    setLoading(true);
    setError('');
    setUnavailableMessage(null);
    setSuggestions([]);
    setResults([]);
    setSelected(null);
    setExtras(null);

    try {
      const found = await searchCompounds(q, searchMode);

      if (id !== requestId.current) return;

      // Backend returned "unavailable" — show friendly hint, don't break the UI
      if (found && (found as any).unavailable) {
        setUnavailableMessage(
          (found as any).message ||
            'Compound databases are busy right now. You can still draw the structure directly in the editor below.'
        );
        return;
      }

      if (!found || (Array.isArray(found) && found.length === 0)) {
        setError(`No compound found for "${q}". Try a different name or paste a SMILES string.`);
        return;
      }

      const list = Array.isArray(found) ? found : [found];
      setResults(list);
      selectCompound(list[0]);
    } catch (err) {
      if (id !== requestId.current) return;

      if (err instanceof SearchError) {
        // Distinguish "not found" from "providers down"
        if ((err as any).kind === 'unavailable') {
          setUnavailableMessage(err.message);
        } else {
          setError(err.message);
          setSuggestions(err.suggestions || []);
        }
      } else {
        setError('Something went wrong while searching. Check your connection and try again.');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch(searchTerm);
  };

  const copyText = (text: string, message: string) => {
    if (!text) return;
    const done = () => showToast(message);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  };

  const fallbackCopy = (text: string, onCopied: () => void) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onCopied();
  };

  const currentMode = MODES.find((m) => m.value === mode)!;

  const smallBtn: React.CSSProperties = {
    padding: '6px 16px',
    background: '#00897b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  };

  const properties: { label: string; value: React.ReactNode }[] = selected
    ? [
        { label: 'Exact Mass', value: selected.exactMass ? `${selected.exactMass} Da` : '—' },
        { label: 'XLogP', value: selected.xlogp ?? '—' },
        { label: 'TPSA', value: selected.tpsa != null ? `${selected.tpsa} Å²` : '—' },
        { label: 'H-Bond Donors', value: selected.hbd ?? '—' },
        { label: 'H-Bond Acceptors', value: selected.hba ?? '—' },
        { label: 'Rotatable Bonds', value: selected.rotatableBonds ?? '—' },
        { label: 'Charge', value: selected.charge ?? '—' },
        { label: 'Complexity', value: selected.complexity ?? '—' },
      ]
    : [];

  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        marginTop: '20px',
        position: 'relative',
      }}
    >
      <h2 style={{ color: '#00695c', marginBottom: '8px' }}>Compound Explorer</h2>
      <p style={{ color: '#666', marginTop: 0, marginBottom: '20px' }}>
        Search by name, CAS number, molecular formula, SMILES or PubChem CID. If the
        databases are busy, you can still draw the molecule directly in the editor
        below — the Compound Explorer is a helper, not a requirement.
      </p>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as SearchMode)}
          disabled={loading}
          style={{
            padding: '12px',
            border: '2px solid #00897b',
            borderRadius: '5px',
            fontSize: '15px',
            background: 'white',
          }}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentMode.placeholder}
          disabled={loading}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '12px',
            border: '2px solid #00897b',
            borderRadius: '5px',
            fontSize: '16px',
            outline: 'none',
          }}
        />

        <button
          onClick={() => runSearch(searchTerm)}
          disabled={loading}
          style={{
            padding: '12px 20px',
            background: loading ? '#80cbc4' : '#00897b',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Friendly "databases busy" banner — NOT an error, a hint */}
      {unavailableMessage && (
        <div
          style={{
            marginTop: '15px',
            padding: '12px 14px',
            background: '#fff8e1',
            border: '1px solid #ffe082',
            borderRadius: '5px',
            color: '#7a5c00',
            fontSize: '14px',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>💡</span>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', marginBottom: '2px' }}>
              Some databases are busy
            </strong>
            {unavailableMessage}
            <div style={{ marginTop: '6px', fontSize: '13px', color: '#8a6d00' }}>
              You can still draw the molecule in the editor below, or try the search
              again in a minute.
            </div>
            <button
              onClick={() => runSearch(searchTerm)}
              disabled={loading}
              style={{
                marginTop: '10px',
                padding: '6px 14px',
                background: loading ? '#ccc' : '#00897b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Retrying...' : 'Try again'}
            </button>
          </div>
        </div>
      )}

      {/* Real errors — invalid input, no match, network failure */}
      {error && (
        <div
          style={{
            marginTop: '15px',
            padding: '12px',
            background: '#ffebee',
            border: '1px solid #ef9a9a',
            borderRadius: '5px',
            color: '#c62828',
          }}
        >
          {error}
          {suggestions.length > 0 && (
            <div style={{ marginTop: '8px', color: '#444' }}>
              Did you mean:{' '}
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSearchTerm(s);
                    setMode('name');
                    runSearch(s, 'name');
                  }}
                  style={{
                    margin: '2px 6px 2px 0',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid #00897b',
                    background: 'white',
                    color: '#00695c',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multiple matches */}
      {results.length > 1 && (
        <div style={{ marginTop: '20px' }}>
          <strong style={{ color: '#00695c' }}>{results.length} matches</strong>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {results.map((r) => {
              const active = selected?.cid === r.cid;
              return (
                <button
                  key={r.cid || r.smiles || r.title}
                  onClick={() => selectCompound(r)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `2px solid ${active ? '#00695c' : '#b2dfdb'}`,
                    background: active ? '#e0f2f1' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{r.title}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                    {r.molecularFormula}
                    {r.cid ? ` · CID ${r.cid}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected compound */}
      {selected && (
        <div
          style={{
            marginTop: '25px',
            padding: '20px',
            background: '#f5f5f5',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <h2
              style={{
                color: '#00695c',
                marginTop: 0,
                marginBottom: '10px',
                textTransform: 'capitalize',
              }}
            >
              {selected.title}
            </h2>
          </div>

          {extras?.description && (
            <p style={{ ...card, marginTop: 0, color: '#444', fontSize: '14px', lineHeight: 1.5 }}>
              {extras.description}
            </p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '15px',
            }}
          >
            {selected.cid > 0 && (
              <div
                style={{
                  ...card,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gridColumn: '1 / -1',
                }}
              >
                <img
                  src={structureImageUrl(selected.cid)}
                  alt={`2D structure of ${selected.title}`}
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: '260px' }}
                  onError={(e) => {
                    // Hide broken image if PubChem image service is down
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div style={card}>
              <strong>Molecular Formula</strong>
              <div style={{ fontSize: '18px', marginTop: '5px', fontFamily: 'monospace' }}>
                {selected.molecularFormula}
              </div>
            </div>

            <div style={card}>
              <strong>Molecular Weight</strong>
              <div style={{ marginTop: '5px' }}>
                {selected.molecularWeight
                  ? `${selected.molecularWeight} g/mol`
                  : 'Not available'}
              </div>
            </div>

            <div style={{ ...card, gridColumn: '1 / -1' }}>
              <strong>IUPAC Name</strong>
              <div style={{ marginTop: '5px', wordBreak: 'break-word' }}>{selected.iupacName}</div>
            </div>

            <div style={{ ...card, gridColumn: '1 / -1' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <strong>SMILES</strong>
                <button
                  onClick={() =>
                    copyText(
                      selected.smiles,
                      'SMILES copied! You can now paste it into the Molecular Analyzer.'
                    )
                  }
                  disabled={!selected.smiles}
                  style={{
                    ...smallBtn,
                    background: selected.smiles ? '#00897b' : '#ccc',
                    cursor: selected.smiles ? 'pointer' : 'not-allowed',
                  }}
                >
                  Copy SMILES
                </button>
              </div>
              <div
                style={{
                  marginTop: '5px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  wordBreak: 'break-all',
                  background: '#fafafa',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0',
                }}
              >
                {selected.smiles || 'Not available'}
              </div>
            </div>

            {selected.inchiKey && (
              <div style={{ ...card, gridColumn: '1 / -1' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong>InChIKey</strong>
                  <button onClick={() => copyText(selected.inchiKey, 'InChIKey copied!')} style={smallBtn}>
                    Copy
                  </button>
                </div>
                <div
                  style={{
                    marginTop: '5px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    wordBreak: 'break-all',
                  }}
                >
                  {selected.inchiKey}
                </div>
              </div>
            )}

            <div style={{ ...card, gridColumn: '1 / -1' }}>
              <strong>Computed Properties</strong>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                  marginTop: '10px',
                }}
              >
                {properties.map((p) => (
                  <div
                    key={p.label}
                    style={{
                      background: '#fafafa',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #eee',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#666' }}>{p.label}</div>
                    <div style={{ fontWeight: 'bold' }}>{p.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {extras && extras.synonyms.length > 0 && (
              <div style={{ ...card, gridColumn: '1 / -1' }}>
                <strong>Also known as</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {extras.synonyms.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: '3px 10px',
                        background: '#e0f2f1',
                        borderRadius: '12px',
                        fontSize: '13px',
                        color: '#00695c',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {composition && composition.length > 0 && (
            <div
              style={{
                marginTop: '15px',
                padding: '15px',
                background: '#eef7f6',
                borderRadius: '6px',
                border: '1px solid #b2dfdb',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  marginBottom: '12px',
                  color: '#00695c',
                  fontSize: '17px',
                }}
              >
                Element Composition
              </strong>
              <div style={{ display: 'grid', gap: '8px' }}>
                {composition.map((el) => (
                  <div
                    key={el.symbol}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 100px',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                    }}
                  >
                    <div>
                      <strong>{el.symbol}</strong> <span style={{ color: '#666' }}>{el.name}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {el.count} atom{el.count !== 1 ? 's' : ''}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {el.percentage.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '13px', color: '#666' }}>
                Percentages represent the contribution of each element to the compound's total
                molecular mass.
              </p>
            </div>
          )}
        </div>
      )}

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#00695c',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 1000,
            maxWidth: '90vw',
            textAlign: 'center',
          }}
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default CompoundExplorer;
