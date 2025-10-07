const express = require('express');
const app = express();
const PORT = process.env.PORT || 3056;

// Middleware to parse JSON bodies
app.use(express.json());

// Root API endpoint that returns text
app.get('/', (req, res) => {
  res.send('Hello! This is a basic Node.js server running successfully.');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see the API response`);
});

module.exports = app;
