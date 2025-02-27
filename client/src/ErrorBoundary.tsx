import * as React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      'Mimo Custom Component Error:',
      error,
      errorInfo.componentStack,
    );

    // Optional: Send errors to an error logging service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-product2-500 bg-product2-50 p-4 shadow max-w-[1000px] mx-auto mt-10">
          <h2 className="mb-2 text-xl font-bold text-product2-700">
            Something went wrong!
          </h2>
          <p className="text-sm text-product2-700">
            {this.state.error?.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
