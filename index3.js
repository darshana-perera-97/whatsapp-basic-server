require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 3056;

// reCAPTCHA secret key from environment variables
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

if (!RECAPTCHA_SECRET_KEY) {
  console.warn('⚠️  WARNING: RECAPTCHA_SECRET_KEY is not set in environment variables');
}

// CORS configuration - Allow all origins
console.log('🔧 CORS Configuration: Allowing all origins');

const corsOptions = {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Additional CORS headers middleware - allow all origins
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Set the origin header to the requesting origin (required when credentials: true)
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

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
      lead: 'POST /dm-tors/lead',
      health: 'GET /health'
    }
  });
});

// WhatsApp status endpoint
app.get('/whatsapp-status', (req, res) => {
  res.json({
    status: 'OK',
    whatsappReady: !!client.info,
    whatsappInfo: client.info,
    timestamp: new Date().toISOString()
  });
});

// /test endpoint to send WhatsApp message
app.get('/test', async (req, res) => {
  try {
    const number = '94771461925'; // WhatsApp phone number without +
    const chatId = number + '@c.us';
    const message = 'Hello! This is a test message from the server.';

    await client.sendMessage(chatId, message);
    res.json({ status: 'success', message: 'WhatsApp message sent!' });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Helper function to format phone number for Sri Lankan numbers
function formatSriLankanNumber(contactNumber) {
  // Remove any spaces, dashes, or other characters including +
  let cleanNumber = contactNumber.replace(/[\s\-\(\)\+]/g, '');

  // If number starts with 0, replace with 94
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '94' + cleanNumber.substring(1);
  }
  // If number doesn't start with 94, add it
  else if (!cleanNumber.startsWith('94')) {
    cleanNumber = '94' + cleanNumber;
  }

  return cleanNumber;
}

// Helper function to format order message
function formatOrderMessage(orderData) {
  const { shopName, items, totalPrice, orderId } = orderData;

  let message = `*${shopName}*\n\n`;
  message += `📋 *Order Details*\n`;
  message += `Order ID: ${orderId}\n\n`;

  message += `🛒 *Items Ordered:*\n`;
  message += `┌─────────────────────────────────┐\n`;

  items.forEach((item, index) => {
    const itemNumber = String(index + 1).padStart(2, '0');
    const itemName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
    const quantity = `x${item.quantity}`;
    const price = `Rs.${item.price}`;

    message += `│ Item-${itemNumber} │ ${itemName.padEnd(18)} │ ${quantity.padEnd(3)} │ ${price.padEnd(8)} │\n`;
  });

  message += `└─────────────────────────────────┘\n\n`;
  message += `💰 *Total Amount: Rs.${totalPrice}*\n\n`;
  message += `Thank you for your order! 🙏 Will inform you through whatsapp when order is ready.`;

  return message;
}

// Juice Bar API endpoints
app.post('/juiceBar/placeOrder', async (req, res) => {
  try {
    const orderData = req.body;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Juice Bar Place Order:`, JSON.stringify(orderData, null, 2));

    // Send WhatsApp message if contact number is provided
    if (orderData.contactNumber) {
      try {
        const formattedNumber = formatSriLankanNumber(orderData.contactNumber);
        const chatId = formattedNumber + '@c.us';
        const message = formatOrderMessage(orderData);

        console.log(`Attempting to send WhatsApp message to: ${formattedNumber}`);
        console.log(`Chat ID: ${chatId}`);
        console.log(`Message content: ${message}`);
        console.log(`Client ready state: ${client.info ? 'Ready' : 'Not ready'}`);

        await client.sendMessage(chatId, message);
        console.log(`✅ WhatsApp message sent successfully to ${formattedNumber}`);
      } catch (whatsappError) {
        console.error('❌ Error sending WhatsApp message:', whatsappError);
        console.error('Error details:', whatsappError.message);
        // Don't fail the order if WhatsApp fails
      }
    }

    res.json({
      status: 'success',
      message: 'Order placed successfully',
      timestamp: timestamp,
      order: orderData || 'N/A'
    });
  } catch (error) {
    console.error('Error processing place order:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/juiceBar/orderComplete', async (req, res) => {
  try {
    const orderData = req.body;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Juice Bar Order Complete:`, JSON.stringify(orderData, null, 2));

    // Send WhatsApp message if contact number is provided
    if (orderData.contactNumber) {
      try {
        const formattedNumber = formatSriLankanNumber(orderData.contactNumber);
        const chatId = formattedNumber + '@c.us';

        // Format date and time
        const orderDate = new Date(orderData.orderDate || timestamp);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const formattedTime = orderDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        // Create completion message based on requirements
        let completionMessage = `Order from *${orderData.shopName}* on ${formattedDate} is ready now.\n\n`;
        completionMessage += `Come to shop and collect the order.\n\n`;

        // Add payment status message
        if (orderData.paymentStatus === 'unpaid') {
          completionMessage += `💰 Please pay the bill Rs.${orderData.paymentAmount} when collecting your order.`;
        } else {
          completionMessage += `✅ Payment has been completed.`;
        }

        await client.sendMessage(chatId, completionMessage);
        console.log(`WhatsApp completion message sent to ${formattedNumber}`);
      } catch (whatsappError) {
        console.error('Error sending WhatsApp completion message:', whatsappError);
        // Don't fail the order completion if WhatsApp fails
      }
    }

    res.json({
      status: 'success',
      message: 'Order completion recorded successfully',
      timestamp: timestamp,
      order: orderData || 'N/A'
    });
  } catch (error) {
    console.error('Error processing order completion:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Dedicated endpoint to send WhatsApp message
app.post('/sendWhatsAppMessage', async (req, res) => {
  try {
    const { contactNumber, message, shopName } = req.body;

    if (!contactNumber || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'contactNumber and message are required'
      });
    }

    const formattedNumber = formatSriLankanNumber(contactNumber);
    const chatId = formattedNumber + '@c.us';

    // Format message with shop name if provided
    let formattedMessage = message;
    if (shopName) {
      formattedMessage = `*${shopName}*\n\n${message}`;
    }

    await client.sendMessage(chatId, formattedMessage);

    res.json({
      status: 'success',
      message: 'WhatsApp message sent successfully',
      sentTo: formattedNumber
    });

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

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
  const recipientNumbers = ['94771461925','94778808689']; // WhatsApp numbers without +
  const whatsappMessage = formatContactFormMessage(contactData);

  // Send message to all recipients
  for (const recipientNumber of recipientNumbers) {
    try {
      const chatId = recipientNumber + '@c.us';

      console.log(`Attempting to send WhatsApp message to: ${recipientNumber}`);
      console.log(`Chat ID: ${chatId}`);
      console.log(`Client ready state: ${client.info ? 'Ready' : 'Not ready'}`);

      await client.sendMessage(chatId, whatsappMessage);
      console.log(`✅ WhatsApp message sent successfully to ${recipientNumber}`);
    } catch (whatsappError) {
      console.error(`❌ Error sending WhatsApp message to ${recipientNumber}:`, whatsappError);
      console.error('Error details:', whatsappError.message);
      // Don't fail the request if WhatsApp fails
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
  console.log(`🎯 Lead collection endpoint: http://localhost:${PORT}/dm-tors/lead`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
