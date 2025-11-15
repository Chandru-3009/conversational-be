const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3001';
const TEST_EMAIL = 'test@example.com';

async function testGreetingFix() {
  console.log('🧪 Testing Greeting Fix...\n');

  // Test 1: Single greeting request
  console.log('📋 Test 1: Single greeting request');
  await testSingleGreeting();

  // Test 2: Multiple rapid requests (should be rate limited)
  console.log('\n📋 Test 2: Multiple rapid requests');
  await testRapidRequests();

  // Test 3: Retry after rate limit
  console.log('\n📋 Test 3: Retry after rate limit');
  await testRetryAfterRateLimit();

  console.log('\n✅ All tests completed!');
}

async function testSingleGreeting() {
  return new Promise((resolve) => {
    const sessionId = 'test-single-' + Date.now();
    const wsUrl = `${WS_URL}?sessionId=${sessionId}&userEmail=${encodeURIComponent(TEST_EMAIL)}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected for single greeting test');
      
      // Send greeting request
      ws.send(JSON.stringify({
        type: 'text_message',
        data: '!request_greeting',
        timestamp: Date.now()
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'audio') {
          console.log('✅ Single greeting successful:', message.data.text.substring(0, 100) + '...');
          ws.close();
          resolve();
        } else if (message.type === 'error') {
          console.log('❌ Single greeting failed:', message.data.message);
          ws.close();
          resolve();
        }
      } catch (error) {
        console.error('❌ Failed to parse message:', error.message);
        ws.close();
        resolve();
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      resolve();
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('⏰ Single greeting test timeout');
      ws.close();
      resolve();
    }, 10000);
  });
}

async function testRapidRequests() {
  return new Promise((resolve) => {
    const sessionId = 'test-rapid-' + Date.now();
    const wsUrl = `${WS_URL}?sessionId=${sessionId}&userEmail=${encodeURIComponent(TEST_EMAIL)}`;
    
    const ws = new WebSocket(wsUrl);
    let requestCount = 0;
    let rateLimitedCount = 0;
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected for rapid requests test');
      
      // Send multiple rapid requests
      const sendRequest = () => {
        if (requestCount < 3) {
          ws.send(JSON.stringify({
            type: 'text_message',
            data: '!request_greeting',
            timestamp: Date.now()
          }));
          requestCount++;
          
          // Send next request after 1 second
          setTimeout(sendRequest, 1000);
        }
      };
      
      sendRequest();
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'audio') {
          console.log('✅ Greeting received');
        } else if (message.type === 'error') {
          if (message.data.message.includes('wait a moment')) {
            rateLimitedCount++;
            console.log(`⏰ Rate limited (${rateLimitedCount}/3)`);
          } else {
            console.log('❌ Unexpected error:', message.data.message);
          }
        }
        
        // Close after receiving 3 responses or timeout
        if (rateLimitedCount >= 2 || requestCount >= 3) {
          ws.close();
          resolve();
        }
      } catch (error) {
        console.error('❌ Failed to parse message:', error.message);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      resolve();
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      console.log('⏰ Rapid requests test timeout');
      ws.close();
      resolve();
    }, 15000);
  });
}

async function testRetryAfterRateLimit() {
  return new Promise((resolve) => {
    const sessionId = 'test-retry-' + Date.now();
    const wsUrl = `${WS_URL}?sessionId=${sessionId}&userEmail=${encodeURIComponent(TEST_EMAIL)}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected for retry test');
      
      // Send first request
      ws.send(JSON.stringify({
        type: 'text_message',
        data: '!request_greeting',
        timestamp: Date.now()
      }));
      
      // Wait 6 seconds (longer than rate limit) then send another
      setTimeout(() => {
        console.log('🔄 Sending second request after rate limit period...');
        ws.send(JSON.stringify({
          type: 'text_message',
          data: '!request_greeting',
          timestamp: Date.now()
        }));
      }, 6000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'audio') {
          console.log('✅ Retry greeting successful:', message.data.text.substring(0, 100) + '...');
          ws.close();
          resolve();
        } else if (message.type === 'error') {
          console.log('❌ Retry greeting failed:', message.data.message);
          ws.close();
          resolve();
        }
      } catch (error) {
        console.error('❌ Failed to parse message:', error.message);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      resolve();
    });

    // Timeout after 20 seconds
    setTimeout(() => {
      console.log('⏰ Retry test timeout');
      ws.close();
      resolve();
    }, 20000);
  });
}

// Run the test
testGreetingFix().catch(console.error); 