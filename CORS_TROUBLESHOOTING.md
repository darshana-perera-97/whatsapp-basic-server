# CORS Error Troubleshooting Guide

## Understanding the Error

The CORS (Cross-Origin Resource Sharing) error occurs when:
1. **Origin 'null'**: Your HTML file is being opened directly from the file system (`file://` protocol) instead of being served from a web server
2. **Preflight Request Failed**: The browser sends an OPTIONS request first, and the server must respond with proper CORS headers

## Solutions

### Solution 1: Serve the HTML File from a Web Server (Recommended)

Instead of opening the HTML file directly, serve it from a web server:

#### Option A: Use a Simple HTTP Server (Python)
```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000/lead-form.html
```

#### Option B: Use Node.js http-server
```bash
# Install globally
npm install -g http-server

# Run in the project directory
http-server -p 8000

# Then open: http://localhost:8000/lead-form.html
```

#### Option C: Use VS Code Live Server Extension
1. Install "Live Server" extension in VS Code
2. Right-click on `lead-form.html`
3. Select "Open with Live Server"

### Solution 2: Update API URL for Testing

If testing locally, make sure the API URL matches your server:

```javascript
// In lead-form.html, line ~203
const API_URL = 'http://localhost:3057/dm-tors/lead'; // For local testing
```

### Solution 3: Verify Server is Running

Make sure your Node.js server is running:
```bash
node contactForms.js
```

You should see:
```
🚀 DM Tours Backend Server is running on port 3057
📍 Contact form endpoint: http://localhost:3057/dm-tors/contactform
🎯 Lead collection endpoint: http://localhost:3057/dm-tors/lead
```

### Solution 4: Check Server CORS Configuration

The server has been updated to handle:
- ✅ Null origin (file:// protocol)
- ✅ All origins
- ✅ Preflight OPTIONS requests

## Testing the Fix

1. **Start your server:**
   ```bash
   node contactForms.js
   ```

2. **Serve the HTML file** (choose one method):
   - Use a local web server (see Solution 1)
   - Or deploy both files to the same domain

3. **Test the form:**
   - Fill in Name and Email (required)
   - Click Submit
   - Check browser console for any errors

## Common Issues

### Issue: "Failed to fetch"
- **Cause**: Server is not running or URL is incorrect
- **Fix**: Verify server is running on port 3057 and API_URL is correct

### Issue: "CORS policy blocked"
- **Cause**: HTML file opened from file:// or different origin
- **Fix**: Serve HTML from a web server (see Solution 1)

### Issue: "Network error"
- **Cause**: Server not accessible or firewall blocking
- **Fix**: Check server logs, verify port 3057 is accessible

## Production Deployment

For production, make sure:
1. Both frontend and backend are on the same domain, OR
2. Backend CORS is configured to allow your frontend domain
3. Update API_URL in HTML to point to production server:
   ```javascript
   const API_URL = 'https://www.api.dmtours.lk/dm-tors/lead';
   ```

