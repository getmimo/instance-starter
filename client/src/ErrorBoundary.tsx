import * as React from 'react';

// Global error state that can be set from outside React
interface ErrorState {
  hasError: boolean;
  message: string;
  stack?: string;
}

// Create a global error state that can be accessed from outside React
const globalErrorState: ErrorState = {
  hasError: false,
  message: '',
};

// Function to set an error from anywhere in the code
export function setTypeScriptError(message: string, stack?: string): void {
  globalErrorState.hasError = true;
  globalErrorState.message = message;
  globalErrorState.stack = stack;

  const event = new CustomEvent('typescript-error', {
    bubbles: true,
    cancelable: true,
    detail: { message, stack },
  });
  document.dispatchEvent(event);
}

// Function to clear the error
export function clearTypeScriptError(): void {
  globalErrorState.hasError = false;
  globalErrorState.message = '';
  globalErrorState.stack = undefined;

  const event = new CustomEvent('typescript-error-cleared', {
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: { message: string; stack: string } | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };

    const clearError = () => {
      console.log('Clearing error');
      this.setState({ hasError: false, error: null, errorInfo: null });
    };

    const handleError = (event: CustomEvent) => {
      console.error(
        'Mimo Custom Component Error:',
        event.detail.message,
        event.detail.stack,
      );
      this.setState({
        hasError: true,
        error: { message: event.detail.message, stack: event.detail.stack },
        errorInfo: null,
      });
    };

    // Use both document and window as targets
    document.addEventListener('typescript-error-cleared', clearError);

    document.addEventListener('typescript-error', handleError);
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error info

    // Handle regular React errors
    this.setState({ errorInfo });
    console.error(
      'Mimo Custom Component Error:',
      error,
      errorInfo.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-product2-500 bg-product2-50 p-4 shadow max-w-[1000px] mx-auto mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-product2-700">
              TypeScript Error
            </h2>
            <button
              className="px-3 py-1 text-sm bg-product2-100 hover:bg-product2-200 text-product2-700 rounded"
              onClick={() =>
                this.setState({ hasError: false, error: null, errorInfo: null })
              }
            >
              Dismiss
            </button>
          </div>

          <div className="bg-white p-4 rounded border border-product2-200 mb-4">
            <p className="text-sm font-medium text-product2-700 mb-2">
              {this.state.error?.message}
            </p>
            {this.state.error?.stack && (
              <pre className="text-xs overflow-auto p-2 bg-gray-50 rounded max-h-[200px]">
                {this.state.error.stack}
              </pre>
            )}
          </div>

          {this.state.errorInfo && (
            <div className="bg-white p-4 rounded border border-product2-200">
              <h3 className="text-sm font-medium text-product2-700 mb-2">
                Component Stack
              </h3>
              <pre className="text-xs overflow-auto p-2 bg-gray-50 rounded max-h-[200px]">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
