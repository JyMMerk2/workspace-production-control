import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely catch and silence any uncaught cross-origin script errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message === 'Script error.' || event.message?.includes('Script error')) {
      event.preventDefault();
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
  });
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Captured rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#12161f] border border-red-500/40 rounded-2xl p-8 max-w-md shadow-2xl">
            <h2 className="text-xl font-black text-red-400 mb-2">Restableciendo Workspace</h2>
            <p className="text-sm text-gray-400 mb-6">Se detectó una discrepancia en la vista. Haz clic abajo para recargar la aplicación limpiamente.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-xl bg-[#00f2fe] text-[#0b0e14] font-black hover:bg-[#00f2fe]/80 transition-all cursor-pointer"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
