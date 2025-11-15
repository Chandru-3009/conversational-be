# 🍎 Nutrina: Voice-Powered Diet Tracking Assistant

A real-time voice-powered AI assistant that helps users track their dietary intake through natural conversation. Built with Node.js, WebSocket, Google Gemini AI, and ElevenLabs voice services.

## 🎯 Features

- **Voice-First Interface**: Natural conversation for meal logging
- **Real-Time Processing**: WebSocket-based audio streaming
- **AI-Powered**: Google Gemini AI or OpenAI for intelligent conversation
- **High-Quality Voice**: ElevenLabs STT/TTS for natural voice interaction
- **Session Management**: Persistent conversation history
- **Responsive Web UI**: Modern, mobile-friendly interface
- **OpenAI Realtime API**: Ultra-low latency WebRTC-based conversations (NEW!)

## 🏗️ Architecture

### Standard WebSocket Flow
```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Web Browser   │ ◄─────────────► │  Node.js Server │
│   (Frontend)    │                 │   (Backend)     │
└─────────────────┘                 └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   MongoDB       │
                                    │   (Database)    │
                                    └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   External APIs │
                                    │ • Google Gemini │
                                    │ • ElevenLabs    │
                                    └─────────────────┘
```

### OpenAI Realtime API Flow (NEW!)
```
┌─────────────────┐    WebRTC       ┌─────────────────┐
│   Web Browser   │ ◄─────────────► │  OpenAI Realtime│
│   (Frontend)    │                 │     API         │
└─────────────────┘                 └─────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐                 ┌─────────────────┐
│  Node.js Server │                 │  Node.js Server │
│ (TTS Only)      │                 │ (Session Mgmt)  │
└─────────────────┘                 └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- Google Gemini API key OR OpenAI API key
- ElevenLabs API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nutrina
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your API keys:
   ```env
   MONGODB_URI=mongodb://localhost:27017/nutrina
   GEMINI_API_KEY=your_gemini_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

6. **Open the application**
   - **Standard Mode**: Navigate to `http://localhost:3000`
   - **Realtime Mode**: Navigate to `http://localhost:3000/realtime.html`
   - Click "Connect" to start a voice session
   - Hold the microphone button and speak

## 🤖 AI Provider Options

### Option 1: Google Gemini AI (Default)
- **Pros**: Free tier, good performance, reliable
- **Setup**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Usage**: Set `AI_PROVIDER=gemini` in `.env`

### Option 2: OpenAI GPT Models
- **Pros**: Advanced models, excellent conversation quality
- **Setup**: Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Usage**: Set `AI_PROVIDER=openai` in `.env`

### Option 3: OpenAI Realtime API (NEW!)
- **Pros**: Ultra-low latency (~100-200ms), real-time streaming
- **Setup**: Requires OpenAI API key with Realtime API access
- **Usage**: Set `OPENAI_REALTIME_ENABLED=true` in `.env`
- **Interface**: Use `http://localhost:3000/realtime.html`

## 🗣️ Usage Example

**User**: "I had eggs and toast for breakfast"

**Nutrina**: "That sounds delicious! How many eggs did you have?"

**User**: "Two eggs"

**Nutrina**: "Great! And what size was the toast? Was it one slice or two?"

**User**: "Two slices"

**Nutrina**: "Perfect! I've logged your breakfast: 2 eggs and 2 slices of toast. What did you have for lunch today?"

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js with TypeScript |
| **Real-time Communication** | WebSocket (ws) / WebRTC (Realtime) |
| **AI Framework** | Google Gemini AI / OpenAI / OpenAI Realtime |
| **Database** | MongoDB with MongoDB Driver |
| **Speech-to-Text** | ElevenLabs Scribe / Web Speech API (Realtime) |
| **Text-to-Speech** | ElevenLabs Voice API / Google Cloud TTS |
| **Frontend** | Vanilla JavaScript + HTML/CSS |
| **Deployment** | GCP Compute Engine (planned) |

## 📁 Project Structure

```
nutrina/
├── src/
│   ├── config/
│   │   └── database.ts          # Database connection
│   ├── models/
│   │   ├── User.ts              # User model
│   │   ├── Conversation.ts      # Conversation model
│   │   └── FoodEntry.ts         # Food entry model
│   ├── services/
│   │   ├── aiService.ts         # AI processing service
│   │   ├── audioService.ts      # STT/TTS service
│   │   └── openaiRealtimeService.ts # OpenAI Realtime service
│   ├── websocket/
│   │   └── audioStreamingServer.ts # WebSocket server
│   └── server.ts                # Main server file
├── public/
│   ├── index.html               # Standard frontend interface
│   └── realtime.html            # Realtime API interface
├── context/                     # Project documentation
├── REALTIME_IMPLEMENTATION.md   # Realtime API documentation
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `WS_PORT` | WebSocket server port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/nutrina` |
| `AI_PROVIDER` | AI provider to use ('gemini' or 'openai') | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API key | Required for Gemini |
| `OPENAI_API_KEY` | OpenAI API key | Required for OpenAI |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` |
| `OPENAI_REALTIME_ENABLED` | Enable OpenAI Realtime API | `false` |
| `OPENAI_REALTIME_MODEL` | OpenAI Realtime model | `gpt-4o-realtime-preview-2025-06-03` |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Required |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID | `21m00Tcm4TlvDq8ikWAM` |
| `GOOGLE_TTS_USE_SSML` | Use SSML for Google TTS | `true` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` |

### API Keys Setup

1. **AI Provider Setup**
   
   **Option A: Google Gemini AI (Default)**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add to `.env` as `GEMINI_API_KEY`
   - Set `AI_PROVIDER=gemini` in `.env`
   
   **Option B: OpenAI**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Add to `.env` as `OPENAI_API_KEY`
   - Set `AI_PROVIDER=openai` in `.env`
   - Optionally set `OPENAI_MODEL=gpt-4o-mini` (or other available models)

   **Option C: OpenAI Realtime API (NEW!)**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key with Realtime API access
   - Add to `.env` as `OPENAI_API_KEY`
   - Set `OPENAI_REALTIME_ENABLED=true` in `.env`
   - Use `http://localhost:3000/realtime.html` for ultra-low latency

2. **ElevenLabs**
   - Sign up at [ElevenLabs](https://elevenlabs.io/)
   - Get your API key from the profile section
   - Add to `.env` as `ELEVENLABS_API_KEY`

3. **Google Cloud TTS (Alternative)**
   - Set up Google Cloud project with Text-to-Speech API enabled
   - Configure service account credentials
   - Set `TTS_PROVIDER=google` in `.env`
   - Configure voice settings:
     ```env
     GOOGLE_TTS_VOICE_NAME=en-US-Neural2-F
     GOOGLE_TTS_LANGUAGE_CODE=en-US
     GOOGLE_TTS_USE_SSML=true  # Set to false if SSML causes issues
     ```

## 🎮 Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
```

### Development Workflow

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Make changes** - The server will automatically restart

3. **Test the interface**
   - Open `http://localhost:3000`
   - Use browser dev tools to monitor WebSocket connections
   - Check server logs for processing information

## 🧪 Testing

### Manual Testing

1. **Connection Test**
   - Open browser console
   - Check WebSocket connection status
   - Verify session creation

2. **Audio Test**
   - Grant microphone permissions
   - Test recording functionality
   - Verify audio processing

3. **Conversation Test**
   - Start a conversation about meals
   - Test follow-up questions
   - Verify session completion

### API Endpoints

- `GET /health` - Health check
- `GET /api/stats` - WebSocket server statistics
- `GET /` - Frontend interface

## 🚀 Deployment

### GCP Compute Engine (Recommended)

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set up GCP instance**
   ```bash
   # Create instance
   gcloud compute instances create nutrina-server \
     --zone=us-central1-a \
     --machine-type=e2-medium \
     --image-family=debian-11 \
     --image-project=debian-cloud
   ```

3. **Deploy application**
   ```bash
   # Copy files to instance
   gcloud compute scp --recurse . nutrina-server:~/nutrina
   
   # SSH into instance
   gcloud compute ssh nutrina-server
   
   # Install dependencies and start
   cd nutrina
   npm install --production
   npm start
   ```

### Environment Setup

For production deployment, ensure:

- MongoDB is accessible (consider MongoDB Atlas)
- API keys are properly configured
- Firewall rules allow WebSocket connections
- SSL certificates are configured for HTTPS

## 🔒 Security Considerations

- **API Key Protection**: Never commit API keys to version control
- **Input Validation**: All audio chunks are validated before processing
- **Rate Limiting**: Implement rate limiting for production use
- **CORS Configuration**: Configure CORS for your domain
- **HTTPS**: Use HTTPS in production for secure WebSocket connections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Check the [Issues](../../issues) page
- Review the project documentation in `context/`
- Contact the development team

## 🎯 Roadmap

- [ ] User authentication and profiles
- [ ] Nutritional database integration
- [ ] Meal planning features
- [ ] Progress tracking and analytics
- [ ] Mobile app development
- [ ] Multi-language support
- [ ] Advanced AI features (meal suggestions, etc.)

## 🎮 Web Speech API Feature

The application now includes a **Web Speech API** toggle that provides faster speech recognition by using the browser's built-in speech recognition capabilities.

### Benefits of Web Speech API:
- **Faster Response**: No network latency for speech recognition
- **Lower Cost**: No API calls to ElevenLabs for STT
- **Better Privacy**: Speech processing happens locally in the browser
- **Real-time Feedback**: Immediate transcription feedback

### How to Use:
1. **Default State**: Web Speech API is enabled by default (ON)
2. **Toggle Control**: Use the "🗣️ Web Speech" button to enable/disable
3. **Fallback**: If Web Speech API is disabled or not supported, the system automatically falls back to ElevenLabs STT
4. **Browser Support**: Works in Chrome, Edge, and other Chromium-based browsers

### Browser Compatibility:
- ✅ **Chrome/Chromium**: Full support
- ✅ **Edge**: Full support  
- ✅ **Safari**: Limited support (may fall back to ElevenLabs)
- ❌ **Firefox**: Not supported (will fall back to ElevenLabs)

### Performance Comparison:
| Feature | Web Speech API | ElevenLabs STT |
|---------|---------------|----------------|
| Speed | ~100-500ms | ~1000-3000ms |
| Accuracy | Good | Excellent |
| Cost | Free | API credits |
| Privacy | Local | Cloud |
| Reliability | Browser-dependent | High |

---

**Built with ❤️ for better health tracking through voice technology**

## Google Cloud TTS Setup

This project uses Google Cloud Text-to-Speech for high-quality voice synthesis. Here's how to set it up:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

### 2. Enable Text-to-Speech API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Cloud Text-to-Speech API"
3. Click on it and press "Enable"

### 3. Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details
4. Click "Create and Continue"
5. For roles, add "Cloud Text-to-Speech Admin"
6. Click "Done"

### 4. Generate Service Account Key

1. Click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON" format
5. Download the JSON file

### 5. Configure Environment Variables

Add the following to your `.env` file:

```env
# TTS Provider Configuration
TTS_PROVIDER=google

# Google Cloud TTS Configuration
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
GOOGLE_TTS_VOICE_NAME=en-US-Chirp3-HD-Aoede
GOOGLE_TTS_LANGUAGE_CODE=en-US
GOOGLE_TTS_AUDIO_ENCODING=MP3
```

**Important**: The `GOOGLE_APPLICATION_CREDENTIALS` should be the entire JSON content from your service account key file, properly escaped as a single line.

### 6. Alternative: Use gcloud CLI

If you prefer using gcloud CLI instead of service account keys:

1. Install [gcloud CLI](https://cloud.google.com/sdk/docs/install)
2. Run `gcloud auth application-default login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`
4. Leave `GOOGLE_APPLICATION_CREDENTIALS` empty in your `.env` file

### Voice Options

Google TTS offers many voice options. You can change the voice by modifying:

- `GOOGLE_TTS_VOICE_NAME`: Voice name (e.g., "en-US-Chirp3-HD-Aoede", "en-US-Neural2-F")
- `GOOGLE_TTS_LANGUAGE_CODE`: Language code (e.g., "en-US", "en-GB", "es-ES")
- `GOOGLE_TTS_AUDIO_ENCODING`: Audio format ("MP3", "LINEAR16", "OGG_OPUS")

Popular voice options:
- `en-US-Chirp3-HD-Aoede` - Natural, friendly female voice
- `en-US-Neural2-F` - Clear, professional female voice  
- `en-US-Neural2-M` - Clear, professional male voice
- `en-US-Studio-M` - Warm, conversational male voice

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TTS_PROVIDER` | TTS provider: "google" or "elevenlabs" | "google" |
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud Project ID | - |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account JSON (optional with gcloud) | - |
| `GOOGLE_TTS_VOICE_NAME` | Google TTS voice name | "en-US-Chirp3-HD-Aoede" |
| `GOOGLE_TTS_LANGUAGE_CODE` | Language code | "en-US" |
| `GOOGLE_TTS_AUDIO_ENCODING` | Audio format | "MP3" |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `MONGODB_URI` | MongoDB connection string | "mongodb://localhost:27017/nutrina" |

### Performance Tuning

- `TTS_TIMEOUT`: TTS request timeout (ms)
- `TTS_RETRY_ATTEMPTS`: Number of retry attempts for TTS
- `ENABLE_PERFORMANCE_MODE`: Enable performance optimizations
- `ENABLE_AI_CACHING`: Cache AI responses for faster replies

## Architecture

### Frontend
- **WebSocket Connection**: Real-time bidirectional communication
- **Web Speech API**: Browser-based speech recognition
- **Audio Streaming**: Efficient audio capture and playback
- **Responsive UI**: Modern, accessible interface

### Backend
- **WebSocket Server**: Handles real-time audio streaming
- **Google TTS**: High-quality text-to-speech synthesis
- **ElevenLabs STT**: Accurate speech-to-text conversion
- **Google Gemini**: AI-powered conversation processing
- **MongoDB**: Persistent data storage

### Audio Processing Pipeline
1. **Capture**: Browser captures audio via Web Speech API
2. **Stream**: Audio sent to server via WebSocket
3. **STT**: ElevenLabs converts speech to text
4. **AI**: Gemini processes text and generates response
5. **TTS**: Google TTS converts response to speech
6. **Playback**: Audio sent back to browser for playback

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run linter
```

### Project Structure

```
src/
├── config/          # Configuration management
├── models/          # Database models
├── services/        # Business logic services
│   ├── aiService.ts           # AI conversation processing
│   ├── audioService.ts        # Audio processing (TTS/STT)
│   ├── googleTTSService.ts    # Google TTS implementation
│   └── userActivityService.ts # User activity tracking
├── websocket/       # WebSocket server
└── server.ts        # Main server entry point
```

## Deployment

### Docker Deployment

```bash
# Build the image
docker build -t nutrina .

# Run the container
docker run -p 3000:3000 -p 3001:3001 --env-file .env nutrina
```

### Environment Setup

1. Set up MongoDB (local or cloud)
2. Configure Google Cloud TTS
3. Set up Google Gemini API
4. Configure environment variables
5. Deploy to your preferred platform

## Troubleshooting

### Common Issues

**Google TTS Authentication Error**
- Verify your service account key is correct
- Ensure the Text-to-Speech API is enabled
- Check your project ID is correct

**Audio Quality Issues**
- Try different voice options
- Adjust audio encoding settings
- Check network connectivity

**Performance Issues**
- Enable performance mode
- Increase timeout values
- Use caching where appropriate

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the configuration documentation