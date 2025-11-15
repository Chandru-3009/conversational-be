# 🔄 Flow Implementation Summary

This document outlines the exact flow implementation for the intent-based conversational agent system.

## 📋 Flow Overview

The system follows this precise sequence:

1. **Frontend opens WebSocket connection** with server
2. **Request realtime_session_request** → Server returns ephemeral key in `realtime_session_response`
3. **Frontend establishes WebRTC connection** with OpenAI Realtime API using the key
4. **Send client_ready_request** → Server gathers agent info from MongoDB + user info, returns in `client_ready_response`
5. **Determine user flow**:
   - **Returning user**: Skip section 1 (get to know), start with repeated user greeting
   - **New user**: Continue with section 1 to greet first-time user
6. **Loop through sections and intents** to continue conversation

## 🔧 Technical Implementation

### Frontend Flow (`public/agent.js`)

#### 1. WebSocket Connection & Realtime Session Request
```javascript
// Initialize WebSocket connection
this.websocket = new WebSocket(`${wsUrl}?sessionId=${this.sessionId}&userEmail=${encodeURIComponent(this.userEmail)}`);

// Send realtime session request
sendRealtimeSessionRequest() {
  const request = {
    type: 'realtime_session_request',
    sessionId: this.sessionId,
    data: { userEmail: this.userEmail },
    timestamp: Date.now()
  };
  this.websocket.send(JSON.stringify(request));
}
```

#### 2. WebRTC Connection Establishment
```javascript
// After receiving ephemeral key
handleRealtimeSessionResponse(message) {
  this.ephemeralKey = message.data.client_secret.value;
  this.startCall(); // Establishes WebRTC with OpenAI
}

// WebRTC connection established
async establishWebRTCConnectionWithOpenAI() {
  // Create offer, send to OpenAI, receive answer
  // Set up data channel for communication
}
```

#### 3. Client Ready Request
```javascript
// After WebRTC connection is established
sendClientReady() {
  const request = {
    type: 'client_ready_request',
    sessionId: this.sessionId,
    data: { agentId: this.agentId },
    timestamp: Date.now()
  };
  this.websocket.send(JSON.stringify(request));
}
```

#### 4. Handle Client Ready Response
```javascript
handleClientReadyResponse(message) {
  this.agent = message.data.agent;
  const userInfo = message.data.userInfo;
  const isReturningUser = userInfo.hasInteractedBefore;
  
  if (isReturningUser) {
    this.startIntentBasedConversationForReturningUser(); // Skip section 1
  } else {
    this.startIntentBasedConversation(); // Start with section 1
  }
}
```

#### 5. Intent-Based Conversation Flow
```javascript
// For new users - start with section 1
startIntentBasedConversation() {
  this.currentSection = this.agent.sections[0]; // First section
  if (this.currentSection.introduction) {
    this.processSectionIntroduction();
  } else {
    this.startSectionIntents();
  }
}

// For returning users - skip section 1
startIntentBasedConversationForReturningUser() {
  if (this.agent.sections.length > 1) {
    this.currentSection = this.agent.sections[1]; // Second section
  } else {
    this.currentSection = this.agent.sections[0]; // Only section available
  }
  this.startSectionIntents(); // Skip introduction
}
```

### Backend Flow (`src/websocket/audioStreamingServer.ts`)

#### 1. Handle Realtime Session Request
```typescript
private async handleRealtimeSessionRequest(sessionId: string, ws: WebSocket, message: any) {
  // Create/find user
  // Create/find session
  // Generate ephemeral key for OpenAI Realtime API
  ws.send({
    type: "realtime_session_response",
    data: ephemeralKeyResponse
  });
}
```

#### 2. Handle Client Ready Request
```typescript
private async handleClientReadyRequest(sessionId: string, ws: WebSocket, message: any) {
  // Get user data
  const user = await UserModel.findByEmail(sessionData.userEmail);
  
  // Get agent ID from request
  const agentId = message.data.agentId;
  
  // Fetch agent from database
  const agent = await AgentModel.getFormattedAgent(agentId);
  
  // Gather user information
  const userInfo = await this.gatherUserInformation(user._id!.toString());
  
  // Send response with agent and user info
  ws.send({
    type: "client_ready_response",
    data: { agent, userInfo }
  });
}
```

#### 3. Gather User Information
```typescript
private async gatherUserInformation(userId: string): Promise<any> {
  // Get user's recent activity
  const recentActivity = await UserActivityService.getUserRecentActivity(userId);
  
  // Get conversation history
  const recentConversations = await ConversationModel.getRecentConversations(userId, 5);
  
  // Get completed sessions
  const completedSessions = await SessionModel.findByUserId(userId, 10);
  
  // Determine if user has interacted before
  const hasInteractedBefore = recentConversations.length > 0 || completedSessions.length > 0;
  
  return {
    hasInteractedBefore,
    totalConversations: recentConversations.length,
    totalSessions: completedSessions.length,
    lastInteractionDate: lastInteraction?.createdAt || null,
    averageEngagement: recentActivity?.averageEngagement || 5,
    // ... more user stats
  };
}
```

## 📊 Message Flow Diagram

```
Frontend                    Server                    Database
   |                          |                          |
   |-- realtime_session_request -->|                     |
   |                          |-- Generate ephemeral key |
   |                          |-- Create/find user/session |
   |<-- realtime_session_response --|                     |
   |                          |                          |
   |-- Establish WebRTC with OpenAI Realtime API         |
   |                          |                          |
   |-- client_ready_request -->|                         |
   |                          |-- Fetch agent from DB -->|
   |                          |-- Gather user info ----->|
   |                          |                          |
   |<-- client_ready_response --|                        |
   |                          |                          |
   |-- Start conversation flow based on user type        |
   |                          |                          |
```

## 🎯 User Flow Logic

### New User Flow
1. **Section 1**: Introduction + Get to know (name, age, lifestyle)
2. **Section 2+**: Continue with remaining sections
3. **Complete**: Store all conversation data

### Returning User Flow
1. **Skip Section 1**: Jump directly to Section 2 or later
2. **Repeated greeting**: Personalized message based on previous interactions
3. **Continue**: Loop through remaining sections
4. **Complete**: Store all conversation data

## 🔧 Configuration

### Database Structure
- **Agent Database**: `chatagent.agent` collection
- **User Database**: `nutrina.users` collection
- **Session Database**: `nutrina.sessions` collection
- **Conversation Database**: `nutrina.conversations` collection

### Message Types
```typescript
type WebSocketMessageType = 
  | 'realtime_session_request'
  | 'realtime_session_response'
  | 'client_ready_request'
  | 'client_ready_response'
  | 'conversation_completed'
  | 'audio' | 'text' | 'status' | 'error' | 'tts_request' | 'test';
```

## 🧪 Testing

### Test Script
```bash
# Set up sample agent
node scripts/setup-sample-agent.js

# Test the complete flow
node scripts/test-intent-based.js
```

### Test Flow Verification
1. ✅ WebSocket connection establishment
2. ✅ Realtime session request/response
3. ✅ Client ready request/response with user info
4. ✅ Agent configuration retrieval
5. ✅ User flow determination (new vs returning)
6. ✅ Conversation completion

## 🚀 Benefits

1. **Structured Flow**: Clear, predictable conversation sequence
2. **User Personalization**: Different flows for new vs returning users
3. **Database Integration**: Agent and user data from MongoDB
4. **WebRTC Integration**: Real-time communication with OpenAI
5. **Scalable Architecture**: Easy to add new agents and sections

The implementation ensures the exact flow you specified is followed, with proper user state management and agent configuration retrieval from the database. 