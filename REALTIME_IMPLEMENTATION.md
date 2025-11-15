# OpenAI Realtime API Implementation

This document describes the implementation of OpenAI Realtime API with WebRTC for real-time voice conversations in the Nutrina voice assistant.

## 🎯 Overview

The Realtime implementation provides a direct WebRTC connection between the user's browser and OpenAI's Realtime API, enabling ultra-low latency voice conversations without the need for intermediate server processing.

## 🏗️ Architecture

### Flow Diagram
```
1. User Browser (Web Speech API) → Text
2. Browser → Server (Get Ephemeral Key)
3. Browser → OpenAI Realtime API (WebRTC + Text)
4. OpenAI → Browser (Response Text via WebRTC)
5. Browser → Server (Text-to-Speech)
6. Server → Browser (Audio)
7. Browser → User (Play Audio)
```

### Key Components

1. **Client-Side (`public/realtime.html`)**
   - Web Speech API for speech-to-text
   - WebRTC peer connection to OpenAI
   - Real-time audio streaming
   - Data channel for event handling

2. **Server-Side (`src/services/openaiRealtimeService.ts`)**
   - Ephemeral key generation
   - Session management
   - Text-to-speech conversion

3. **API Endpoints (`src/server.ts`)**
   - `/api/realtime/session` - Generate ephemeral keys
   - `/api/realtime/tts` - Convert text to speech

## 🚀 Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```bash
# OpenAI Realtime API Configuration
OPENAI_REALTIME_ENABLED=true
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
OPENAI_REALTIME_BASE_URL=https://api.openai.com/v1/realtime
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. API Key Requirements

- **OpenAI API Key**: Must have access to the Realtime API
- **Model Access**: Requires access to `gpt-4o-realtime-preview-2025-06-03`

### 3. Start the Server

```bash
npm install
npm start
```

### 4. Access the Realtime Interface

Navigate to: `http://localhost:3000/realtime.html`

## 🔧 Usage

### Step-by-Step Process

1. **Connect**: Enter your email address and click "Connect"
   - Server generates an ephemeral key for your session
   - Session is established with user tracking

2. **Start Call**: Click "Start Call" to initialize WebRTC
   - Browser requests microphone access
   - WebRTC peer connection is established with OpenAI
   - Data channel opens for real-time communication

3. **Speak**: Use your microphone to speak naturally
   - Web Speech API converts speech to text
   - Text is sent via WebRTC data channel to OpenAI
   - OpenAI processes and responds in real-time

4. **Listen**: Receive AI responses
   - OpenAI sends response text via WebRTC
   - Browser requests TTS conversion from server
   - Audio is played back to user

### Interface Features

- **Real-time Status**: WebRTC connection, data channel, and audio stream status
- **Conversation Log**: Complete message history
- **Error Handling**: Comprehensive error messages and recovery
- **Session Management**: Automatic cleanup and reconnection

## 🔍 Technical Details

### WebRTC Configuration

```javascript
// Peer connection setup
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
});

// Audio configuration
const audioStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    sampleRate: 48000,
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    latency: 0.01,
    volume: 1.0
  }
});
```

### Ephemeral Key Management

- **Duration**: 1 hour per session
- **Security**: Server-side generation with user metadata
- **Cleanup**: Automatic expiration and cleanup

### Event Handling

The data channel handles various OpenAI Realtime events:

```javascript
// Event types
- 'text': AI response text
- 'speech_start': AI begins speaking
- 'speech_end': AI finishes speaking
- 'error': Error messages
```

## 📊 Performance Benefits

### Latency Reduction
- **Direct Connection**: No intermediate server processing
- **Real-time Streaming**: Continuous audio streaming
- **WebRTC Optimization**: Optimized for real-time communication

### Resource Efficiency
- **Server Offload**: AI processing handled by OpenAI directly
- **Reduced Bandwidth**: Only TTS requests go through server
- **Scalability**: Server handles only session management and TTS

## 🔒 Security Considerations

### Ephemeral Keys
- **Time-limited**: 1-hour expiration
- **User-scoped**: Tied to specific user sessions
- **Metadata**: Includes session and user information

### Data Privacy
- **Direct Connection**: Voice data goes directly to OpenAI
- **No Storage**: Server doesn't store voice data
- **Session Isolation**: Each session is independent

## 🛠️ Troubleshooting

### Common Issues

1. **WebRTC Connection Failed**
   - Check firewall settings
   - Verify STUN server accessibility
   - Ensure HTTPS in production

2. **Ephemeral Key Generation Failed**
   - Verify OpenAI API key
   - Check API key permissions
   - Ensure Realtime API access

3. **Audio Issues**
   - Check microphone permissions
   - Verify audio device selection
   - Test with different browsers

### Debug Information

Enable browser developer tools to see:
- WebRTC connection state changes
- Data channel messages
- Audio stream status
- Error messages

## 🔄 Migration from WebSocket

### Comparison

| Feature | WebSocket | Realtime |
|---------|-----------|----------|
| Latency | ~500-1000ms | ~100-200ms |
| Server Load | High (STT + AI + TTS) | Low (TTS only) |
| Scalability | Limited by server | High (OpenAI handles AI) |
| Complexity | Server-side processing | Client-side WebRTC |

### Migration Path

1. **Gradual Rollout**: Enable Realtime alongside WebSocket
2. **Feature Parity**: Ensure all features work in both modes
3. **User Choice**: Allow users to select preferred mode
4. **Monitoring**: Track performance and user satisfaction

## 📈 Future Enhancements

### Planned Features
- **Multi-language Support**: Additional language models
- **Custom Voices**: Integration with ElevenLabs voices
- **Advanced Analytics**: Conversation insights and metrics
- **Mobile Optimization**: Progressive Web App features

### Technical Improvements
- **Connection Resilience**: Automatic reconnection handling
- **Quality Optimization**: Adaptive audio quality
- **Offline Support**: Cached responses for common queries
- **Batch Processing**: Efficient handling of multiple requests

## 📚 Additional Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/realtime)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Web Speech API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Nutrina Project Documentation](./README.md) 