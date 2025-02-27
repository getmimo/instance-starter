import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './src/App';

// Import the test file to trigger TypeScript errors
import './src/test-error';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 