import type { ViteDevServer } from 'vite';

// Error tracking interface
export interface ErrorInfo {
  id: string;
  message: string;
  plugin: string;
}

// Central error tracking system
class ErrorTracker {
  private errors = new Map<string, ErrorInfo>();
  private server: ViteDevServer | null = null;

  // Register the server instance
  setServer(server: ViteDevServer) {
    this.server = server;
  }

  // Add an error to tracking
  addError(error: ErrorInfo): void {
    this.errors.set(error.id, error);
  }

  // Remove an error from tracking
  removeError(id: string): void {
    this.errors.delete(id);
    
    // Check if all errors are resolved
    if (this.errors.size === 0) {
      this.sendResolvedEvent();
    }
  }

  // Check if a file has errors
  hasError(id: string): boolean {
    return this.errors.has(id);
  }

  // Get all current errors
  getAllErrors(): ErrorInfo[] {
    return Array.from(this.errors.values());
  }

  // Clear all errors
  clearAllErrors(): void {
    this.errors.clear();
  }

  // Send a resolved event to the client
  private sendResolvedEvent(): void {
    if (!this.server) return;

    this.server.ws.send({
      type: 'custom',
      event: 'vite:error:resolved',
      data: {
        plugin: 'vite-error-tracker',
      },
    });
  }
}

// Create a singleton instance
export const errorTracker = new ErrorTracker(); 