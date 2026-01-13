# Lead Collection API Documentation

## Endpoint
**POST** `/dm-tors/lead`

## Description
This API endpoint collects leads from landing pages and sends WhatsApp notifications to configured recipients.

## Request

### URL
```
POST http://localhost:3057/dm-tors/lead
```

### Headers
```
Content-Type: application/json
```

### Request Body (JSON)

#### Required Fields:
- `name` (string): Lead's full name
- `email` (string): Lead's email address

#### Optional Fields:
- `phone` (string): Lead's phone number
- `message` (string): Additional message from the lead
- `source` (string): Source of the lead (e.g., "Facebook Ad", "Google Search", "Landing Page")
- `interest` (string): What the lead is interested in
- `timestamp` (string): ISO timestamp (auto-generated if not provided)
- `recaptcha_token` (string): reCAPTCHA token for validation
- `ip_address` (string): IP address of the lead
- `user_agent` (string): User agent string

### Example Request

#### Minimal Request (Required fields only):
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

#### Full Request (All fields):
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+94771234567",
  "message": "I'm interested in your tour packages",
  "source": "Facebook Ad",
  "interest": "Beach Tours",
  "timestamp": "2024-11-12T10:30:00.000Z",
  "recaptcha_token": "03AGdBq27...",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

### cURL Example
```bash
curl -X POST http://localhost:3057/dm-tors/lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+94771234567",
    "message": "I am interested in your tour packages",
    "source": "Landing Page",
    "interest": "Beach Tours"
  }'
```

### JavaScript/Fetch Example
```javascript
fetch('http://localhost:3057/dm-tors/lead', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+94771234567',
    message: 'I am interested in your tour packages',
    source: 'Landing Page',
    interest: 'Beach Tours'
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

## Response

### Success Response (200 OK)

#### Response Body:
```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "data": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+94771234567",
    "source": "Landing Page",
    "interest": "Beach Tours",
    "submittedAt": "2024-11-12T10:30:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Required Fields:
```json
{
  "success": false,
  "message": "Name and email are required fields",
  "error": "Missing required fields"
}
```

#### 500 Internal Server Error:
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error message details"
}
```

## WhatsApp Notification

When a lead is submitted successfully, WhatsApp messages are automatically sent to:
- `94771461925`
- `94778808689`

The WhatsApp message format includes:
- 📋 Lead submission header
- 📅 Date and time
- 👤 Name
- 📧 Email
- 📱 Phone (if provided)
- 🔗 Source (if provided)
- 💡 Interest (if provided)
- 💬 Message (if provided)
- 🌐 IP Address (if provided)
- 🖥️ User Agent (if provided)

## Notes

1. The API will wait up to 30 seconds for the WhatsApp client to be ready before sending notifications
2. If WhatsApp is not ready, the lead will still be saved but no notification will be sent
3. The API returns a success response even if WhatsApp notification fails (to not block the lead submission)
4. All CORS origins are allowed by default
5. The endpoint accepts both minimal and full lead data

