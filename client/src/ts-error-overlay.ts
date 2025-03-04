// This file adds a listener for websocket messages from our Vite plugin
// to display type errors during hot module replacement (HMR)

// Track current errors to avoid duplicates
let currentError: string | null = null;

// Function to create and show the error overlay
export function showErrorOverlay(message: string, stack?: string): void {
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
      (event.message && event.message.includes('ReferenceError')) ||
      (event.message && event.message.includes('Uncaught TypeError')) ||
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
        arg.includes('Uncaught TypeError:') ||
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
      showErrorOverlay(errorMessage);
    }
  }
  // If it's a Vite error, capture it and show in our overlay
  else if (isViteError || isViteStackError) {
    // Only set if not already showing this error
    if (currentError !== errorMessage) {
      showErrorOverlay(errorMessage);
    }
  } else {
    // Pass through normal errors to the original console.error
    originalConsoleError(...args);
  }
};

// Listen for error messages from our plugin
if ((import.meta as any).hot) {
  // Listen for successful updates from Vite
  (import.meta as any).hot.on('vite:beforeUpdate', (data: any) => {
    hideErrorOverlay();
    showLoadingIndicator();
  });
  (import.meta as any).hot.on('vite:afterUpdate', (data: any) => {
    hideLoadingIndicator();
  });

  // Function to add a loading indicator to the top right of the screen
  function showLoadingIndicator(): void {
    // Remove any existing indicator first
    hideLoadingIndicator();

    // Create the loading indicator container
    const indicator = document.createElement('div');
    indicator.id = 'ts-loading-indicator';
    indicator.style.position = 'fixed';
    indicator.style.top = '16px';
    indicator.style.right = '16px';
    indicator.style.zIndex = '9998';
    indicator.style.width = '32px';
    indicator.style.height = '32px';

    // Create SVG spinner
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.animation = 'ts-loading-spin 1s linear infinite';

    // Create the circular path
    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    );
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#8b5cf6');
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('stroke-dasharray', '60 30');

    // Add the circle to the SVG
    svg.appendChild(circle);

    // Add the SVG to the indicator
    indicator.appendChild(svg);

    // Add the animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ts-loading-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    // Add the indicator to the document
    document.body.appendChild(indicator);
  }

  // Function to remove the loading indicator
  function hideLoadingIndicator(): void {
    const indicator = document.getElementById('ts-loading-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
}
