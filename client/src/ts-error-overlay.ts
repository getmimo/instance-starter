// This file adds a listener for websocket messages from our Vite plugin
// to display type errors during hot module replacement (HMR)

import { setTypeScriptError, clearTypeScriptError } from './ErrorBoundary';

// Listen for error messages from our plugin
if ((import.meta as any).hot) {
  console.log('[TS Error Overlay] Setting up HMR listeners');

  // Listen for custom error events from our plugin
  (import.meta as any).hot.on('vite:error', (data: any) => {
    if (data && data.plugin === 'vite-ts-error-overlay') {
      // Use the new approach to throw errors within React's component tree
      setTypeScriptError(data.err.message, data.err.stack);
    }
  });

  // Also listen for standard error events
  (import.meta as any).hot.on('error', (data: any) => {
    if (data && data.plugin === 'vite-ts-error-overlay') {
      // Use the new approach to throw errors within React's component tree
      setTypeScriptError(data.err.message, data.err.stack);
    }
  });

  // Listen for error resolution events
  (import.meta as any).hot.on('vite:error:resolved', (data: any) => {
    if (data && data.plugin === 'vite-ts-error-overlay') {
      // setTimeout(() => {
      clearTypeScriptError();
      // }, 1);
    }
  });
}

// Export a function to manually show errors if needed
export function showTypeScriptError(
  message: string,
  error: Error = new Error(message),
  errorInfo: React.ErrorInfo = { componentStack: '' } as React.ErrorInfo,
) {
  setTypeScriptError(message, error?.stack);
}

export function hideTypeScriptError() {
  clearTypeScriptError();
}
