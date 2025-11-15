# 📊 Conversation Summarization Implementation

## Overview

The conversation summarization feature automatically generates summaries of ongoing conversations when they reach a certain length threshold. This helps users and the system maintain context during long conversations and provides a quick overview of what has been discussed.

## 🎯 How It Works

### Frontend Implementation (`public/agent.js`)

#### 1. Configuration
```javascript
// Conversation summarization settings
this.conversationSummaryThreshold = 5; // Trigger summary after 5 conversations
this.lastSummaryLength = 0; // Track when last summary was generated
```

#### 2. Automatic Triggering
The system automatically checks conversation history length after each message is added:

```javascript
checkAndTriggerConversationSummary() {
    const currentLength = this.conversationHistory.length;
    
    // Check if we've reached the threshold and haven't already summarized this batch
    if (currentLength >= this.conversationSummaryThreshold && 
        currentLength > this.lastSummaryLength) {
        
        console.log(`📊 Conversation history reached ${currentLength} entries, triggering summary`);
        this.sendConversationSummaryRequest();
        this.lastSummaryLength = currentLength;
    }
}
```

#### 3. WebSocket Communication
```javascript
sendConversationSummaryRequest() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const summaryRequest = {
            type: 'conversation_summary_request',
            sessionId: this.sessionId,
            data: {
                conversationHistory: this.conversationHistory,
                agentId: this.agent?.id
            },
            timestamp: Date.now()
        };

        console.log('📤 Sending conversation summary request:', summaryRequest);
        this.websocket.send(JSON.stringify(summaryRequest));
    }
}
```

#### 4. Response Handling
```javascript
handleConversationSummaryResponse(message) {
    console.log('📊 Processing conversation summary response:', message);

    try {
        if (message.data && message.data.summary) {
            const summary = message.data.summary;
            console.log('📊 Conversation summary received:', summary);

            // Display the summary to the user
            this.addMessage(`📊 **Conversation Summary:**\n${summary}`, 'ai');

            // Optionally convert summary to speech
            this.convertTextToSpeech(`Here's a summary of our conversation so far: ${summary}`);
        }
    } catch (error) {
        console.error('❌ Error processing conversation summary response:', error);
    }
}
```

### Backend Implementation (`src/websocket/audioStreamingServer.ts`)

#### 1. Message Handler
```typescript
// Handle conversation summary request
else if (message.type === "conversation_summary_request") {
    console.log(`📊 Conversation summary request received from ${sessionId}`);
    await this.handleConversationSummaryRequest(sessionId, ws, message);
    return;
}
```

#### 2. Summary Generation
```typescript
private async generateConversationSummary(
    conversationHistory: any[],
    agentId?: string
): Promise<string> {
    try {
        // Format conversation history for AI processing
        const formattedHistory = conversationHistory
            .map(entry => `${entry.speaker}: ${entry.text}`)
            .join('\n');

        // Create prompt for conversation summarization
        const summaryPrompt = `Please provide a concise summary of the following conversation between a user and an AI assistant. Focus on the key points, information shared, and the overall flow of the conversation.

Conversation:
${formattedHistory}

Please provide a summary in this format:
- Agent introduced itself and explained its role
- User shared [specific information]
- Agent asked about [specific topic]
- User replied [specific response]
- [Continue with key points...]

Summary:`;

        // Use AI service to generate summary
        const aiResponse = await this.aiService.generateAIResponse(summaryPrompt, "");
        
        // Extract summary from AI response
        let summary = aiResponse.nextPrompt || "Unable to generate summary";
        
        // Clean up the summary if it contains the prompt
        if (summary.includes("Summary:")) {
            summary = summary.split("Summary:")[1]?.trim() || summary;
        }

        return summary;

    } catch (error) {
        console.error("Error generating conversation summary:", error);
        return "Unable to generate conversation summary at this time.";
    }
}
```

## 🔧 Configuration

### Threshold Settings
- **Default Threshold**: 5 conversations
- **Configurable**: Can be adjusted in the frontend constructor
- **Prevents Duplicates**: Tracks last summary length to avoid repeated summaries

### AI Prompt Customization
The summary generation prompt can be customized in the `generateConversationSummary` method to:
- Change the summary format
- Add specific focus areas
- Include additional context
- Modify the output structure

## 📋 Message Flow

```
Frontend                    Backend                    AI Service
   |                          |                          |
   |-- Add message to history |                          |
   |                          |                          |
   |-- Check threshold        |                          |
   |                          |                          |
   |-- Send summary request -->|                         |
   |                          |-- Format conversation    |
   |                          |-- Generate AI prompt     |
   |                          |-- Call AI service ------>|
   |                          |                          |
   |                          |<-- AI summary response --|
   |                          |-- Process response       |
   |                          |-- Send summary response  |
   |<-- Summary response -----|                          |
   |                          |                          |
   |-- Display summary        |                          |
   |-- Convert to speech      |                          |
```

## 🧪 Testing

### Test Script
Run the conversation summary test:
```bash
node scripts/test-conversation-summary.js
```

### Test Flow
1. **Connection**: Establishes WebSocket connection
2. **Session**: Creates realtime session
3. **Simulation**: Adds test conversation messages
4. **Triggering**: Automatically triggers summary at threshold
5. **Verification**: Confirms summary generation and response

### Expected Output
```
🧪 Starting Conversation Summary Test
📊 Session ID: test_session_1234567890
📧 User Email: test@example.com
🔗 Connecting to WebSocket: ws://localhost:3031?sessionId=...
✅ WebSocket connected
📤 Sending realtime session request
🔑 Received realtime session response
💬 Simulating conversation to reach summary threshold...
📝 Message 1: agent - "Hello! I'm your AI assistant. How can I help you today?"
📝 Message 2: user - "Hi! I'd like to track my meals."
📝 Message 3: agent - "Great! I'd be happy to help you track your meals..."
📝 Message 4: user - "I had eggs and toast for breakfast."
📝 Message 5: agent - "That sounds delicious! How many eggs did you have?"
📊 Reached 5 messages, triggering conversation summary...
📤 Sending conversation summary request
📊 Received conversation summary response:
📋 Summary: - Agent introduced itself warmly and explained its role.
- User said to call them "Raja".
- Agent acknowledged and asked for user's age.
- User replied that they are 25 years old.
✅ Conversation Summary Test completed successfully!
```

## 🎯 Benefits

### For Users
- **Context Maintenance**: Quick overview of conversation progress
- **Memory Aid**: Helps remember what has been discussed
- **Engagement**: Keeps users informed about conversation flow

### For System
- **Performance**: Reduces context length for AI processing
- **Memory Management**: Prevents conversation history from growing too large
- **Analytics**: Provides structured conversation summaries for analysis

### For Developers
- **Debugging**: Easy to understand conversation flow
- **Monitoring**: Track conversation patterns and user engagement
- **Optimization**: Identify areas for conversation flow improvement

## 🔄 Integration Points

### Frontend Integration
- **Automatic Triggering**: No user intervention required
- **Visual Feedback**: Summary displayed in conversation UI
- **Audio Support**: Summary converted to speech for voice interfaces

### Backend Integration
- **AI Service**: Uses existing AI service for summary generation
- **WebSocket**: Leverages existing WebSocket infrastructure
- **Session Management**: Integrates with session tracking

### Database Integration
- **Conversation Storage**: Summaries can be stored with conversations
- **Analytics**: Summary data available for user behavior analysis
- **History**: Maintains conversation context across sessions

## 🚀 Future Enhancements

### Potential Improvements
1. **Smart Thresholds**: Dynamic threshold based on conversation complexity
2. **Summary Types**: Different summary formats (bullet points, narrative, etc.)
3. **User Preferences**: Allow users to configure summary frequency
4. **Context Preservation**: Keep key information from summaries in conversation context
5. **Multi-language Support**: Generate summaries in user's preferred language

### Advanced Features
1. **Sentiment Analysis**: Include conversation mood in summaries
2. **Topic Extraction**: Identify main topics discussed
3. **Action Items**: Extract tasks or follow-ups from conversations
4. **Progress Tracking**: Show completion status of conversation goals
5. **Interactive Summaries**: Allow users to ask questions about summaries

## 📝 Example Summaries

### Diet Tracking Conversation
```
📊 Conversation Summary:
- Agent introduced itself warmly and explained its role as a diet tracking assistant.
- User expressed interest in tracking their meals for better nutrition awareness.
- Agent asked about breakfast and user shared they had eggs and toast.
- Agent inquired about portion sizes and user provided specific details (2 eggs, 2 slices).
- Agent praised the breakfast choice and transitioned to asking about lunch.
- User mentioned having a chicken salad for lunch.
- Agent asked for salad ingredients and user listed grilled chicken, greens, tomatoes, and vinaigrette.
```

### Health Assessment Conversation
```
📊 Conversation Summary:
- Agent greeted user and explained the health assessment process.
- User shared their name as "Sarah" and mentioned they're 28 years old.
- Agent asked about current health goals and user mentioned wanting to improve fitness.
- User described their current activity level as "mostly sedentary with occasional walks."
- Agent inquired about dietary preferences and user mentioned being vegetarian.
- User shared concerns about getting enough protein on a vegetarian diet.
```

This implementation provides a robust, scalable solution for conversation summarization that enhances user experience while maintaining system performance. 