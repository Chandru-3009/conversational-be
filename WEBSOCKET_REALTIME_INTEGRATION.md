# WebSocket Realtime Integration

## Overview

This document describes the integration of WebSocket communication for OpenAI Realtime API features, replacing the previous fetch-based approach with a more efficient WebSocket-based solution.

## Changes Made

### 1. Backend Changes

#### WebSocket Server (`src/websocket/audioStreamingServer.ts`)
- **Added OpenAIRealtimeService integration**: The WebSocket server now accepts an optional `OpenAIRealtimeService` instance in its constructor
- **New message handlers**:
  - `realtime_session_request`: Handles session creation and ephemeral key generation
  - `tts_request`: Handles text-to-speech conversion requests
- **Enhanced session management**: Sessions are now properly managed for realtime features
- **Response types**:
  - `realtime_session_response`: Returns ephemeral key for OpenAI Realtime API
  - `tts_response`: Returns audio data for TTS requests
  - `error`: Returns error messages
  - `status`: Returns status messages

#### Server (`src/server.ts`)
- **Updated WebSocket server initialization**: Now passes the `OpenAIRealtimeService` instance to the WebSocket server
- **Maintained backward compatibility**: HTTP endpoints are still available for non-WebSocket clients

### 2. Frontend Changes

#### Realtime Client (`public/realtime.html`)
- **Replaced fetch calls with WebSocket**: All communication now goes through WebSocket
- **Added WebSocket connection management**: Proper connection handling with error recovery
- **New message handling**: Added `handleWebSocketMessage()` method to process server responses
- **Enhanced connection flow**:
  1. Connect to WebSocket server
  2. Send `realtime_session_request` to get ephemeral key
  3. Use ephemeral key for OpenAI Realtime API calls
  4. Send `tts_request` for text-to-speech conversion

## Message Flow

### Session Creation Flow
```
Frontend → WebSocket → Backend
1. Connect to WebSocket server
2. Send realtime_session_request
3. Backend creates session and generates ephemeral key
4. Backend sends realtime_session_response with ephemeral key
5. Frontend stores ephemeral key for OpenAI Realtime API
```

### TTS Flow
```
Frontend → WebSocket → Backend
1. Send tts_request with text
2. Backend converts text to speech
3. Backend sends tts_response with audio data
4. Frontend plays audio
```

## Benefits

1. **Reduced Latency**: WebSocket provides persistent connection, reducing connection overhead
2. **Better Error Handling**: Real-time error feedback through WebSocket
3. **Consistent Architecture**: All communication goes through the same WebSocket connection
4. **Improved Performance**: No need to establish new HTTP connections for each request
5. **Better User Experience**: Faster response times and more responsive interface

## Configuration

### Environment Variables
- `WS_PORT`: WebSocket server port (default: 3001)
- `OPENAI_REALTIME_ENABLED`: Enable OpenAI Realtime API (default: false)
- `OPENAI_API_KEY`: OpenAI API key (required if realtime enabled)

### Port Configuration
- HTTP Server: Port 3000 (configurable via `PORT`)
- WebSocket Server: Port 3001 (configurable via `WS_PORT`)

## Testing

A test script is provided at `scripts/test-websocket-realtime.js` to verify the integration:

```bash
node scripts/test-websocket-realtime.js
```

This script tests:
1. WebSocket connection establishment
2. Session creation and ephemeral key generation
3. TTS request and response handling
4. Error handling

## Migration Guide

### For Existing Users
- No changes required for existing functionality
- HTTP endpoints remain available for backward compatibility
- New realtime features use WebSocket by default

### For New Implementations
- Use WebSocket connection for realtime features
- Follow the message flow described above
- Handle WebSocket connection states properly

## Error Handling

The WebSocket integration includes comprehensive error handling:

1. **Connection Errors**: Automatic reconnection attempts
2. **Message Errors**: Proper error responses with descriptive messages
3. **Service Errors**: Graceful degradation when services are unavailable
4. **Timeout Handling**: Automatic cleanup of stale connections

## Security Considerations

1. **Session Validation**: All requests are validated against session data
2. **User Authentication**: Email-based user identification and validation
3. **Rate Limiting**: Built-in protection against excessive requests
4. **Input Validation**: All incoming messages are validated before processing

## Performance Optimizations

1. **Connection Reuse**: Single WebSocket connection for all operations
2. **Message Batching**: Efficient message handling
3. **Memory Management**: Automatic cleanup of completed sessions
4. **Resource Pooling**: Shared service instances across connections 