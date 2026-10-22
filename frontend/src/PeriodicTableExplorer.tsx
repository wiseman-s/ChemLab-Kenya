// src/PeriodicTableExplorer.tsx

import React, { useState } from 'react';
import {
  ELEMENTS,
  CATEGORY_COLORS,
  CATEGORY_NOTES,
  MAIN_TABLE,
  LANTHANIDES,
  ACTINIDES,
} from './data/periodicTable';

import type { Element } from './data/periodicTable';

export { ELEMENTS, CATEGORY_COLORS, MAIN_TABLE, LANTHANIDES, ACTINIDES };

const PeriodicTableExplorer: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredElements = ELEMENTS.filter((el) => {
    const search = searchTerm.toLowerCase();
    return (
      el.name.toLowerCase().includes(search) ||
      el.symbol.toLowerCase().includes(search) ||
      el.number.toString().includes(searchTerm)
    );
  });

  const getCategoryColor = (category: string): string => {
    return CATEGORY_COLORS[category] || '#eee';
  };

  const handleElementClick = (el: Element) => {
    setSelectedElement(el);
    setSelectedCategory(null);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSelectedElement(null);
  };

  const closePanel = () => {
    setSelectedElement(null);
    setSelectedCategory(null);
  };

  const renderCell = (el: Element, size: 'main' | 'f-block' = 'main') => {
    const color = getCategoryColor(el.category);
    const isSelected = selectedElement?.number === el.number;
    const isDimmed = searchTerm && !filteredElements.some((f) => f.number === el.number);

    return (
      <div
        key={el.number}
        onClick={() => handleElementClick(el)}
        title={`${el.name} (${el.symbol}) — ${el.category}`}
        style={{
          background: color,
          padding: size === 'main' ? '4px 2px' : '6px 3px',
          borderRadius: '4px',
          cursor: 'pointer',
          textAlign: 'center',
          border: isSelected ? '2px solid #00695c' : '1px solid rgba(0,0,0,0.15)',
          minHeight: size === 'main' ? '52px' : '44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'transform 0.15s, box-shadow 0.15s',
          opacity: isDimmed ? 0.25 : 1,
          boxShadow: isSelected ? '0 0 0 2px #00897b' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.zIndex = '10';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.zIndex = '1';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ fontWeight: 700, fontSize: size === 'main' ? '14px' : '13px', lineHeight: 1 }}>
          {el.symbol}
        </div>
        <div style={{ fontSize: '8px', opacity: 0.7, marginTop: '2px' }}>{el.number}</div>
        {size === 'main' && (
          <div
            style={{
              fontSize: '7px',
              opacity: 0.75,
              marginTop: '1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {el.name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <h2 style={{ color: '#00695c', margin: 0 }}>Periodic Table Explorer</h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search element..."
          style={{
            padding: '8px 12px',
            border: '2px solid #00897b',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '220px',
            outline: 'none',
          }}
        />
      </div>

      {/* Periodic Table Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(18, minmax(38px, 1fr))',
          gap: '3px',
          marginBottom: '12px',
          overflowX: 'auto',
        }}
      >
        {MAIN_TABLE.map((el) => renderCell(el))}
      </div>

      {/* Lanthanides / Actinides */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
          Lanthanides (57–71)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(38px, 1fr))', gap: '3px', overflowX: 'auto' }}>
          {LANTHANIDES.map((el) => renderCell(el, 'f-block'))}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginBottom: '4px' }}>
          Actinides (89–103)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(38px, 1fr))', gap: '3px', overflowX: 'auto' }}>
          {ACTINIDES.map((el) => renderCell(el, 'f-block'))}
        </div>
      </div>

      {/* Legend — clickable */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '10px',
          background: '#f5f5f5',
          borderRadius: '6px',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '13px', marginRight: '4px' }}>Legend (click for notes):</span>
        {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              background: selectedCategory === category ? '#e0f2f1' : 'transparent',
              border: selectedCategory === category ? '1px solid #00897b' : '1px solid transparent',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#333',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                background: color,
                borderRadius: '2px',
                border: '1px solid #ccc',
              }}
            />
            {category}
          </button>
        ))}
      </div>

      {/* Slide-in detail panel */}
      {(selectedElement || selectedCategory) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 'min(480px, 100vw)',
            height: '100vh',
            background: 'white',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.15)',
            zIndex: 3000,
            overflowY: 'auto',
            padding: '24px',
            boxSizing: 'border-box',
            animation: 'slideIn 0.25s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#00695c', margin: 0 }}>Details</h3>
            <button
              onClick={closePanel}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '26px',
                cursor: 'pointer',
                color: '#666',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Element view */}
          {selectedElement && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    background: getCategoryColor(selectedElement.category),
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '2px solid #00695c',
                  }}
                >
                  <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>{selectedElement.symbol}</div>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>{selectedElement.number}</div>
                </div>
                <div>
                  <h2 style={{ margin: 0, color: '#00695c' }}>{selectedElement.name}</h2>
                  <div style={{ fontSize: '13px', color: '#666', textTransform: 'capitalize' }}>
                    {selectedElement.category}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    Period {selectedElement.period}
                    {selectedElement.group !== null && ` · Group ${selectedElement.group}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <Info label="Atomic Mass" value={`${selectedElement.mass} u`} />
                <Info label="Atomic Number" value={String(selectedElement.number)} />
                {selectedElement.state && <Info label="State" value={selectedElement.state} />}
                {selectedElement.color && <Info label="Colour" value={selectedElement.color} />}
                {selectedElement.electronConfiguration && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Info label="Electron Configuration" value={selectedElement.electronConfiguration} mono />
                  </div>
                )}
              </div>

              {selectedElement.notes && (
                <Section title="Notes">
                  <p style={{ margin: 0, lineHeight: 1.6 }}>{selectedElement.notes}</p>
                </Section>
              )}

              {selectedElement.uses && (
                <Section title="Common Uses">
                  <p style={{ margin: 0, lineHeight: 1.6 }}>{selectedElement.uses}</p>
                </Section>
              )}
            </div>
          )}

          {/* Category view */}
          {selectedCategory && CATEGORY_NOTES[selectedCategory] && (
            <div>
              <h2 style={{ color: '#00695c', marginTop: 0 }}>{CATEGORY_NOTES[selectedCategory].title}</h2>
              <p style={{ lineHeight: 1.6, color: '#444' }}>
                {CATEGORY_NOTES[selectedCategory].description}
              </p>
              <h4 style={{ color: '#00695c', marginTop: '20px' }}>Key Points</h4>
              <ul style={{ lineHeight: 1.7, paddingLeft: '20px' }}>
                {CATEGORY_NOTES[selectedCategory].keyPoints.map((point, i) => (
                  <li key={i} style={{ marginBottom: '8px' }}>{point}</li>
                ))}
              </ul>
              <button
                onClick={() => {
                  const firstEl = ELEMENTS.find((e) => e.category === selectedCategory);
                  if (firstEl) handleElementClick(firstEl);
                }}
                style={{
                  marginTop: '20px',
                  padding: '10px 18px',
                  background: '#00897b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Explore an example element →
              </button>
            </div>
          )}

          {selectedCategory && !CATEGORY_NOTES[selectedCategory] && (
            <p>No notes available for this category.</p>
          )}
        </div>
      )}

      {/* Backdrop when panel is open on mobile */}
      {(selectedElement || selectedCategory) && (
        <div
          onClick={closePanel}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 2999,
            display: window.innerWidth < 640 ? 'block' : 'none',
          }}
        />
      )}

      {/* Inline animation for slide-in */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

// Small helper components
const Info: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px' }}>
    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
    <div style={{ fontSize: '15px', fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>
      {value}
    </div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <h4 style={{ color: '#00695c', marginBottom: '8px', marginTop: 0 }}>{title}</h4>
    <div style={{ fontSize: '14px', color: '#333' }}>{children}</div>
  </div>
);

export default PeriodicTableExplorer;
