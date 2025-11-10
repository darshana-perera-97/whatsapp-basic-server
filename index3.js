const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 3056;

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

client.on('ready', () => {
  console.log('WhatsApp Client is ready!');
  console.log('Client info:', client.info);
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see the API response`);
});

module.exports = app;
