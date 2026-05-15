import React from 'react';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, className = '' }) => {
  return (
    <div className={`text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide mb-2 ${className}`}>
      {children}
    </div>
  );
};
