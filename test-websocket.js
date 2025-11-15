const WebSocket = require('ws');

const ws = new WebSocket('ws://34.139.138.247/ws?sessionId=test-123&userEmail=test@example.com');

ws.on('open', function open() {
  console.log('✅ WebSocket connection opened');
  
  // Send a test message after 2 seconds
  setTimeout(() => {
    console.log('📤 Sending test message...');
    ws.send(JSON.stringify({
      type: 'text_message',
      data: 'Hello, this is a test message'
    }));
  }, 2000);
});

ws.on('message', function message(data) {
  console.log('📥 Received message:', data.toString());
  
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 Parsed message:', parsed);
  } catch (e) {
    console.log('📥 Raw message:', data.toString());
  }
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket connection closed - Code:', code, 'Reason:', reason);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

// Keep the script running
setTimeout(() => {
  console.log('⏰ Test completed, closing connection...');
  ws.close();
  process.exit(0);
}, 10000); 