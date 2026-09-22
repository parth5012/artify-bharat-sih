import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'outlined' | 'gold';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const variantStyles = {
    default: 'bg-cream-50 border border-terracotta-200/50 shadow-warm rounded-2xl',
    accent: 'bg-cream-50 border-l-4 border-l-terracotta-500 border-terracotta-200/50 shadow-warm rounded-2xl',
    outlined: 'bg-cream-50/60 border border-terracotta-200 rounded-2xl',
    gold: 'bg-cream-50 border border-heritage-gold/50 shadow-warm rounded-2xl relative overflow-hidden',
  };

  return (
    <div className={clsx(variantStyles[variant], paddingStyles[padding], className)} {...props}>
      {variant === 'gold' && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-heritage-gold/20 to-transparent pointer-events-none rounded-bl-full" />
      )}
      {children}
    </div>
  );
};
