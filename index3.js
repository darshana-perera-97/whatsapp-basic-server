const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 3056;

app.use(express.json());

// Initialize WhatsApp client with session persistence
const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('QR code received, scan it with WhatsApp mobile app.');
});

client.on('ready', () => {
  console.log('WhatsApp Client is ready!');
});

client.on('authenticated', () => {
  console.log('WhatsApp Client authenticated!');
});

client.on('auth_failure', msg => {
  console.error('Authentication failure', msg);
});

client.initialize();

// Root endpoint
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see the API response`);
});

module.exports = app;
