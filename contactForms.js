require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = 3057;

// reCAPTCHA secret key from environment variables
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

if (!RECAPTCHA_SECRET_KEY) {
  console.warn('⚠️  WARNING: RECAPTCHA_SECRET_KEY is not set in environment variables');
}

// CORS configuration - Allow all origins
console.log('🔧 CORS Configuration: Allowing all origins');

// CORS options - allow all origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    // or allow all origins
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware - must be before express.json()
app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

// Initialize WhatsApp client with session persistence
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('QR code received, scan it with WhatsApp mobile app.');
});

// Track client ready state
let isClientReady = false;

client.on('ready', () => {
  console.log('WhatsApp Client is ready!');
  console.log('Client info:', client.info);
  isClientReady = true;
});

client.on('authenticated', () => {
  console.log('WhatsApp Client authenticated!');
});

client.on('auth_failure', msg => {
  console.error('Authentication failure', msg);
});

client.initialize();

// Helper function to wait for client to be ready
async function waitForClientReady(maxWaitTime = 30000) {
  if (isClientReady && client.info) {
    return true;
  }

  console.log('⏳ Waiting for WhatsApp client to be ready...');
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (isClientReady && client.info) {
        clearInterval(checkInterval);
        console.log('✅ WhatsApp client is now ready!');
        resolve(true);
      } else if (Date.now() - startTime > maxWaitTime) {
        clearInterval(checkInterval);
        console.warn('⚠️  Timeout waiting for WhatsApp client to be ready');
        resolve(false);
      }
    }, 500); // Check every 500ms
  });
}

// Helper function to format contact form message
function formatContactFormMessage(formData) {
  const { timestamp, name, email, phone, country, subject, message, travel_start, travel_end, travelers, newsletter, status, ip_address, user_agent } = formData;

  // Format date from timestamp
  let formattedDate = timestamp || new Date().toISOString();
  if (timestamp) {
    try {
      const date = new Date(timestamp);
      formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      formattedDate = timestamp;
    }
  }

  let whatsappMessage = `*📋 New Tour Inquiry*\n\n`;
  whatsappMessage += `📅 *Date:* ${formattedDate}\n`;
  whatsappMessage += `👤 *Name:* ${name || 'Not provided'}\n`;
  whatsappMessage += `📧 *Email:* ${email || 'Not provided'}\n`;
  whatsappMessage += `📱 *Phone:* ${phone || 'Not provided'}\n`;
  whatsappMessage += `🌍 *Country:* ${country || 'Not provided'}\n`;
  whatsappMessage += `📌 *Subject:* ${subject || 'Not provided'}\n`;
  if (message) {
    whatsappMessage += `💬 *Message:* ${message}\n`;
  }
  whatsappMessage += `✈️ *Travel Start:* ${travel_start || 'Not specified'}\n`;
  whatsappMessage += `✈️ *Travel End:* ${travel_end || 'Not specified'}\n`;
  whatsappMessage += `👥 *Number of Travelers:* ${travelers || 'Not specified'}\n`;
  whatsappMessage += `📰 *Newsletter Subscription:* ${newsletter || 'No'}\n`;
  whatsappMessage += `📊 *Status:* ${status || 'new'}\n`;
  if (ip_address) {
    whatsappMessage += `🌐 *IP Address:* ${ip_address}\n`;
  }
  if (user_agent) {
    whatsappMessage += `🖥️ *User Agent:* ${user_agent}\n`;
  }

  return whatsappMessage;
}

// Helper function to format lead message for WhatsApp
function formatLeadMessage(leadData) {
  const { timestamp, name, email, phone, message, source, interest, ip_address, user_agent } = leadData;

  // Format date from timestamp
  let formattedDate = timestamp || new Date().toISOString();
  if (timestamp) {
    try {
      const date = new Date(timestamp);
      formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      formattedDate = timestamp;
    }
  }

  let whatsappMessage = `*🎯 New Lead from Landing Page*\n\n`;
  whatsappMessage += `📅 *Date:* ${formattedDate}\n`;
  whatsappMessage += `👤 *Name:* ${name || 'Not provided'}\n`;
  whatsappMessage += `📧 *Email:* ${email || 'Not provided'}\n`;
  whatsappMessage += `📱 *Phone:* ${phone || 'Not provided'}\n`;
  if (source) {
    whatsappMessage += `🔗 *Source:* ${source}\n`;
  }
  if (interest) {
    whatsappMessage += `💡 *Interest:* ${interest}\n`;
  }
  if (message) {
    whatsappMessage += `💬 *Message:* ${message}\n`;
  }
  if (ip_address) {
    whatsappMessage += `🌐 *IP Address:* ${ip_address}\n`;
  }
  if (user_agent) {
    whatsappMessage += `🖥️ *User Agent:* ${user_agent}\n`;
  }

  return whatsappMessage;
}

app.get('/', (req, res) => {
  res.send('DM Tours API is running 🚀');
});


// Contact form endpoint
app.post('/dm-tors/contactform', async (req, res) => {
  const contactData = req.body;

  // Console print the contact form data
  console.log('\n========== CONTACT FORM SUBMISSION ==========');
  console.log('Name:', contactData.name || 'Not provided');
  console.log('Email:', contactData.email || 'Not provided');
  console.log('Phone:', contactData.phone || 'Not provided');
  console.log('Country:', contactData.country || 'Not provided');
  console.log('Subject:', contactData.subject || 'Not provided');
  console.log('Message:', contactData.message || 'Not provided');
  console.log('Travel Start:', contactData.travel_start || 'Not specified');
  console.log('Travel End:', contactData.travel_end || 'Not specified');
  console.log('Number of Travelers:', contactData.travelers || 'Not specified');

  if (contactData.recaptcha_token) {
    console.log('reCAPTCHA Token:', contactData.recaptcha_token.substring(0, 20) + '...');
  }
  console.log('\nFull Data Object:');
  console.log(JSON.stringify(contactData, null, 2));
  console.log('===========================================\n');

  // Send WhatsApp message
  const recipientNumbers = ['94771461925', '94778808689']; // WhatsApp numbers without +
  const whatsappMessage = formatContactFormMessage(contactData);

  // Wait for client to be ready before sending messages
  const clientReady = await waitForClientReady(30000); // Wait up to 30 seconds

  if (!clientReady) {
    console.warn('⚠️  WhatsApp client is not ready. Messages will not be sent.');
    console.warn('⚠️  Please ensure WhatsApp is authenticated and ready before submitting forms.');
  } else {
    // Send message to all recipients
    for (const recipientNumber of recipientNumbers) {
      try {
        const chatId = recipientNumber + '@c.us';

        console.log(`Attempting to send WhatsApp message to: ${recipientNumber}`);
        console.log(`Chat ID: ${chatId}`);

        await client.sendMessage(chatId, whatsappMessage);
        console.log(`✅ WhatsApp message sent successfully to ${recipientNumber}`);
      } catch (whatsappError) {
        console.error(`❌ Error sending WhatsApp message to ${recipientNumber}:`, whatsappError);
        console.error('Error details:', whatsappError.message);
        // Don't fail the request if WhatsApp fails
      }
    }
  }

  // Send success response
  res.status(200).json({
    success: true,
    message: 'Contact form submitted successfully',
    data: contactData
  });
});

// Lead collection endpoint for landing pages
app.post('/dm-tors/lead', async (req, res) => {
  try {
    const leadData = req.body;

    // Validate required fields
    if (!leadData.name || !leadData.email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required fields',
        error: 'Missing required fields'
      });
    }

    // Console print the lead data
    console.log('\n========== LEAD SUBMISSION ==========');
    console.log('Name:', leadData.name);
    console.log('Email:', leadData.email);
    console.log('Phone:', leadData.phone || 'Not provided');
    console.log('Source:', leadData.source || 'Not specified');
    console.log('Interest:', leadData.interest || 'Not specified');
    console.log('Message:', leadData.message || 'Not provided');

    if (leadData.recaptcha_token) {
      console.log('reCAPTCHA Token:', leadData.recaptcha_token.substring(0, 20) + '...');
    }
    console.log('\nFull Data Object:');
    console.log(JSON.stringify(leadData, null, 2));
    console.log('===========================================\n');

    // Send WhatsApp message
    const recipientNumbers = ['94771461925', '94778808689']; // WhatsApp numbers without +
    const whatsappMessage = formatLeadMessage(leadData);

    // Wait for client to be ready before sending messages
    const clientReady = await waitForClientReady(30000); // Wait up to 30 seconds

    if (!clientReady) {
      console.warn('⚠️  WhatsApp client is not ready. Messages will not be sent.');
      console.warn('⚠️  Please ensure WhatsApp is authenticated and ready before submitting leads.');
    } else {
      // Send message to all recipients
      for (const recipientNumber of recipientNumbers) {
        try {
          const chatId = recipientNumber + '@c.us';

          console.log(`Attempting to send WhatsApp message to: ${recipientNumber}`);
          console.log(`Chat ID: ${chatId}`);

          await client.sendMessage(chatId, whatsappMessage);
          console.log(`✅ WhatsApp message sent successfully to ${recipientNumber}`);
        } catch (whatsappError) {
          console.error(`❌ Error sending WhatsApp message to ${recipientNumber}:`, whatsappError);
          console.error('Error details:', whatsappError.message);
          // Don't fail the request if WhatsApp fails
        }
      }
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Lead submitted successfully',
      data: {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone || null,
        source: leadData.source || null,
        interest: leadData.interest || null,
        submittedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing lead submission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 DM Tours Backend Server is running on port ${PORT}`);
  console.log(`📍 Contact form endpoint: http://localhost:${PORT}/dm-tors/contactform`);
  console.log(`🎯 Lead collection endpoint: http://localhost:${PORT}/dm-tors/lead\n`);
});

module.exports = app;
