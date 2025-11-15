const WebSocket = require('ws');

// Test configuration
const TEST_CONFIG = {
  serverUrl: 'ws://localhost:3001',
  userEmail: 'test@example.com',
  sessionId: 'test_session_' + Date.now(),
  agentId: '507f1f77bcf86cd799439011' // Example MongoDB ObjectId
};

console.log('🧪 Testing Intent-Based Implementation');
console.log('=====================================');
console.log(`Server: ${TEST_CONFIG.serverUrl}`);
console.log(`Session: ${TEST_CONFIG.sessionId}`);
console.log(`Email: ${TEST_CONFIG.userEmail}`);
console.log('');

async function testIntentBasedFlow() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${TEST_CONFIG.serverUrl}?sessionId=${TEST_CONFIG.sessionId}&userEmail=${encodeURIComponent(TEST_CONFIG.userEmail)}`);
    
    let step = 0;
    const maxSteps = 10;
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      step++;
      
      // Step 1: Send realtime session request
      setTimeout(() => {
        console.log('\n📤 Step 1: Sending realtime session request');
        ws.send(JSON.stringify({
          type: 'realtime_session_request',
          sessionId: TEST_CONFIG.sessionId,
          data: {
            userEmail: TEST_CONFIG.userEmail
          },
          timestamp: Date.now()
        }));
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📡 Received: ${message.type}`);
        
        switch (message.type) {
          case 'realtime_session_response':
            console.log('✅ Realtime session response received');
            step++;
            
            // Step 2: Send client ready request
            setTimeout(() => {
              console.log('\n📤 Step 2: Sending client ready request');
              ws.send(JSON.stringify({
                type: 'client_ready_request',
                sessionId: TEST_CONFIG.sessionId,
                data: {
                  agentId: TEST_CONFIG.agentId
                },
                timestamp: Date.now()
              }));
            }, 1000);
            break;
            
          case 'client_ready_response':
            console.log('✅ Client ready response received');
            console.log('🤖 Agent sections:', message.data.agent.sections.length);
            console.log('👤 User info:', message.data.userInfo);
            message.data.agent.sections.forEach((section, index) => {
              console.log(`  Section ${index + 1}: ${section.name} (${section.intents.length} intents)`);
            });
            step++;
            
            // Step 3: Simulate conversation completion
            setTimeout(() => {
              console.log('\n📤 Step 3: Sending conversation completed data');
              ws.send(JSON.stringify({
                type: 'conversation_completed',
                sessionId: TEST_CONFIG.sessionId,
                data: {
                  completedFields: {
                    name: 'Test User',
                    age: 25,
                    lifestyle: 'Walking',
                    frequency: 'Daily',
                    mealType: 'breakfast',
                    foodItems: ['oatmeal', 'banana', 'milk']
                  },
                  conversationHistory: [
                    { speaker: 'agent', text: 'Hello! What\'s your name?' },
                    { speaker: 'user', text: 'My name is Test User' },
                    { speaker: 'agent', text: 'Nice to meet you, Test User! How old are you?' },
                    { speaker: 'user', text: 'I\'m 25 years old' }
                  ],
                  agentId: 'ameya_diet_tracker'
                },
                timestamp: Date.now()
              }));
            }, 1000);
            break;
            
          case 'status':
            console.log('📊 Status:', message.data.message);
            step++;
            break;
            
          case 'error':
            console.error('❌ Error:', message.data.message);
            step++;
            break;
            
          default:
            console.log('📡 Unknown message type:', message.type);
        }
        
        // Check if we've completed all steps
        if (step >= maxSteps) {
          console.log('\n✅ Test completed successfully!');
          ws.close();
          resolve();
        }
        
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        reject(error);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      if (step < maxSteps) {
        console.log('⚠️ Test ended prematurely');
        reject(new Error('Test ended prematurely'));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      console.log('⏰ Test timeout');
      ws.close();
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

// Run the test
testIntentBasedFlow()
  .then(() => {
    console.log('\n🎉 Intent-based implementation test PASSED!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Intent-based implementation test FAILED:', error.message);
    process.exit(1);
  }); 