import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'verified' | 'pending' | 'danger' | 'gold' | 'neutral' | 'cluster';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'verified',
  size = 'md',
  icon,
  className,
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs font-semibold',
  };

  const variantStyles = {
    verified: 'bg-emerald-100 text-emerald-800 border border-emerald-300/60',
    pending: 'bg-amber-100 text-amber-800 border border-amber-300/60',
    danger: 'bg-red-100 text-red-800 border border-red-300/60',
    gold: 'bg-yellow-100 text-yellow-800 border border-heritage-gold/60',
    neutral: 'bg-cream-200 text-charcoal-700 border border-cream-300',
    cluster: 'bg-terracotta-100 text-terracotta-800 border border-terracotta-300',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide uppercase',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
