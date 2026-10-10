import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Algo deu errado ao carregar</h2>
            <p className="text-sm text-gray-600">
              Ocorreu uma falha na renderização inicial da página.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs bg-gray-100 p-3 rounded text-left overflow-x-auto text-red-600 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#0056a4] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Recarregar Página
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Limpar Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
