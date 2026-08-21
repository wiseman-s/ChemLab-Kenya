// src/PeriodicTableExplorer.tsx

import React, { useState } from 'react';
import {
  ELEMENTS,
  CATEGORY_COLORS,
  MAIN_TABLE,
  LANTHANIDES,
  ACTINIDES,
} from './data/periodicTable';

import type { Element } from './data/periodicTable';

// Re-export for compatibility
export { ELEMENTS, CATEGORY_COLORS, MAIN_TABLE, LANTHANIDES, ACTINIDES };

const PeriodicTableExplorer: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Get unique categories
  const categories = ['All', ...new Set(ELEMENTS.map(el => el.category))];

  // Filter elements based on search and category
  const filteredElements = ELEMENTS.filter(el => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      el.name.toLowerCase().includes(search) ||
      el.symbol.toLowerCase().includes(search) ||
      el.number.toString().includes(searchTerm);

    const matchesCategory =
      filterCategory === 'All' || el.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Group elements by period
  const elementsByPeriod: { [key: number]: Element[] } = {};

  ELEMENTS.forEach(el => {
    if (!elementsByPeriod[el.period]) {
      elementsByPeriod[el.period] = [];
    }

    elementsByPeriod[el.period].push(el);
  });

  const handleElementClick = (element: Element) => {
    setSelectedElement(element);
  };

  const getCategoryColor = (category: string): string => {
    return CATEGORY_COLORS[category] || '#eee';
  };

  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}
    >
      <h2 style={{ color: '#00695c', marginBottom: '20px' }}>
        🔬 Periodic Table Explorer
      </h2>

      {/* Search and Filter */}
      <div
        style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Search by name, symbol, or atomic number..."
          style={{
            flex: 1,
            padding: '10px',
            border: '2px solid #00897b',
            borderRadius: '4px',
            fontSize: '16px',
            minWidth: '200px',
          }}
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: '10px',
            border: '2px solid #00897b',
            borderRadius: '4px',
            fontSize: '16px',
            background: 'white',
          }}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Periodic Table Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(18, minmax(45px, 1fr))',
          gap: '3px',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {MAIN_TABLE.map((el) => {
          const color = getCategoryColor(el.category);

          return (
            <div
              key={el.number}
              onClick={() => handleElementClick(el)}
              style={{
                background: color,
                padding: '4px 2px',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '11px',
                border:
                  selectedElement?.number === el.number
                    ? '3px solid #00695c'
                    : '1px solid #ddd',
                minHeight: '50px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                transition: 'transform 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.zIndex = '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = '1';
              }}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                {el.symbol}
              </div>

              <div
                style={{
                  fontSize: '8px',
                  opacity: 0.7,
                }}
              >
                {el.number}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lanthanides and Actinides */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#00695c' }}>Lanthanides</h4>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15, minmax(45px, 1fr))',
            gap: '3px',
            overflowX: 'auto',
          }}
        >
          {LANTHANIDES.map((el) => (
            <div
              key={el.number}
              onClick={() => handleElementClick(el)}
              style={{
                background: getCategoryColor(el.category),
                padding: '6px 3px',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'center',
                border:
                  selectedElement?.number === el.number
                    ? '3px solid #00695c'
                    : '1px solid #ddd',
              }}
            >
              <strong>{el.symbol}</strong>
              <div style={{ fontSize: '8px' }}>{el.number}</div>
            </div>
          ))}
        </div>

        <h4 style={{ color: '#00695c', marginTop: '15px' }}>
          Actinides
        </h4>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15, minmax(45px, 1fr))',
            gap: '3px',
            overflowX: 'auto',
          }}
        >
          {ACTINIDES.map((el) => (
            <div
              key={el.number}
              onClick={() => handleElementClick(el)}
              style={{
                background: getCategoryColor(el.category),
                padding: '6px 3px',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'center',
                border:
                  selectedElement?.number === el.number
                    ? '3px solid #00695c'
                    : '1px solid #ddd',
              }}
            >
              <strong>{el.symbol}</strong>
              <div style={{ fontSize: '8px' }}>{el.number}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Element Details */}
      {selectedElement && (
        <div
          style={{
            padding: '20px',
            background: '#f5f5f5',
            borderRadius: '8px',
            border: '2px solid #00897b',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    background: getCategoryColor(
                      selectedElement.category
                    ),
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    border: '2px solid #00695c',
                  }}
                >
                  {selectedElement.symbol}

                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'normal',
                    }}
                  >
                    {selectedElement.number}
                  </div>
                </div>

                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: '#00695c',
                    }}
                  >
                    {selectedElement.name}
                  </h3>

                  <p
                    style={{
                      margin: '5px 0',
                      color: '#666',
                    }}
                  >
                    {selectedElement.category} • Period{' '}
                    {selectedElement.period} • Group{' '}
                    {selectedElement.group ?? 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0 }}>
                <strong>Atomic Mass:</strong>{' '}
                {selectedElement.mass} g/mol
              </p>

              <p
                style={{
                  margin: '5px 0 0',
                  fontSize: '0.9rem',
                  color: '#666',
                }}
              >
                Atomic Number: {selectedElement.number}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#00695c' }}>
          Elements ({filteredElements.length} found)
        </h4>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '10px',
            background: '#fafafa',
            borderRadius: '4px',
          }}
        >
          {filteredElements.slice(0, 50).map((el) => (
            <div
              key={el.number}
              onClick={() => handleElementClick(el)}
              style={{
                padding: '5px 10px',
                background: getCategoryColor(el.category),
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
              }}
            >
              <span>{el.symbol}</span>

              <span
                style={{
                  fontSize: '12px',
                  opacity: 0.7,
                }}
              >
                {el.name}
              </span>
            </div>
          ))}

          {filteredElements.length > 50 && (
            <div
              style={{
                padding: '5px',
                color: '#666',
                textAlign: 'center',
              }}
            >
              +{filteredElements.length - 50} more...
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: '15px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '10px',
          background: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <span
          style={{
            fontWeight: 'bold',
            marginRight: '5px',
          }}
        >
          Legend:
        </span>

        {Object.entries(CATEGORY_COLORS).map(
          ([category, color]) => (
            <span
              key={category}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
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
            </span>
          )
        )}
      </div>
    </div>
  );
};

export default PeriodicTableExplorer;