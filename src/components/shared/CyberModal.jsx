import React from 'react';
import { X } from 'lucide-react';

export function CyberModal({ isOpen, onClose, title, size, children }) {
  if (!isOpen) return null;

  return (
    <div className="cyber-modal-overlay" onClick={onClose}>
      <div
        className={`cyber-modal ${size === 'lg' ? 'cyber-modal--lg' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cyber-modal-header">
          <h2 className="cyber-modal-title">{title}</h2>
          <button className="cyber-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
