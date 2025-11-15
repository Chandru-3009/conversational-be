const WebSocket = require('ws');

// Test WebSocket connection for realtime features
async function testWebSocketRealtime() {
    console.log('🧪 Testing WebSocket Realtime Integration...\n');

    const wsUrl = 'ws://localhost:3001';
    const sessionId = 'test_session_' + Date.now();
    const userEmail = 'test@example.com';

    console.log(`🔗 Connecting to: ${wsUrl}`);
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`📧 User Email: ${userEmail}\n`);

    const ws = new WebSocket(`${wsUrl}?sessionId=${sessionId}&userEmail=${encodeURIComponent(userEmail)}`);

    ws.on('open', () => {
        console.log('✅ WebSocket connected successfully');
        
        // Send realtime session request
        const sessionRequest = {
            type: 'realtime_session_request',
            sessionId: sessionId,
            userId: 'test_user_' + Date.now(),
            userEmail: userEmail
        };
        
        console.log('📤 Sending realtime session request:', JSON.stringify(sessionRequest, null, 2));
        ws.send(JSON.stringify(sessionRequest));
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📡 Received message:', JSON.stringify(message, null, 2));
            
            if (message.type === 'realtime_session_response') {
                console.log('✅ Realtime session response received');
                if (message.data && message.data.client_secret) {
                    console.log('🔑 Ephemeral key received successfully');
                    
                    // Test TTS request
                    setTimeout(() => {
                        const ttsRequest = {
                            type: 'tts_request',
                            text: 'Hello, this is a test of the WebSocket TTS integration.',
                            sessionId: sessionId
                        };
                        
                        console.log('\n📤 Sending TTS request:', JSON.stringify(ttsRequest, null, 2));
                        ws.send(JSON.stringify(ttsRequest));
                    }, 1000);
                }
            } else if (message.type === 'tts_response') {
                console.log('✅ TTS response received');
                if (message.data && message.data.audio) {
                    console.log('🔊 Audio data received successfully');
                    console.log(`📏 Audio duration: ${message.data.duration}ms`);
                    console.log(`📝 Text: "${message.data.text}"`);
                }
                
                // Close connection after successful test
                setTimeout(() => {
                    console.log('\n✅ Test completed successfully!');
                    ws.close();
                }, 1000);
            } else if (message.type === 'error') {
                console.error('❌ Error received:', message.data?.message || 'Unknown error');
                ws.close();
            }
        } catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });

    ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed - Code: ${code}, Reason: ${reason}`);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log('⏰ Test timeout - closing connection');
            ws.close();
        }
    }, 10000);
}

// Run the test
testWebSocketRealtime().catch(console.error); 