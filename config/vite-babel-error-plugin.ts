import type { Plugin, ViteDevServer } from 'vite';

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
              console.log('transform');
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

    // Hook into the build process to catch errors early
    buildStart() {
      // Reset handled error flag at the start of each build
      handledError = false;
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
    if (payload.event === 'error' && payload.err) {
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
          event: 'vite:error',
          data: formatBabelError(err),
        });

        return;
      }

      // Check if this is an import resolution error
      if (
        (err.plugin && err.plugin === 'vite:import-analysis') ||
        (err.message && err.message.includes('Failed to resolve import'))
      ) {
        console.log('IMPORT ERROR', err);
        // Send our custom error event instead
        server.ws.send({
          type: 'custom',
          event: 'vite:error',
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

  // Check if it's an import resolution error
  if (
    (err.plugin && err.plugin === 'vite:import-analysis') ||
    (err.message && err.message.includes('Failed to resolve import'))
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
