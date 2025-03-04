// This file adds a listener for websocket messages from our Vite plugin
// to display type errors during hot module replacement (HMR)

import { setTypeScriptError, clearTypeScriptError } from './ErrorBoundary';

// Track current errors to avoid duplicates
let currentError: string | null = null;

// Listen for error messages from our plugin
if ((import.meta as any).hot) {
  console.log('[TS Error Overlay] Setting up HMR listeners');

  // Listen for custom error events from our plugin
  (import.meta as any).hot.on('vite:error', (data: any) => {
    console.log('[TS Error Overlay] Received error:', data);
    if (data && data.plugin === 'vite-ts-error-overlay') {
      // Avoid duplicate errors
      if (currentError !== data.err.message) {
        currentError = data.err.message;
        // Use the new approach to throw errors within React's component tree
        setTypeScriptError(data.err.message, data.err.stack);
      }
    }
  });

  // Also listen for standard error events
  (import.meta as any).hot.on('error', (data: any) => {
    console.log('[TS Error Overlay] Received standard error:', data);
    if (data && data.plugin === 'vite-ts-error-overlay') {
      // Avoid duplicate errors
      if (currentError !== data.err.message) {
        currentError = data.err.message;
        // Use the new approach to throw errors within React's component tree
        setTypeScriptError(data.err.message, data.err.stack);
      }
    }
  });

  (import.meta as any).hot.on('vite:babel-error', (data: any) => {
    console.log('BABEL ERROR', data);
  });

  // Listen for error resolution events
  (import.meta as any).hot.on('vite:error:resolved', (data: any) => {
    console.log('[TS Error Overlay] Error resolved:', data);
    if (data && data.plugin === 'vite-ts-error-overlay') {
      currentError = null;
      clearTypeScriptError();
    }
  });
}

// Export a function to manually show errors if needed
export function showTypeScriptError(
  message: string,
  error: Error = new Error(message),
  errorInfo: React.ErrorInfo = { componentStack: '' } as React.ErrorInfo,
) {
  console.log(
    '[TS Error Overlay] Showing error:',
    message,
    currentError !== message,
  );
  // Avoid duplicate errors
  if (currentError !== message) {
    currentError = message;
    setTypeScriptError(message, error?.stack);
    console.error('Mimo Custom Component Error:', message, error?.stack);
  }
}

export function hideTypeScriptError() {
  console.log('[TS Error Overlay] Hiding error');
  currentError = null;
  clearTypeScriptError();
}
