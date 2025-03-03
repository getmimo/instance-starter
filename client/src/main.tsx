import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import './index.css';
// Import the TypeScript error overlay
import './ts-error-overlay';
// We'll load the error file through a dynamic loader to prevent blocking rendering

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
