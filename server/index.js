import express from 'express';

const app = express();
const PORT = 3001;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

// Export a function to start the server
export async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`API Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
} 