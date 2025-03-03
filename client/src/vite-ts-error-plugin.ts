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

// Type check a file and return diagnostics
function typeCheckFile(fileName: string, compilerOptions: any): Diagnostic[] {
  try {
    console.log('fileName', fileName);
    console.time('typeCheckFile');

    const startProgram = performance.now();
    const program = ts.createProgram([fileName], compilerOptions);
    console.log(`Creating program took ${performance.now() - startProgram}ms`);

    const startDiagnostics = performance.now();
    const diagnostics = ts.getPreEmitDiagnostics(program);
    console.log(
      `Getting diagnostics took ${performance.now() - startDiagnostics}ms`,
    );

    const startConversion = performance.now();
    const result = Array.from(diagnostics);
    console.log(
      `Converting diagnostics took ${performance.now() - startConversion}ms`,
    );

    console.timeEnd('typeCheckFile');
    return result;
  } catch (error) {
    console.error('Error type checking file:', error);
    return [];
  }
}

export default function tsErrorOverlayPlugin(): Plugin {
  let compilerOptions: any;

  return {
    name: 'vite-ts-error-overlay',

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
    },

    // Handle errors during development
    handleHotUpdate({ file, server, modules }) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
        return;
      }

      // Type check the file
      const diagnostics = typeCheckFile(file, compilerOptions);

      if (diagnostics.length > 0) {
        // Format the diagnostics for display
        const formattedErrors = diagnostics.map(formatDiagnostic).join('\n\n');

        console.log(formattedErrors);

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
            id: file,
          },
        });

        // Also send as a standard error
        server.ws.send({
          type: 'error',
          err: {
            message: formattedErrors,
            stack: '',
            plugin: 'vite-ts-error-overlay',
            id: file,
          },
        });

        // Allow HMR to proceed but mark the update as handled
        return modules;
      }
    },

    // Transform hook to check imported files
    transform(code, id, options) {
      // Only process TypeScript files
      if ((!id.endsWith('.ts') && !id.endsWith('.tsx')) || options?.ssr) {
        return null;
      }

      // Check for type errors
      const diagnostics = typeCheckFile(id, compilerOptions);
      // console.log(diagnostics)
      if (diagnostics.length > 0) {
        // Format errors and inject code to show the error overlay
        const formattedErrors = diagnostics.map(formatDiagnostic).join('\n\n');

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
      }

      return null;
    },
  };
}
