// This file adds a listener for websocket messages from our Vite plugin
// to display type errors during hot module replacement (HMR)

// Track current errors to avoid duplicates
let currentError: string | null = null;

// Function to create and show the error overlay
export function showErrorOverlay(message: string, stack?: string): void {
  console.log('showErrorOverlay', message, stack);
  // First, hide any existing overlay
  hideErrorOverlay();

  // Create the overlay container
  const overlay = document.createElement('div');
  overlay.id = 'ts-error-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.zIndex = '9999';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(248, 240, 255, 0.95)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';

  // Create a content container for the error
  const contentContainer = document.createElement('div');
  contentContainer.style.width = '100%';
  contentContainer.style.maxWidth = '800px';
  contentContainer.style.backgroundColor = '#f8f0ff';
  contentContainer.style.border = '1px solid #8b5cf6';
  contentContainer.style.borderRadius = '6px';
  contentContainer.style.padding = '16px';
  contentContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

  // Create the header with title and dismiss button
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '16px';

  const title = document.createElement('h2');
  title.style.fontSize = '20px';
  title.style.fontWeight = 'bold';
  title.style.color = '#5b21b6';
  title.textContent = 'TypeScript Error 2';

  const dismissButton = document.createElement('button');
  dismissButton.style.padding = '4px 12px';
  dismissButton.style.fontSize = '14px';
  dismissButton.style.backgroundColor = '#ede9fe';
  dismissButton.style.color = '#5b21b6';
  dismissButton.style.border = 'none';
  dismissButton.style.borderRadius = '4px';
  dismissButton.style.cursor = 'pointer';
  dismissButton.textContent = 'Dismiss';
  dismissButton.onclick = hideErrorOverlay;

  header.appendChild(title);
  header.appendChild(dismissButton);

  // Create the error message container
  const errorContainer = document.createElement('div');
  errorContainer.style.backgroundColor = 'white';
  errorContainer.style.padding = '16px';
  errorContainer.style.borderRadius = '4px';
  errorContainer.style.border = '1px solid #ddd6fe';
  errorContainer.style.marginBottom = '16px';

  const errorMessage = document.createElement('p');
  errorMessage.style.fontSize = '14px';
  errorMessage.style.fontWeight = '500';
  errorMessage.style.color = '#5b21b6';
  errorMessage.style.marginBottom = '8px';
  errorMessage.textContent = message;

  errorContainer.appendChild(errorMessage);

  // Add stack trace if available
  if (stack) {
    const stackContainer = document.createElement('pre');
    stackContainer.style.fontSize = '12px';
    stackContainer.style.overflow = 'auto';
    stackContainer.style.padding = '8px';
    stackContainer.style.backgroundColor = '#f9fafb';
    stackContainer.style.borderRadius = '4px';
    stackContainer.style.maxHeight = '200px';
    stackContainer.textContent = stack;
    errorContainer.appendChild(stackContainer);
  }

  // Assemble the overlay
  contentContainer.appendChild(header);
  contentContainer.appendChild(errorContainer);
  overlay.appendChild(contentContainer);

  // Add to the document
  document.body.appendChild(overlay);

  // Update current error tracking
  currentError = message;
}

// Function to hide the error overlay
function hideErrorOverlay(): void {
  const existingOverlay = document.getElementById('ts-error-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
    currentError = null;

    // Refresh the page after dismissing the error
    window.location.reload();
  }
}

// Add a global error event listener to catch uncaught errors including syntax errors
window.addEventListener(
  'error',
  (event) => {
    console.log('error', event);
    if (
      event.message &&
      event.message.includes('Mimo Custom Component Error:')
    ) {
      return;
    }
    // Check if this is a syntax error
    if (
      event.error instanceof SyntaxError ||
      (event.message && event.message.includes('Uncaught SyntaxError')) ||
      (event.message && event.message.includes('Uncaught ReferenceError')) ||
      (event.message && event.message.includes('[vite] Internal Server Error'))
    ) {
      const errorMessage = event.message || 'Unknown Syntax Error';

      // Show in the overlay
      if (currentError !== errorMessage) {
        showErrorOverlay(errorMessage, event.error?.stack);
        console.error(
          'Mimo Custom Component Error:',
          errorMessage,
          event.error?.stack,
        );
      }
      event.preventDefault();
    }
  },
  true,
);

// Intercept console.error to filter Vite-related errors
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  console.log('error overwritten', args);
  const isAllreadyHandled = args.some(
    (arg) =>
      typeof arg === 'string' && arg.includes('Mimo Custom Component Error:'),
  );

  if (isAllreadyHandled) {
    originalConsoleError(...args);
    return;
  }

  // Check specifically for Uncaught SyntaxError
  const isUncaughtSyntaxError = args.some(
    (arg) => typeof arg === 'string' && arg.includes('Uncaught SyntaxError'),
  );

  const isViteError = args.some(
    (arg) =>
      typeof arg === 'string' &&
      (arg.includes('[vite]') ||
        arg.includes('Failed to load module script') ||
        arg.includes('Vite') ||
        arg.includes('SyntaxError:') ||
        arg.includes('ReferenceError:') ||
        arg.includes('vite:')),
  );

  const isViteStackError = args.some(
    (arg) =>
      typeof arg.stack === 'string' &&
      (arg.stack.includes('[vite]') ||
        arg.stack.includes('Failed to load module script') ||
        arg.stack.includes('Vite') ||
        arg.stack.includes('SyntaxError:') ||
        arg.stack.includes('vite:')),
  );

  const errorMessage = args
    .map((arg) => {
      console.log('arg', typeof arg, arg);
      if (typeof arg === 'string') {
        return arg;
      } else if (arg instanceof Error) {
        return arg.message || arg.toString();
      } else if (typeof arg === 'object') {
        try {
          // Handle SyntaxError objects and other error objects
          if (arg.message) {
            return arg.message;
          }
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      } else {
        return String(arg);
      }
    })
    .join(' ');

  // If it's an Uncaught SyntaxError, handle it specifically
  if (isUncaughtSyntaxError) {
    // Still show in the overlay
    if (currentError !== errorMessage) {
      console.log('isUncaughtSyntaxError');
      showErrorOverlay(errorMessage);
    }
  }
  // If it's a Vite error, capture it and show in our overlay
  else if (isViteError || isViteStackError) {
    // Only set if not already showing this error
    if (currentError !== errorMessage) {
      console.log('isViteError', errorMessage, args);
      showErrorOverlay(errorMessage);
    }
  } else {
    // Pass through normal errors to the original console.error
    originalConsoleError(...args);
  }
};

// Listen for error messages from our plugin
if ((import.meta as any).hot) {
  console.log('[TS Error Overlay] Setting up HMR listeners');

  // Listen for successful updates from Vite
  (import.meta as any).hot.on('vite:beforeUpdate', (data: any) => {
    hideErrorOverlay();
  });

  // (import.meta as any).hot.on('js-update', (data: any) => {
  //   console.log('js-update', data);
  // });

  // Listen for custom error events from our plugin
  // (import.meta as any).hot.on('vite:error', (data: any) => {
  //   console.log('[TS Error Overlay] Received error:', data);
  //   if (data && data.plugin === 'vite-ts-error-overlay') {
  //     // Avoid duplicate errors
  //     if (currentError !== data.err.message) {
  //       currentError = data.err.message;
  //       // Use the new approach to throw errors within React's component tree
  //       setTypeScriptError(data.err.message, data.err.stack);
  //     }
  //   }
  // });

  // Also listen for standard error events
  // (import.meta as any).hot.on('error', (data: any) => {
  //   console.log('[TS Error Overlay] Received standard error:', data);
  //   if (data && data.plugin === 'vite-ts-error-overlay') {
  //     // Avoid duplicate errors
  //     if (currentError !== data.err.message) {
  //       currentError = data.err.message;
  //       // Use the new approach to throw errors within React's component tree
  //       setTypeScriptError(data.err.message, data.err.stack);
  //     }
  //   }
  // });

  // Listen for error resolution events
  // (import.meta as any).hot.on('vite:error:resolved', (data: any) => {
  //   console.log('[TS Error Overlay] Error resolved:', data);
  //   if (data && data.plugin === 'vite-ts-error-overlay') {
  //     currentError = null;
  //     clearTypeScriptError();
  //   }
  // });
}

// Export a function to manually show errors if needed
export function showTypeScriptError(
  message: string,
  error: Error = new Error(message),
  errorInfo: React.ErrorInfo = { componentStack: '' } as React.ErrorInfo,
) {
  if (currentError !== message) {
    currentError = message;
    // setTypeScriptError(message, error?.stack);
    console.error('Mimo Custom Component Error:', message, error?.stack);
  }
}

export function hideTypeScriptError() {
  console.log('[TS Error Overlay] Hiding error');
  currentError = null;
  // clearTypeScriptError();
}
