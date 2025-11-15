# AI-Powered Greeting System Implementation

## Overview

This implementation replaces the hardcoded greeting system with an AI-powered approach that analyzes user conversation history and generates personalized greetings based on their meal tracking progress.

## Key Changes Made

### 1. Conversation Model Updates

**File: `src/models/Conversation.ts`**

- Added `isCompleteMeal?: boolean` property to the `IConversation` interface
- Added `getTodayConversations(userId: string)` method to fetch today's conversations
- Updated `updateSummary()` method to handle the new `isCompleteMeal` property

### 2. AI Service Enhancements

**File: `src/services/aiService.ts`**

- Added `generateAIPoweredGreeting()` method that:
  - Fetches user's conversation history
  - Analyzes today's conversations and meal completion status
  - Uses OpenAI to generate contextual greetings
  - Falls back to existing greeting method if AI fails

- Added `prepareGreetingContext()` method to prepare context for AI
- Added `createGreetingPrompt()` method to generate AI prompts

### 3. WebSocket Server Updates

**File: `src/websocket/audioStreamingServer.ts`**

- Updated `sendPersonalizedGreeting()` method to use the new AI-powered system
- Modified meal completion handler to set `isCompleteMeal: true`

## How It Works

### First-Time Users
- System detects no conversation history
- AI generates a welcoming greeting suggesting to start with the current meal (breakfast/lunch/dinner)
- Example: "Good morning John! Welcome to Nutrina! Let's start tracking your breakfast..."

### Returning Users with Today's Conversations
- System fetches today's conversations
- Checks if meals are complete (`isCompleteMeal` property)
- AI generates context-aware greetings based on:
  - What they've eaten today
  - Whether meals are complete
  - Recent meal history
- Example: "Hi Jane! I see you had eggs and toast for breakfast. Great start! Ready for lunch?"

### Users with Incomplete Meals
- System detects incomplete meal conversations
- AI suggests continuing the current meal tracking
- Example: "Hey Bob! I see you mentioned a sandwich for lunch. What kind of sandwich was it?"

## Database Schema Changes

### Conversation Summary Structure
```typescript
summary?: {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodsLogged: string[];
  totalCalories?: number;
  completionStatus: 'incomplete' | 'complete' | 'abandoned';
  isCompleteMeal?: boolean; // NEW: Tracks if meal is fully logged
}
```

## API Changes

### New Methods

1. **`ConversationModel.getTodayConversations(userId: string)`**
   - Returns all conversations for the current day
   - Used for checking today's meal progress

2. **`AIService.generateAIPoweredGreeting(user, todayConversations, recentConversations)`**
   - Main method for generating AI-powered greetings
   - Takes user context and conversation history
   - Returns SSML-formatted greeting

## Testing

A test script has been created at `scripts/test-ai-greeting.js` that tests:
- First-time user scenarios
- Returning users with completed meals
- Users with incomplete meals

Run with: `node scripts/test-ai-greeting.js`

## Fallback Behavior

If the AI-powered greeting fails:
1. System logs the error
2. Falls back to the existing hardcoded greeting system
3. Ensures the application continues to work

## Benefits

1. **Personalized Experience**: Greetings are tailored to each user's actual meal tracking progress
2. **Context Awareness**: System knows what the user has eaten and what's next
3. **Natural Language**: AI generates more natural, conversational greetings
4. **Progress Tracking**: Clear indication of meal completion status
5. **Scalable**: Easy to extend with more context and personalization

## Configuration

The system uses the existing AI provider configuration:
- `AI_PROVIDER` environment variable (gemini/openai)
- Respects existing API keys and settings
- Uses the same timeout and retry logic

## Migration Notes

- **Backward Compatible**: Existing functionality remains unchanged
- **Gradual Rollout**: Can be enabled/disabled by modifying the greeting method call
- **No Data Migration**: New `isCompleteMeal` field defaults to `false` for existing conversations 