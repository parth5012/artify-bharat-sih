import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-cream-50/50 rounded-3xl border border-dashed border-terracotta-200">
      <div className="p-4 bg-terracotta-50 text-terracotta-500 rounded-2xl mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="text-lg font-bold font-heading text-charcoal-800">{title}</h3>
      <p className="text-sm text-charcoal-700 max-w-sm mt-1 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
