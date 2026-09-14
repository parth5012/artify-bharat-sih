import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50/60 rounded-3xl border border-red-200 text-red-900">
      <AlertTriangle className="w-10 h-10 text-red-600 mb-3" />
      <h3 className="text-lg font-bold font-heading">{title}</h3>
      <p className="text-sm mt-1 mb-5 text-red-700 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
