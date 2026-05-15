import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CyberTable({ columns, data, actions, emptyMessage = 'No data found' }) {
  if (!data || data.length === 0) {
    return (
      <div className="cyber-table-container">
        <div className="empty-state">
          <h3>{emptyMessage}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-table-container">
      <table className="cyber-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td>
                  <div className="cyber-table-actions">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CyberPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="cyber-pagination">
      <button
        className="cyber-pagination-btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="cyber-pagination-info">…</span>
        ) : (
          <button
            key={p}
            className={`cyber-pagination-btn ${currentPage === p ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        className="cyber-pagination-btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
