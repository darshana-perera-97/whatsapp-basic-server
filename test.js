const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3056;

// CORS configuration - Allow all origins for development
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
  credentials: false,
  maxAge: 86400 // 24 hours
};

// Middleware - Add CORS headers manually as well
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors(corsOptions)); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Handle preflight OPTIONS requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
  res.sendStatus(200);
});

// Contact form endpoint
app.post('/dm-tors/contactform', (req, res) => {
  // Log request details for debugging
  console.log('\n📥 Incoming POST request to /dm-tors/contactform');
  console.log('Origin:', req.headers.origin || 'Not specified');
  console.log('User-Agent:', req.headers['user-agent'] || 'Not specified');
  
  const contactData = req.body;

  // Console print the contact form data
  console.log('\n========== CONTACT FORM SUBMISSION ==========');
  console.log('Timestamp:', contactData.timestamp || new Date().toISOString());
  console.log('Name:', contactData.name || 'Not provided');
  console.log('Email:', contactData.email || 'Not provided');
  console.log('Phone:', contactData.phone || 'Not provided');
  console.log('Country:', contactData.country || 'Not provided');
  console.log('Subject:', contactData.subject || 'Not provided');
  console.log('Message:', contactData.message || 'Not provided');
  console.log('Travel Start:', contactData.travel_start || 'Not specified');
  console.log('Travel End:', contactData.travel_end || 'Not specified');
  console.log('Number of Travelers:', contactData.travelers || 'Not specified');
  console.log('Newsletter Subscription:', contactData.newsletter || 'No');
  console.log('Status:', contactData.status || 'new');
  console.log('IP Address:', contactData.ip_address || req.ip || 'Unknown');
  console.log('User Agent:', contactData.user_agent || req.headers['user-agent'] || 'Unknown');
  if (contactData.recaptcha_token) {
    console.log('reCAPTCHA Token:', contactData.recaptcha_token.substring(0, 20) + '...');
  }
  console.log('\nFull Data Object:');
  console.log(JSON.stringify(contactData, null, 2));
  console.log('===========================================\n');

  // Set explicit CORS headers in response
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  
  // Send success response
  res.status(200).json({
    success: true,
    message: 'Contact form submitted successfully',
    data: contactData
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'DM Tours Backend API',
    endpoints: {
      contactForm: 'POST /dm-tors/contactform',
      health: 'GET /health'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 DM Tours Backend Server is running on port ${PORT}`);
  console.log(`📍 Contact form endpoint: http://localhost:${PORT}/dm-tors/contactform`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
});

