# Troubleshooting OpenAI Realtime API

This guide helps you resolve common issues with the OpenAI Realtime API implementation.

## 🔍 Common Issues and Solutions

### 1. "Failed to generate ephemeral key: 404 Not Found"

**Cause**: The OpenAI Realtime API endpoint is not available or the API key doesn't have access.

**Solutions**:

#### Option A: Check API Key Access
1. Verify your OpenAI API key has access to the Realtime API
2. Check if you're on the correct OpenAI plan (Realtime API might require a specific tier)
3. Visit [OpenAI Platform](https://platform.openai.com/api-keys) to verify your key
4. The correct endpoint is `https://api.openai.com/v1/realtime/sessions` (not `/ephemeral_keys`)

#### Option B: Enable Mock Mode for Testing
If you don't have Realtime API access, you can test with mock mode:

```bash
# In your .env file, either:
# Option 1: Don't set OPENAI_API_KEY (will use mock mode)
# Option 2: Set a dummy key
OPENAI_API_KEY=mock_key_for_testing
OPENAI_REALTIME_ENABLED=true
```

#### Option C: Use Standard WebSocket Mode
If Realtime API is not available, use the standard implementation:

```bash
# In your .env file
OPENAI_REALTIME_ENABLED=false
# Use the standard interface at http://localhost:3000
```

### 2. "OpenAI API key is invalid or expired"

**Cause**: Invalid or expired API key.

**Solutions**:
1. Generate a new API key at [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update your `.env` file with the new key
3. Restart the server

### 3. "OpenAI API key does not have access to Realtime API"

**Cause**: Your API key doesn't have the required permissions.

**Solutions**:
1. Check your OpenAI account plan
2. Contact OpenAI support to request Realtime API access
3. Use mock mode for testing (see Option B above)

### 4. "Rate limit exceeded"

**Cause**: Too many API requests in a short time.

**Solutions**:
1. Wait a few minutes before trying again
2. Check your OpenAI usage limits
3. Implement rate limiting in your application

## 🧪 Testing the Implementation

### Step 1: Test Server Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Step 2: Test Ephemeral Key Generation
```bash
curl -X POST http://localhost:3000/api/realtime/session \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session_123",
    "userId": "test_user_123", 
    "userEmail": "test@example.com"
  }'
```

Expected response (with real API):
```json
{
  "client_secret": {
    "value": "sk-...",
    "expires_at": 1704067200
  }
}
```

Expected response (with mock mode):
```json
{
  "client_secret": {
    "value": "mock_ephemeral_key_1704067200000",
    "expires_at": 1704067200
  }
}
```

### Step 3: Test Text-to-Speech
```bash
curl -X POST http://localhost:3000/api/realtime/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test.",
    "sessionId": "test_session_123"
  }'
```

Expected response:
```json
{
  "audio": "UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT...",
  "duration": 2.5,
  "text": "Hello, this is a test."
}
```

## 🔧 Debug Mode

Enable debug logging by setting the environment variable:

```bash
# In your .env file
NODE_ENV=development
LOG_LEVEL=debug
```

This will show detailed logs including:
- API request/response details
- WebRTC connection states
- Error stack traces

## 📋 Environment Checklist

Make sure your `.env` file has the correct configuration:

```bash
# Required for Realtime API
OPENAI_REALTIME_ENABLED=true
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize Realtime settings
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
OPENAI_REALTIME_BASE_URL=https://api.openai.com/v1/realtime

# Server configuration
PORT=3000
WS_PORT=3001

# Database (required)
MONGODB_URI=mongodb://localhost:27017/nutrina

# TTS Provider (required for audio responses)
TTS_PROVIDER=google
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
# OR
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## 🚀 Alternative Solutions

### If Realtime API is Not Available

1. **Use Standard WebSocket Mode**:
   - Set `OPENAI_REALTIME_ENABLED=false`
   - Use `http://localhost:3000` (standard interface)
   - Works with OpenAI GPT models or Google Gemini

2. **Use Mock Mode for Development**:
   - Don't set `OPENAI_API_KEY` or set a dummy value
   - Realtime service will use mock responses
   - Good for testing the WebRTC flow

3. **Wait for Public Release**:
   - OpenAI Realtime API might be in limited access
   - Monitor [OpenAI Platform](https://platform.openai.com) for updates
   - Join waitlist if available

## 📞 Getting Help

If you're still experiencing issues:

1. Check the server logs for detailed error messages
2. Verify your environment configuration
3. Test with mock mode first
4. Check if the issue is with your specific setup or the API availability

## 🔄 Fallback Strategy

The implementation is designed to gracefully handle Realtime API unavailability:

1. **Server Level**: Falls back to standard WebSocket mode
2. **Client Level**: Shows appropriate error messages
3. **User Experience**: Can still use the standard voice interface

Remember: The standard WebSocket implementation provides the same core functionality with slightly higher latency. 