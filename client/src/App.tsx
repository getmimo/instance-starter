import * as React from 'react';
import { Button2 } from '@/components/ui/button';
import { showTypeScriptError } from './ts-error-overlay';
import './ts-error-overlay';

function App() {
  const [data, setData] = React.useState<any>(null);

  const triggerError = () => {
    console.log('Manually triggering TypeScript error');
    showTypeScriptError(
      'This is a manually triggered TypeScript error for testing',
    );
  };


  
  React.useEffect(() => {
    fetch('/api/hello')
      .then((response) => response.json())
      .then((data) => setData(data))
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-red-500">
          No-Code Project Creator 2
        </h1>
        {data && <p>{data.message}</p>}
        <Button2>Click me</Button2>
        {/* <Button variant="outline">Button</Button> */}
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={triggerError}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e83b46',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Test Error Boundary
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
