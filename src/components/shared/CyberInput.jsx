import React from 'react';
import { Search } from 'lucide-react';

export function CyberInput({ label, icon, search, className = '', ...props }) {
  const wrapperCls = ['cyber-input-wrapper', label && 'has-label', className].filter(Boolean).join(' ');

  return (
    <div className={wrapperCls}>
      {label && <label>{label}</label>}
      {search && <Search size={16} className="cyber-search-icon" />}
      <input
        className={`cyber-input ${search ? 'cyber-input--search' : ''}`}
        {...props}
      />
    </div>
  );
}

export function CyberSelect({ label, children, className = '', ...props }) {
  return (
    <div className={`cyber-input-wrapper ${className}`}>
      {label && <label>{label}</label>}
      <select className="cyber-select" {...props}>
        {children}
      </select>
    </div>
  );
}
