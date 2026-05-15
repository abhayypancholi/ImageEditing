import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
}) => {
  const variantStyles = {
    default: 'bg-[var(--bg-card)] text-[var(--text-2)]',
    success: 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]',
    warning: 'bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]',
    error: 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]',
    info: 'bg-[var(--accent)]/20 text-[var(--accent)]',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};
