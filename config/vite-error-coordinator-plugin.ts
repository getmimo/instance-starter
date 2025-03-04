import type { Plugin } from 'vite';
import { errorTracker } from './error-tracking';

/**
 * Vite plugin to coordinate error tracking and ensure the vite:error:resolved event
 * is sent when all errors are fixed.
 */
export function viteErrorCoordinatorPlugin(): Plugin {
  return {
    name: 'vite-error-coordinator',
    
    // Run after other plugins
    enforce: 'post',
    
    configureServer(server) {
      // Register the server with our error tracker
      errorTracker.setServer(server);
      
      // Clear all errors when the server starts
      errorTracker.clearAllErrors();
      
      // Listen for build end events
      server.httpServer?.on('listening', () => {
        // Send a resolved event if there are no errors at startup
        if (errorTracker.getAllErrors().length === 0) {
          server.ws.send({
            type: 'custom',
            event: 'vite:error:resolved',
            data: {
              plugin: 'vite-error-coordinator',
            },
          });
        }
      });
    },
    
    // Hook into the build process
    buildStart() {
      // Clear all errors at the start of each build
      errorTracker.clearAllErrors();
    },
    
    // Hook into the build end process
    buildEnd() {
      // If there are no errors, send a resolved event
      if (errorTracker.getAllErrors().length === 0) {
        // We can't send WebSocket messages here directly since the server might not be available
        // The individual plugins will handle this when they detect no errors
      }
    },
    
    // Handle hot updates
    handleHotUpdate({ file, server }) {
      // This runs after all other plugins have processed the update
      // If there are no errors left, send a resolved event
      if (errorTracker.getAllErrors().length === 0) {
        server.ws.send({
          type: 'custom',
          event: 'vite:error:resolved',
          data: {
            plugin: 'vite-error-coordinator',
          },
        });
      }
      
      // Don't modify the HMR behavior
      return;
    },
  };
} 