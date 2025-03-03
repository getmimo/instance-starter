import type { Plugin, ViteDevServer } from 'vite';
import colors from 'picocolors';

/**
 * Vite plugin to capture React-Babel errors during compilation
 * and provide a better error handling experience
 */
export function viteBabelErrorPlugin(): Plugin {
  // Track if we've handled an error to prevent double reporting
  let handledError = false;

  return {
    name: 'vite-babel-error-handler',

    // Higher priority than Vite's error overlay plugin
    enforce: 'pre',

    // Configure server to handle Babel errors
    configureServer(server) {
      // Create a custom error handler middleware
      server.middlewares.use((err, req, res, next) => {
        // Check if this is a Babel/React syntax error
        if (err && isBabelError(err)) {
          // Mark as handled to prevent double reporting
          handledError = true;

          // Format the error for better readability
          const formattedError = formatBabelError(err);

          // Send the error to the client in a format our client-side handler can process
          res.writeHead(200, {
            'Content-Type': 'text/html',
          });

          res.end(`
            <script type="module">
              // Send the error to our custom error handler
              const error = ${JSON.stringify(formattedError)};
              
              // Wait for the client to be ready
              window.addEventListener('DOMContentLoaded', () => {
                // Dispatch a custom event that our error handler can listen for
                window.dispatchEvent(new CustomEvent('vite:babel-error', { 
                  detail: error 
                }));
                
                // Also log to console for debugging
                console.error('[Babel Error]', error.message);
              });
            </script>
            <style>
              body { 
                background-color: rgba(0, 0, 0, 0.85);
                margin: 0;
                padding: 0;
                font-family: system-ui, -apple-system, sans-serif;
              }
            </style>
            <div id="root"></div>
          `);
          return;
        }

        // Not a Babel error, continue to next middleware
        next(err);
      });

      // Intercept WebSocket messages to prevent Vite from sending error overlays
      patchWebSocketServer(server);
    },

    // Hook into the build process to catch errors early
    buildStart() {
      // Reset handled error flag at the start of each build
      handledError = false;
    },

    // Intercept errors from the React-Babel plugin
    configResolved(config) {
      // Find the React plugin
      const reactPlugin = config.plugins.find(
        (p) =>
          p.name === 'vite:react-babel' ||
          p.name === '@vitejs/plugin-react' ||
          p.name === 'vite:react-refresh',
      );

      if (reactPlugin && reactPlugin.transform) {
        // Store the original transform function
        const originalTransform = reactPlugin.transform;

        // Override the transform function to catch errors
        // We need to handle both function and object with handler property
        if (typeof originalTransform === 'function') {
          reactPlugin.transform = function (code, id, options) {
            try {
              return originalTransform.call(this, code, id, options);
            } catch (error) {
              if (isBabelError(error) && !handledError) {
                handledError = true;

                // Format and store the error for our handler
                const formattedError = formatBabelError(error);

                // Store the error in a global variable that our client code can access
                (global as any).__VITE_BABEL_ERROR__ = formattedError;

                // Return empty code to prevent further errors
                return {
                  code: `
                    // Error intercepted by vite-babel-error-handler
                    console.error('[Babel Error]', ${JSON.stringify(
                      error.message,
                    )});
                    
                    // Dispatch error event
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('vite:babel-error', { 
                        detail: ${JSON.stringify(formattedError)} 
                      }));
                    }
                  `,
                  map: null,
                };
              }

              // Re-throw if not a Babel error or already handled
              throw error;
            }
          };
        } else if (
          typeof originalTransform === 'object' &&
          originalTransform.handler
        ) {
          // Handle the case where transform is an object with a handler property
          const originalHandler = originalTransform.handler;
          originalTransform.handler = function (code, id, options) {
            try {
              return originalHandler.call(this, code, id, options);
            } catch (error) {
              if (isBabelError(error) && !handledError) {
                handledError = true;

                // Format and store the error for our handler
                const formattedError = formatBabelError(error);

                // Store the error in a global variable that our client code can access
                (global as any).__VITE_BABEL_ERROR__ = formattedError;

                // Return empty code to prevent further errors
                return {
                  code: `
                    // Error intercepted by vite-babel-error-handler
                    console.error('[Babel Error]', ${JSON.stringify(
                      error.message,
                    )});
                    
                    // Dispatch error event
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('vite:babel-error', { 
                        detail: ${JSON.stringify(formattedError)} 
                      }));
                    }
                  `,
                  map: null,
                };
              }

              // Re-throw if not a Babel error or already handled
              throw error;
            }
          };
        }
      }
    },

    // Inject client code to handle the errors
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: `
            // Prevent the default Vite error overlay
            if (typeof window !== 'undefined') {
              // Override Vite's error overlay
              window.addEventListener('vite:error', (event) => {
                const err = event.detail.err || event.detail.error || event.detail;
                
                // Check if this is a React/Babel error
                if (err && (
                  (err.plugin && (
                    err.plugin === 'vite:react-babel' || 
                    err.plugin.includes('react')
                  )) ||
                  (err.message && (
                    err.message.includes('React') ||
                    err.message.includes('JSX') ||
                    err.message.includes('Babel') ||
                    err.message.includes('Unexpected token')
                  ))
                )) {
                  // Prevent the default error overlay
                  event.preventDefault();
                  event.stopPropagation();
                  
                  console.log('[Babel Error Handler] Prevented default Vite error overlay');
                }
              }, true);
            }
            
            // Listen for babel errors from the server
            window.addEventListener('vite:babel-error', (event) => {
              const error = event.detail;
              console.log('BABEL ERROR');
              // Create and show error overlay
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
              overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
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
              container.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 20px 20px -5px rgba(0, 0, 0, 0.1)';
              container.style.overflow = 'hidden';
              container.style.border = '1px solid rgba(255, 255, 255, 0.1)';
              
              // Header section
              const headerContainer = document.createElement('div');
              headerContainer.style.padding = '20px';
              headerContainer.style.backgroundColor = 'rgba(232, 59, 70, 0.8)';
              headerContainer.style.display = 'flex';
              headerContainer.style.justifyContent = 'space-between';
              headerContainer.style.alignItems = 'center';
              
              const headerTitle = document.createElement('h2');
              headerTitle.textContent = 'React/Babel Syntax Error';
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
              });
              
              headerContainer.appendChild(headerTitle);
              headerContainer.appendChild(closeButton);
              container.appendChild(headerContainer);
              
              // Content section
              const contentContainer = document.createElement('div');
              contentContainer.style.padding = '20px';
              
              const errorMessage = document.createElement('div');
              errorMessage.style.marginBottom = '16px';
              errorMessage.style.fontWeight = '500';
              errorMessage.style.color = '#e83b46';
              errorMessage.textContent = error.message;
              
              const errorLocation = document.createElement('div');
              errorLocation.style.marginBottom = '16px';
              errorLocation.style.fontSize = '14px';
              errorLocation.style.color = '#aaa';
              errorLocation.textContent = \`\${error.file || 'Unknown file'} (\${error.line || '?'}:\${error.column || '?'})\`;
              
              const errorCode = document.createElement('pre');
              errorCode.style.margin = '0';
              errorCode.style.padding = '16px';
              errorCode.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
              errorCode.style.borderRadius = '8px';
              errorCode.style.border = '1px solid rgba(232, 59, 70, 0.3)';
              errorCode.style.color = '#ddd';
              errorCode.style.fontFamily = 'SFMono-Regular, Menlo, Monaco, Consolas, monospace';
              errorCode.style.fontSize = '14px';
              errorCode.style.lineHeight = '1.5';
              errorCode.style.whiteSpace = 'pre-wrap';
              errorCode.style.overflow = 'auto';
              errorCode.style.maxHeight = '300px';
              errorCode.textContent = error.frame || error.stack || 'No code frame available';
              
              contentContainer.appendChild(errorMessage);
              contentContainer.appendChild(errorLocation);
              contentContainer.appendChild(errorCode);
              container.appendChild(contentContainer);
              
              overlay.appendChild(container);
              document.body.appendChild(overlay);
            });
          `,
          injectTo: 'head',
        },
      ];
    },
  };
}

/**
 * Patch the WebSocket server to prevent Vite from sending error overlays
 */
function patchWebSocketServer(server: ViteDevServer) {
  if (!server.ws) return;

  // Store the original send method
  const originalSend = server.ws.send;

  // Override the send method to filter out React-Babel errors
  server.ws.send = function (payload: any) {
    // Check if this is an error message
    if (payload.type === 'error' && payload.err) {
      const err = payload.err;

      // Check if this is a React/Babel error
      if (
        (err.plugin &&
          (err.plugin === 'vite:react-babel' ||
            err.plugin.includes('react'))) ||
        (err.message &&
          (err.message.includes('React') ||
            err.message.includes('JSX') ||
            err.message.includes('Babel') ||
            err.message.includes('Unexpected token')))
      ) {
        // Send our custom error event instead
        server.ws.send({
          type: 'custom',
          event: 'vite:babel-error',
          data: formatBabelError(err),
        });

        return;
      }
    }

    // Pass through all other messages
    return originalSend.call(this, payload);
  };
}

/**
 * Check if an error is a Babel/React syntax error
 */
function isBabelError(err: any): boolean {
  if (!err) return false;

  // Check error name
  if (err.name === 'SyntaxError') return true;

  // Check if it's from the React plugin
  if (
    err.plugin &&
    (err.plugin === 'vite:react-babel' || err.plugin.includes('react'))
  ) {
    return true;
  }

  // Check if it's a Babel error
  if (
    err.message &&
    (err.message.includes('Unexpected token') ||
      err.message.includes('Unexpected character') ||
      err.message.includes('JSX') ||
      err.message.includes('React') ||
      err.message.includes('Babel') ||
      err.message.includes('Parsing error'))
  ) {
    return true;
  }

  // Check for common Babel error properties
  if (err.loc || err.codeFrame || err.frame) {
    return true;
  }

  return false;
}

/**
 * Format a Babel error for better display
 */
function formatBabelError(err: any): Record<string, any> {
  return {
    message: err.message || 'Unknown Babel/React error',
    file: err.loc?.file || err.filename || err.id || 'Unknown file',
    line: err.loc?.line || err.line || null,
    column: err.loc?.column || err.column || null,
    frame: err.codeFrame || err.frame || null,
    stack: err.stack || null,
    plugin: err.plugin || null,
  };
}
