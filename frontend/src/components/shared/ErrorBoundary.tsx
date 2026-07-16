import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                    <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
                    <p className="text-muted-foreground mb-4 max-w-md">
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}>
                        Return to Home
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
