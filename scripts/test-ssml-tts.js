const dotenv = require('dotenv');
dotenv.config();

const { GoogleTTSService } = require('../dist/services/googleTTSService');

async function testSSMLTTS() {
  console.log('🧪 Testing SSML TTS Processing...');
  
  const ttsService = new GoogleTTSService();
  
  // Test 1: Plain text input
  const plainText = "Hello, this is a test of plain text.";
  
  // Test 2: SSML input (what the AI should generate)
  const ssmlText = '<speak><prosody rate="medium" pitch="+2%">Oh, eggs and toast! <break time="200ms"/> That\'s a classic breakfast combo. <emphasis level="moderate">How many eggs</emphasis> did you have? <break time="150ms"/> And what kind of bread was it?</prosody></speak>';
  
  try {
    console.log('\n📝 Test 1: Plain Text Input');
    console.log('Input:', plainText);
    const plainResult = await ttsService.textToSpeech(plainText);
    console.log('✅ Plain text processed successfully');
    console.log(`Audio generated: ${plainResult.audio.length} bytes`);
    
  } catch (error) {
    console.error('❌ Plain text test failed:', error.message);
  }
  
  try {
    console.log('\n📝 Test 2: SSML Input (AI Generated)');
    console.log('Input:', ssmlText);
    const ssmlResult = await ttsService.textToSpeech(ssmlText);
    console.log('✅ SSML processed successfully');
    console.log(`Audio generated: ${ssmlResult.audio.length} bytes`);
    
  } catch (error) {
    console.error('❌ SSML test failed:', error.message);
  }
  
  console.log('\n🏁 Test completed');
}

testSSMLTTS().catch(console.error); 