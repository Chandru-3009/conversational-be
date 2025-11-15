# AudioStreamingServer Implementation Overview

## 🎯 **Purpose**
The AudioStreamingServer is a real-time WebSocket-based audio streaming service designed for an AI-powered diet tracking conversational bot. It handles voice interactions by converting speech to text, processing with AI, and converting responses back to speech.

## 🏗️ **Architecture Overview**

### **Core Components**
- **WebSocket Server**: Real-time bidirectional communication
- **Audio Processing Pipeline**: STT → AI Processing → TTS
- **Session Management**: Multi-client support with isolated conversations
- **Database Integration**: Persistent conversation history storage

## 🔧 **Key Features & Functionalities**

### **1. Real-Time Audio Streaming**
- **WebSocket Connection**: Handles multiple concurrent client connections
- **Session-Based**: Each client requires a `sessionId` for conversation continuity
- **Binary Audio Processing**: Accepts WebM audio chunks from client browsers
- **Audio Validation**: Filters out corrupted or insufficient audio data

### **2. Speech-to-Text (STT) Integration**
- **ElevenLabs Scribe API**: Uses `scribe_v1` model for high-quality transcription
- **Audio Buffer Management**: 
  - Minimum size: 40KB (~1-1.5 seconds of audio)
  - Maximum size: 200KB (memory protection)
  - Quality threshold: 5KB minimum chunk size
- **Error Handling**: Comprehensive error management for API failures, rate limits, and format issues

### **3. AI Conversation Processing**
- **Gemini Integration**: Processes transcribed text through Google's Gemini AI
- **Conversation Context**: Maintains full conversation history for context-aware responses
- **Diet-Specific Logic**: Specialized prompts for meal tracking conversations
- **Meal Progression**: Guides users through breakfast → lunch → dinner → snacks workflow

### **4. Text-to-Speech (TTS)**
- **ElevenLabs Voice**: Uses voice ID `21m00Tcm4TlvDq8ikWAM` for natural speech
- **Audio Response**: Converts AI responses to base64-encoded audio
- **Fallback Handling**: Gracefully handles TTS failures while still providing text responses

### **5. Advanced Audio Processing**
- **Audio Queuing System**: Prevents data loss during processing
- **Concurrent Request Handling**: Manages multiple audio chunks per client
- **Buffer Management**: 
  - Active buffer for current processing
  - Queue buffer for incoming chunks during processing
  - Transcript buffer for AI processing delays

### **6. Session Management & Persistence**
- **Database Storage**: PostgreSQL integration for conversation history
- **User Personalization**: Fetches user data for personalized greetings
- **Conversation Continuity**: Maintains context across sessions
- **Message Types**: Distinguishes between user and AI messages

### **7. Intelligent Greeting System**
- **Time-Based Greetings**: Contextual greetings based on time of day
- **Personalized Messages**: Uses user's first name when available
- **Meal-Specific Questions**: Asks about appropriate meals for the current time
- **New Session Detection**: Only greets users starting fresh conversations

### **8. Robust Error Handling & Recovery**
- **Processing Timeouts**: 30-second timeout prevents stuck processing
- **Exponential Backoff**: Intelligent retry logic for API failures
- **Memory Protection**: Automatic cleanup of large buffers
- **Connection Recovery**: Graceful handling of disconnections and errors

### **9. Performance & Resource Management**
- **Client Cleanup**: Automatic removal of inactive clients (5-minute timeout)
- **Memory Monitoring**: Prevents memory leaks through buffer size limits
- **Statistics Tracking**: Monitors processing metrics and error rates
- **Resource Optimization**: Efficient audio chunk processing and queue management

## 🔄 **Data Flow**

```
Client Audio → WebSocket → Audio Buffer → STT → AI Processing → TTS → Audio Response → Client
     ↓              ↓           ↓         ↓         ↓          ↓         ↓
  Validation    Session    Queuing    Gemini    Database   ElevenLabs   WebSocket
  & Quality     Mgmt       System     AI        Storage    Voice API    Response
```

## 🛡️ **Security & Reliability Features**

### **Input Validation**
- Audio chunk size validation (5KB minimum)
- Corruption detection (90% zero bytes threshold)
- Session ID requirement for connections

### **Error Recovery**
- Processing state reset mechanisms
- Automatic cleanup of stuck processes
- Graceful degradation when services fail

### **Resource Protection**
- Memory leak prevention
- Queue size limits (5 chunks max)
- Total buffer size limits (500KB max)

## 📊 **Monitoring & Debugging**

### **Comprehensive Logging**
- Detailed processing logs with client IDs
- Performance metrics and timing information
- Error categorization and handling

### **Statistics Tracking**
- Connected client count
- Processing status monitoring
- Queue and buffer statistics

## 🎯 **Diet Tracking Specific Features**

### **Conversation Flow Management**
- **Meal Progression**: Guides users through breakfast → lunch → dinner → snacks
- **Completion Detection**: Recognizes when users finish logging meals
- **Contextual Questions**: Asks relevant follow-up questions about food details
- **Natural Language**: Conversational approach with emojis and casual language

### **AI Prompt Engineering**
- Specialized prompts for nutrition tracking
- Meal completion detection phrases
- Conversation flow control commands
- User-friendly response formatting

This implementation provides a robust, scalable foundation for real-time voice-based diet tracking conversations with comprehensive error handling, performance optimization, and user experience considerations.