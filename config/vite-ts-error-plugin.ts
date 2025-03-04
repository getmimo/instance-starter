import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import type { Diagnostic } from 'typescript';

// Use createRequire to handle ESM/CJS compatibility
const require = createRequire(import.meta.url);
let ts: typeof import('typescript');

try {
  ts = require('typescript');
} catch (e) {
  console.error('TypeScript not found. Please install TypeScript.');
  throw e;
}

// Create a formatted error message for the overlay
function formatDiagnostic(diagnostic: Diagnostic): string {
  const { line, character } = diagnostic.file
    ? ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!)
    : { line: 0, character: 0 };

  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  const fileName = diagnostic.file
    ? path.relative(process.cwd(), diagnostic.file.fileName)
    : '';

  return `Error in ${fileName}(${line + 1},${character + 1}):\n${message}`;
}

// Add a program cache to avoid recreating the program for every check
let programCache: {
  program: any; // Use any to avoid TypeScript namespace issues
  fileVersions: Map<string, string>;
} | null = null;

// Track errors by file path
const errorsByFile = new Map<string, Diagnostic[]>();

// Type check a file and return diagnostics
function typeCheckFile(fileName: string, compilerOptions: any): Diagnostic[] {
  try {
    // Check if we need to create or update the program
    if (!programCache) {
      const program = ts.createProgram([fileName], compilerOptions);
      // Initialize cache
      programCache = {
        program,
        fileVersions: new Map([[fileName, fs.readFileSync(fileName, 'utf8')]]),
      };
    } else {
      // Check if the file has changed
      const currentContent = fs.readFileSync(fileName, 'utf8');
      const cachedContent = programCache.fileVersions.get(fileName);

      if (currentContent !== cachedContent) {
        // Update the program with the new file content
        programCache.fileVersions.set(fileName, currentContent);
        const rootFileNames = programCache.program.getRootFileNames();

        // Make sure the current file is included
        if (!rootFileNames.includes(fileName)) {
          rootFileNames.push(fileName);
        }

        // Create a new program that reuses the old one
        programCache.program = ts.createProgram(
          rootFileNames,
          compilerOptions,
          undefined,
          programCache.program, // Reuse the old program
        );
      }
    }

    // Get diagnostics only for the specific file
    const sourceFile = programCache.program.getSourceFile(fileName);

    // Only get diagnostics for this specific file
    const diagnostics = sourceFile
      ? ts.getPreEmitDiagnostics(programCache.program, sourceFile)
      : [];

    // const semanticDiagnostics =
    //   programCache.program.getSemanticDiagnostics(sourceFile);
    // console.log('diagnostics', diagnostics);
    // console.log('semanticDiagnostics', semanticDiagnostics);

    return Array.from(diagnostics);
  } catch (error) {
    // Reset cache on error
    programCache = null;
    return [];
  }
}

// Add a function to clear the cache when needed
function clearTypeCheckCache() {
  programCache = null;
}

export default function tsErrorOverlayPlugin(): Plugin {
  let compilerOptions: any;

  return {
    name: 'vite-ts-error-overlay',
    // Higher priority than Vite's error overlay plugin
    enforce: 'pre',
    // Transform the index.html to inject our error handling script
    transformIndexHtml(html) {
      // Only inject the script in development mode
      if (process.env.NODE_ENV !== 'production') {
        // Get all current errors to inject
        const allErrors = Array.from(errorsByFile.entries()).map(([file, diagnostics]) => {
          return {
            file,
            errors: diagnostics.map(formatDiagnostic)
          };
        });
        
        // Add a script tag before the closing body tag to initialize our error handler
        return html.replace(
          '</body>',
          `<script type="module">
            // Initialize TypeScript error overlay
            console.log('[TS Error Overlay] Initialized');
            
            // Import the error overlay module to display any existing errors
            import('/@fs${path
              .resolve(process.cwd(), 'client/src/ts-error-overlay.ts')
              .replace(/\\/g, '/')}')
              .then(module => {
                if (module && typeof module.showTypeScriptError === 'function') {
                  // Check if there are any pending errors to display
                  const errors = ${JSON.stringify(allErrors)};
                  if (errors && errors.length > 0) {
                    // Display the first error
                    const firstError = errors[0];
                    const errorMessage = \`TypeScript Error in \${firstError.file}:\\n\${firstError.errors.join('\\n')}\`;
                    module.showTypeScriptError(errorMessage);
                    console.error('[TS Error]', errorMessage);
                  }
                }
              })
              .catch(err => console.error('Failed to import error overlay:', err));
          </script>
          </body>`
        );
      }
      return html;
    },

    // Configure server to handle TypeScript errors
    configureServer(server) {
      // Create a custom middleware to check for TypeScript errors on initial page load
      server.middlewares.use((req, res, next) => {
        if (
          (!req.url.endsWith('.ts') && !req.url.endsWith('.tsx')) ||
          req.url.includes('node_modules')
        ) {
          next();
          return;
        }

        console.log('Checking TypeScript file:', req.url);
        
        // Type check the file
        // Convert relative URL to absolute file path
        const absolutePath = path.resolve(
          process.cwd(),
          'client',
          req.url.startsWith('/') ? req.url.slice(1) : req.url,
        );
        
        // Get a consistent relative path for error tracking
        const relativePath = path.relative(process.cwd(), absolutePath);
        
        const diagnostics = typeCheckFile(absolutePath, compilerOptions);

        if (diagnostics.length > 0) {
          // Store the diagnostics for this file using the relative path
          errorsByFile.set(relativePath, diagnostics);

          // Format the diagnostics for display
          const formattedErrors = diagnostics
            .map(formatDiagnostic)
            .join('\n\n');

          console.log('TypeScript errors found:', formattedErrors);

          // Send the error to the client using a custom event that our overlay will listen for
          setTimeout(() => {
            server.ws.send({
              type: 'custom',
              event: 'vite:error',
              data: {
                err: {
                  message: formattedErrors,
                  stack: '',
                },
                plugin: 'vite-ts-error-overlay',
                id: relativePath,
              },
            });
          }, 1000);
        }

        next();
      });
    },

    configResolved(config) {
      // Get the TypeScript configuration
      try {
        const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
        const tsconfigFile = fs.readFileSync(tsconfigPath, 'utf-8');
        const tsconfig = JSON.parse(tsconfigFile);
        compilerOptions = ts.convertCompilerOptionsFromJson(
          tsconfig.compilerOptions || {},
          process.cwd(),
        ).options;
      } catch (error) {
        console.error('Error reading tsconfig.json:', error);
        compilerOptions = {};
      }

      // Clear the cache when config is resolved
      clearTypeCheckCache();

      // Clear error tracking when config is resolved
      errorsByFile.clear();
    },

    // Handle errors during development
    handleHotUpdate({ file, server, modules }) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
        return;
      }

      // Get the relative path for error tracking
      const relativePath = path.relative(process.cwd(), file);
      console.log('Type checking file:', relativePath);
      
      // Type check the file
      const diagnostics = typeCheckFile(file, compilerOptions);

      // Check if this file previously had errors
      const hadErrors = errorsByFile.has(relativePath);

      if (diagnostics.length > 0) {
        // Store the diagnostics for this file
        errorsByFile.set(relativePath, diagnostics);

        // Format the diagnostics for display
        const formattedErrors = diagnostics.map(formatDiagnostic).join('\n\n');
        console.log('TypeScript errors found:', formattedErrors);

        // Send the error to the client using a custom event that our overlay will listen for
        server.ws.send({
          type: 'custom',
          event: 'vite:error',
          data: {
            err: {
              message: formattedErrors,
              stack: '',
            },
            plugin: 'vite-ts-error-overlay',
            id: relativePath,
          },
        });

        // Allow HMR to proceed
      } else if (hadErrors) {
        // File had errors before but now it's fixed
        // Remove this file from error tracking
        errorsByFile.delete(relativePath);
        console.log('TypeScript errors resolved in:', relativePath);

        // Send resolution message to client
        server.ws.send({
          type: 'custom',
          event: 'vite:error:resolved',
          data: {
            plugin: 'vite-ts-error-overlay',
          },
        });
      }
    },

    // Transform hook to check imported files
    transform(code, id, options) {
      // Only process TypeScript files
      if ((!id.endsWith('.ts') && !id.endsWith('.tsx')) || options?.ssr) {
        return null;
      }

      // Get a consistent relative path for error tracking
      const relativePath = path.relative(process.cwd(), id);
      
      // Check for type errors
      const diagnostics = typeCheckFile(id, compilerOptions);
      
      if (diagnostics.length > 0) {
        // Store the diagnostics for consistent error tracking
        errorsByFile.set(relativePath, diagnostics);
        
        // Format errors and inject code to show the error overlay
        const formattedErrors = diagnostics.map(formatDiagnostic).join('\n\n');
        console.log('TypeScript errors found during transform:', relativePath);

        // Instead of throwing an error, import and use our custom error overlay
        const errorCode = `
          // Log the error to console but don't throw
          console.error(${JSON.stringify(formattedErrors)});
          
          // Import the showTypeScriptError function and display the error without blocking rendering
          import('/@fs${path
            .resolve(process.cwd(), 'client/src/ts-error-overlay.ts')
            .replace(/\\/g, '/')}')
            .then(module => {
              if (module && typeof module.showTypeScriptError === 'function') {
                module.showTypeScriptError(${JSON.stringify(formattedErrors)});
              }
            })
            .catch(err => console.error('Failed to import error overlay:', err));
        `;

        return {
          code: errorCode + '\n' + code,
          map: null,
        };
      } else if (errorsByFile.has(relativePath)) {
        // File had errors before but now it's fixed
        errorsByFile.delete(relativePath);
      }

      return null;
    },
  };
}
