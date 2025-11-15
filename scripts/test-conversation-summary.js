const WebSocket = require('ws');

class ConversationSummaryTest {
    constructor() {
        this.ws = null;
        this.sessionId = 'test_session_' + Date.now();
        this.userEmail = 'test@example.com';
        this.conversationHistory = [];
        this.messageCount = 0;
    }

    async run() {
        console.log('🧪 Starting Conversation Summary Test');
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

            // Simulate conversation that reaches the threshold (5 messages)
            console.log('💬 Simulating conversation to reach summary threshold...');
            
            const testMessages = [
                { speaker: 'agent', text: 'Hello! I\'m your AI assistant. How can I help you today?' },
                { speaker: 'user', text: 'Hi! I\'d like to track my meals.' },
                { speaker: 'agent', text: 'Great! I\'d be happy to help you track your meals. What did you have for breakfast today?' },
                { speaker: 'user', text: 'I had eggs and toast for breakfast.' },
                { speaker: 'agent', text: 'That sounds delicious! How many eggs did you have?' },
                { speaker: 'user', text: 'I had 2 eggs and 2 slices of whole wheat toast.' },
                { speaker: 'agent', text: 'Perfect! That\'s a good breakfast. Now let\'s talk about lunch. What did you have for lunch?' },
                { speaker: 'user', text: 'I had a chicken salad for lunch.' },
                { speaker: 'agent', text: 'That sounds healthy! What was in your chicken salad?' },
                { speaker: 'user', text: 'It had grilled chicken, mixed greens, tomatoes, and a light vinaigrette dressing.' }
            ];

            // Add messages to conversation history and trigger summary
            for (let i = 0; i < testMessages.length; i++) {
                const message = testMessages[i];
                this.conversationHistory.push(message);
                this.messageCount++;

                console.log(`📝 Message ${this.messageCount}: ${message.speaker} - "${message.text}"`);

                // Check if we should trigger summary (every 5 messages)
                if (this.messageCount % 5 === 0) {
                    console.log(`📊 Reached ${this.messageCount} messages, triggering conversation summary...`);
                    await this.sendConversationSummaryRequest();
                    
                    // Wait for summary response
                    await this.wait(3000);
                }

                // Small delay between messages
                await this.wait(500);
            }

            console.log('✅ Conversation Summary Test completed successfully!');

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
    const test = new ConversationSummaryTest();
    test.run().catch(console.error);
}

module.exports = ConversationSummaryTest; 