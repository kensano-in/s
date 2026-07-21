'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in', this.props.name || 'Component', error);
    console.error('Error stack trace:', error?.stack);
    console.error('React component stack:', errorInfo?.componentStack);
    
    const errorMessage = error.message || '';
    if (
      errorMessage.includes('ChunkLoadError') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('changed size between renders') ||
      errorMessage.includes('Minified React error')
    ) {
      console.warn(`[Auto-Heal - DISABLED FOR DEBUGGING] Would have reloaded for:`, errorMessage);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center h-full bg-[#09090f]">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-white/50 mb-4">
            {this.state.error?.message || 'An unexpected error occurred in this component.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
