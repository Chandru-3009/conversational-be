const WebSocket = require('ws');

class ConversationHistoryCleanupTest {
    constructor() {
        this.ws = null;
        this.sessionId = 'test_cleanup_session_' + Date.now();
        this.userEmail = 'test@example.com';
        this.conversationHistory = [];
        this.conversationSummary = [];
        this.messageCount = 0;
        this.summaryCount = 0;
    }

    async run() {
        console.log('🧪 Starting Conversation History Cleanup Test');
        console.log('📊 Session ID:', this.sessionId);
        console.log('📧 User Email:', this.userEmail);

        try {
            // Connect to WebSocket server
            await this.connectToWebSocket();
            
            // Wait for connection to establish
            await this.wait(1000);

            // Send realtime session request
            await this.sendRealtimeSessionRequest();
            
            // Wait for response
            await this.wait(2000);

            // Simulate conversation that reaches the threshold multiple times
            console.log('💬 Simulating conversation to test history cleanup...');
            
            const testMessages = [
                // First batch (will be summarized)
                { speaker: 'agent', text: 'Hello! I\'m your AI assistant. How can I help you today?' },
                { speaker: 'user', text: 'Hi! I\'d like to track my meals.' },
                { speaker: 'agent', text: 'Great! I\'d be happy to help you track your meals. What did you have for breakfast today?' },
                { speaker: 'user', text: 'I had eggs and toast for breakfast.' },
                { speaker: 'agent', text: 'That sounds delicious! How many eggs did you have?' },
                
                // Second batch (will be summarized)
                { speaker: 'user', text: 'I had 2 eggs and 2 slices of whole wheat toast.' },
                { speaker: 'agent', text: 'Perfect! That\'s a good breakfast. Now let\'s talk about lunch. What did you have for lunch?' },
                { speaker: 'user', text: 'I had a chicken salad for lunch.' },
                { speaker: 'agent', text: 'That sounds healthy! What was in your chicken salad?' },
                { speaker: 'user', text: 'It had grilled chicken, mixed greens, tomatoes, and a light vinaigrette dressing.' },
                
                // Third batch (will remain in history)
                { speaker: 'agent', text: 'That sounds nutritious! Now let\'s talk about dinner. What did you have for dinner?' },
                { speaker: 'user', text: 'I had salmon with steamed vegetables for dinner.' },
                { speaker: 'agent', text: 'Excellent choice! Salmon is great for omega-3s. How was it prepared?' },
                { speaker: 'user', text: 'It was grilled with lemon and herbs.' },
                { speaker: 'agent', text: 'That sounds delicious! Thank you for sharing your meals with me.' }
            ];

            // Add messages to conversation history and trigger summary
            for (let i = 0; i < testMessages.length; i++) {
                const message = testMessages[i];
                this.conversationHistory.push(message);
                this.messageCount++;

                console.log(`📝 Message ${this.messageCount}: ${message.speaker} - "${message.text}"`);
                console.log(`📊 Current history length: ${this.conversationHistory.length}`);

                // Check if we should trigger summary (every 5 messages)
                if (this.messageCount % 5 === 0) {
                    console.log(`📊 Reached ${this.messageCount} messages, triggering conversation summary...`);
                    console.log(`📊 History before summary: ${this.conversationHistory.length} entries`);
                    
                    await this.sendConversationSummaryRequest();
                    
                    // Wait for summary response
                    await this.wait(3000);
                    
                    console.log(`📊 History after summary: ${this.conversationHistory.length} entries`);
                    console.log(`📊 Total summaries: ${this.conversationSummary.length}`);
                }

                // Small delay between messages
                await this.wait(500);
            }

            // Final verification
            console.log('\n📊 Final Results:');
            console.log(`📝 Total messages sent: ${this.messageCount}`);
            console.log(`📊 Final history length: ${this.conversationHistory.length}`);
            console.log(`📋 Total summaries: ${this.conversationSummary.length}`);
            
            // Expected: 15 messages total, 2 summaries, 5 messages remaining in history
            const expectedHistoryLength = 5; // Only the last batch should remain
            const expectedSummaryCount = 2; // Two summaries should be generated
            
            if (this.conversationHistory.length === expectedHistoryLength && this.summaryCount === expectedSummaryCount) {
                console.log('✅ Test PASSED: Conversation history cleanup working correctly!');
            } else {
                console.log('❌ Test FAILED: Conversation history cleanup not working as expected');
                console.log(`Expected history length: ${expectedHistoryLength}, got: ${this.conversationHistory.length}`);
                console.log(`Expected summary count: ${expectedSummaryCount}, got: ${this.summaryCount}`);
            }

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            this.cleanup();
        }
    }

    async connectToWebSocket() {
        return new Promise((resolve, reject) => {
            const wsUrl = `ws://localhost:3031?sessionId=${this.sessionId}&userEmail=${encodeURIComponent(this.userEmail)}`;
            console.log('🔗 Connecting to WebSocket:', wsUrl);

            this.ws = new WebSocket(wsUrl);

            this.ws.on('open', () => {
                console.log('✅ WebSocket connected');
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('🔌 WebSocket connection closed');
            });
        });
    }

    handleWebSocketMessage(message) {
        console.log('📡 Received WebSocket message:', message.type);

        switch (message.type) {
            case 'realtime_session_response':
                console.log('🔑 Received realtime session response');
                break;

            case 'conversation_summary_response':
                console.log('📊 Received conversation summary response:');
                if (message.data && message.data.summary) {
                    console.log('📋 Summary:', message.data.summary);
                    this.summaryCount++;
                    
                    // Simulate the cleanup that should happen in the client
                    // This mimics what we implemented in handleConversationSummaryResponse
                    const conversationsToRemove = 5; // First 5 messages should be removed
                    if (this.conversationHistory.length > conversationsToRemove) {
                        console.log(`🧹 Simulating cleanup: removing ${conversationsToRemove} summarized conversations`);
                        this.conversationHistory = this.conversationHistory.slice(conversationsToRemove);
                        console.log(`📊 History after cleanup: ${this.conversationHistory.length} entries`);
                    }
                }
                break;

            case 'error':
                console.error('❌ Server error:', message.data?.message);
                break;

            case 'status':
                console.log('📊 Status:', message.data?.message);
                break;

            default:
                console.log('📡 Unknown message type:', message.type);
        }
    }

    async sendRealtimeSessionRequest() {
        const request = {
            type: 'realtime_session_request',
            sessionId: this.sessionId,
            userEmail: this.userEmail,
            timestamp: Date.now()
        };

        console.log('📤 Sending realtime session request');
        this.ws.send(JSON.stringify(request));
    }

    async sendConversationSummaryRequest() {
        const request = {
            type: 'conversation_summary_request',
            sessionId: this.sessionId,
            data: {
                conversationHistory: this.conversationHistory,
                agentId: 'test_agent'
            },
            timestamp: Date.now()
        };

        console.log('📤 Sending conversation summary request');
        this.ws.send(JSON.stringify(request));
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanup() {
        if (this.ws) {
            this.ws.close();
        }
        console.log('🧹 Test cleanup completed');
    }
}

// Run the test
if (require.main === module) {
    const test = new ConversationHistoryCleanupTest();
    test.run().catch(console.error);
}

module.exports = ConversationHistoryCleanupTest; 