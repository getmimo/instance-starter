#!/usr/bin/env node

interface ScriptOptions {
  name: string;
  description: string;
  run: () => Promise<void> | void;
}

const scripts: Record<string, ScriptOptions> = {
  build: {
    name: 'build',
    description: 'Build the application',
    run: async () => {
      console.log('Building the application...');
      // Build logic here
    }
  },
  start: {
    name: 'start',
    description: 'Start the application',
    run: () => {
      console.log('Starting the application...');
      // Start logic here
    }
  },
  test: {
    name: 'test',
    description: 'Run tests',
    run: async () => {
      console.log('Running tests...');
      // Test logic here
    }
  }
};

const scriptName = process.argv[2];

if (!scriptName) {
  console.log('Available scripts:');
  Object.values(scripts).forEach(script => {
    console.log(`  ${script.name}: ${script.description}`);
  });
  process.exit(0);
}

const script = scripts[scriptName];

if (!script) {
  console.error(`Unknown script: ${scriptName}`);
  process.exit(1);
}

try {
  const result = script.run();
  if (result instanceof Promise) {
    result.catch(error => {
      console.error(`Error running script ${scriptName}:`, error);
      process.exit(1);
    });
  }
} catch (error) {
  console.error(`Error running script ${scriptName}:`, error);
  process.exit(1);
} 