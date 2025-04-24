import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  message: string | null;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div className={cn("p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2", className)}>
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
};

export default ErrorDisplay;