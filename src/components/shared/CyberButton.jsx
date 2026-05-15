import React from 'react';

export function CyberButton({ children, variant = 'primary', size, icon, className = '', ...props }) {
  const cls = [
    'cyber-btn',
    `cyber-btn--${variant}`,
    size === 'sm' && 'cyber-btn--sm',
    size === 'icon' && 'cyber-btn--icon',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} {...props}>
      {icon && icon}
      {children}
    </button>
  );
}
