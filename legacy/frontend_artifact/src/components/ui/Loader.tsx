import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', label }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div
        className={`${sizeClasses[size]} border-terracotta-200 border-t-terracotta-500 rounded-full animate-spin`}
      />
      {label && <p className="text-sm font-medium text-charcoal-700">{label}</p>}
    </div>
  );
};
