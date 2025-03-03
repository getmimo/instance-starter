// This file adds a listener for websocket messages from our Vite plugin
// to display type errors during hot module replacement (HMR)

console.log('[TS Error Overlay] Initialized');
let errorOverlay: HTMLDivElement | null = null;

function createErrorOverlay(
  message: string,
  error: Error,
  errorInfo: React.ErrorInfo,
): HTMLDivElement {
  // Remove any existing overlay
  if (errorOverlay) {
    document.body.removeChild(errorOverlay);
  }

  // Create a new overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(20, 20, 30, 0.85)';
  overlay.style.backdropFilter = 'blur(8px)';
  overlay.style.zIndex = '9999';
  overlay.style.overflow = 'auto';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.color = '#fff';
  overlay.style.fontFamily =
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  overlay.style.fontSize = '14px';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  // Create container for the error card
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.maxWidth = '800px';
  container.style.backgroundColor = 'rgba(30, 30, 40, 0.95)';
  container.style.borderRadius = '12px';
  container.style.boxShadow =
    '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 20px 20px -5px rgba(0, 0, 0, 0.1)';
  container.style.overflow = 'hidden';
  container.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  container.style.transition = 'all 0.3s ease';

  // Header section
  const headerContainer = document.createElement('div');
  headerContainer.style.padding = '20px';
  headerContainer.style.backgroundColor = 'rgba(232, 59, 70, 0.8)';
  headerContainer.style.display = 'flex';
  headerContainer.style.justifyContent = 'space-between';
  headerContainer.style.alignItems = 'center';

  const headerTitle = document.createElement('h2');
  headerTitle.textContent = 'TypeScript Error';
  headerTitle.style.margin = '0';
  headerTitle.style.color = 'white';
  headerTitle.style.fontSize = '20px';
  headerTitle.style.fontWeight = '600';

  // Add a close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  closeButton.style.border = 'none';
  closeButton.style.color = 'white';
  closeButton.style.width = '30px';
  closeButton.style.height = '30px';
  closeButton.style.borderRadius = '50%';
  closeButton.style.fontSize = '20px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'flex';
  closeButton.style.justifyContent = 'center';
  closeButton.style.alignItems = 'center';
  closeButton.style.transition = 'all 0.2s ease';
  closeButton.style.lineHeight = '1';
  closeButton.style.outline = 'none';

  closeButton.addEventListener('mouseover', () => {
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  });

  closeButton.addEventListener('mouseout', () => {
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  });

  closeButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
    errorOverlay = null;
  });

  headerContainer.appendChild(headerTitle);
  headerContainer.appendChild(closeButton);
  container.appendChild(headerContainer);

  // Content section
  const contentContainer = document.createElement('div');
  contentContainer.style.padding = '20px';

  const content = document.createElement('pre');
  content.textContent = message;
  content.style.margin = '0';
  content.style.padding = '16px';
  content.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
  content.style.borderRadius = '8px';
  content.style.border = '1px solid rgba(232, 59, 70, 0.3)';
  content.style.color = '#e83b46';
  content.style.fontFamily =
    'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  content.style.fontSize = '14px';
  content.style.lineHeight = '1.5';
  content.style.whiteSpace = 'pre-wrap';
  content.style.overflow = 'auto';
  content.style.maxHeight = '300px';

  contentContainer.appendChild(content);

  // Button section
  const buttonContainer = document.createElement('div');
  buttonContainer.style.padding = '0 20px 20px 20px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'flex-end';
  buttonContainer.style.gap = '10px';

  const logErrorButton = document.createElement('button');
  logErrorButton.textContent = 'Log Error to Console';
  logErrorButton.style.padding = '8px 16px';
  logErrorButton.style.marginTop = '10px';
  logErrorButton.style.backgroundColor = 'rgba(232, 59, 70, 0.1)';
  logErrorButton.style.color = '#e83b46';
  logErrorButton.style.border = '1px solid rgba(232, 59, 70, 0.3)';
  logErrorButton.style.borderRadius = '6px';
  logErrorButton.style.cursor = 'pointer';
  logErrorButton.style.fontSize = '14px';
  logErrorButton.style.fontWeight = '500';
  logErrorButton.style.transition = 'all 0.2s ease';

  logErrorButton.addEventListener('mouseover', () => {
    logErrorButton.style.backgroundColor = 'rgba(232, 59, 70, 0.2)';
  });

  logErrorButton.addEventListener('mouseout', () => {
    logErrorButton.style.backgroundColor = 'rgba(232, 59, 70, 0.1)';
  });

  logErrorButton.addEventListener('click', () => {
    console.error(
      'Mimo Custom Component Error:',
      error,
      errorInfo.componentStack,
    );
  });

  buttonContainer.appendChild(logErrorButton);
  contentContainer.appendChild(buttonContainer);
  container.appendChild(contentContainer);

  overlay.appendChild(container);

  // Add subtle animation effect
  setTimeout(() => {
    container.style.transform = 'translateY(0)';
    container.style.opacity = '1';
  }, 10);
  container.style.transform = 'translateY(-20px)';
  container.style.opacity = '0';

  return overlay;
}

function showError(message: string, error: Error, errorInfo: React.ErrorInfo) {
  errorOverlay = createErrorOverlay(message, error, errorInfo);
  document.body.appendChild(errorOverlay);
}

// Listen for error messages from our plugin
if ((import.meta as any).hot) {
  // Listen for custom error events from our plugin
  (import.meta as any).hot.on('vite:error', (data: any) => {
    if (data && data.plugin === 'vite-ts-error-overlay') {
      showError(data.err.message, data.err.error, data.err.errorInfo);
    }
  });

  // Also listen for standard error events
  (import.meta as any).hot.on('error', (data: any) => {
    if (data && data.plugin === 'vite-ts-error-overlay') {
      showError(data.err.message, data.err.error, data.err.errorInfo);
    }
  });
}

// Export a function to manually show errors if needed
export function showTypeScriptError(message: string, error: Error, errorInfo: React.ErrorInfo) {
  showError(message, error, errorInfo);
}
