import React from 'react';

function App() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/hello')
      .then(response => response.json())
      .then(data => setData(data))
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-red-500">
          No-Code Project Creator 1
        </h1>
        {data && <p>{data.message}</p>}
      </div>
    </div>
  );
}

export default App; 