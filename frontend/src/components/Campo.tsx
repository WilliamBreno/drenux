import type { ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Campo({ label, children, className = '' }: Props) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-tinta-suave">
        {label}
      </span>
      {children}
    </label>
  );
}