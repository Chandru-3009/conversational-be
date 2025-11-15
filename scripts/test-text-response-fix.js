const WebSocket = require('ws');

// Test the text response handling fix
console.log('🧪 Testing text response handling fix...');

// Simulate the response.done event with audio content containing transcript
const mockResponseDoneEvent = {
    type: 'response.done',
    event_id: 'event_BtnYCzFRuOXUnnbRZZ9KH',
    response: {
        object: 'realtime.response',
        id: 'resp_BtnY850g19nETgLABSPAF',
        status: 'completed',
        status_details: null,
        output: [{
            id: 'item_BtnY8OLTPWLYjytsgITrg',
            object: 'realtime.item',
            type: 'message',
            status: 'completed',
            role: 'assistant',
            content: [{
                type: 'audio',
                transcript: `{
                    "id": "Give a warm introduction about who you are, how to interact, ensure about privacy.",
                    "isCompleted": true,
                    "fields": {},
                    "nextPrompt": "Hey there! I'm Ameya, a friendly diet tracking assistant. You can interact with me just like you would with a friend. I care about your privacy, so I don't store any personal info. It's all about helping you feel your best! So, what should I call you?"
                }`
            }]
        }],
        conversation_id: 'conv_BtnY7MFA829zRB6nWXxyE'
    }
};

// Test the event handling logic
function testHandleRealtimeEvent(event) {
    console.log('📡 Handling event:', event.type);
    
    switch (event.type) {
        case 'response.text.done':
            if (event.text) {
                console.log('🤖 AI response text:', event.text);
                return event.text;
            } else {
                console.warn('⚠️ response.text.done event received but no text content');
            }
            break;

        case 'response.create':
            console.log('🎤 AI started responding');
            break;

        case 'response.done':
            console.log('🔇 AI finished responding');
            // Handle response.done event that contains audio with transcript
            if (event.response && event.response.output && event.response.output.length > 0) {
                const output = event.response.output[0];
                if (output.content && output.content.length > 0) {
                    const content = output.content[0];
                    if (content.type === 'audio' && content.transcript) {
                        console.log('🤖 AI response transcript from audio:', content.transcript);
                        return content.transcript;
                    } else if (content.type === 'text' && content.text) {
                        console.log('🤖 AI response text:', content.text);
                        return content.text;
                    }
                }
            }
            break;

        case 'error':
            console.error('❌ OpenAI Realtime error:', event.error);
            break;

        default:
            console.log('📡 Unknown event type:', event.type);
    }
}

// Test the response processing logic
function testProcessLLMResponse(text) {
    console.log('🔄 Processing LLM response:', text);
    
    // Check if this is an intent-based response (JSON format)
    try {
        const parsedResponse = JSON.parse(text);
        if (parsedResponse.id && typeof parsedResponse.isCompleted !== 'undefined') {
            console.log('🎯 Detected intent response:', parsedResponse);
            console.log('✅ Intent ID:', parsedResponse.id);
            console.log('✅ Is Completed:', parsedResponse.isCompleted);
            console.log('✅ Fields:', parsedResponse.fields);
            console.log('✅ Next Prompt:', parsedResponse.nextPrompt);
            return 'intent_response';
        }
    } catch (error) {
        // Not JSON, treat as regular conversation
    }

    // Handle regular conversation response
    if (text && text.trim()) {
        console.log('💬 Regular conversation response:', text);
        return 'regular_response';
    }
}

// Run the test
console.log('\n🧪 Testing response.done event handling...');
const transcript = testHandleRealtimeEvent(mockResponseDoneEvent);

if (transcript) {
    console.log('\n🧪 Testing LLM response processing...');
    const responseType = testProcessLLMResponse(transcript);
    console.log(`✅ Response type: ${responseType}`);
} else {
    console.log('❌ No transcript extracted from event');
}

console.log('\n✅ Test completed!'); 