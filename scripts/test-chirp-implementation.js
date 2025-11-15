const { GoogleTTSService } = require('../dist/services/googleTTSService');
require('dotenv').config();

async function testChirpImplementation() {
  console.log('🧪 Testing Chirp Implementation...\n');

  try {
    // Initialize the service
    const ttsService = new GoogleTTSService();
    
    console.log('✅ Google TTS Service initialized successfully');
    console.log(`🎵 Using voice: ${ttsService.constructor.name}`);
    
    // Test 1: Plain text
    console.log('\n📝 Test 1: Plain text input');
    const plainText = "Hello! This is a test of the Chirp voice models. How are you today?";
    
    try {
      const result1 = await ttsService.textToSpeech(plainText);
      console.log(`✅ Plain text test successful! Audio size: ${result1.audio.length} bytes`);
      console.log(`⏱️ Estimated duration: ${result1.duration}ms`);
    } catch (error) {
      console.error(`❌ Plain text test failed: ${error.message}`);
    }

    // Test 2: SSML input (should be converted to plain text for Chirp)
    console.log('\n📝 Test 2: SSML input (should be converted to plain text)');
    const ssmlText = `<speak>
      <prosody rate="medium">
        Hello! This is a test of SSML conversion for Chirp voices. 
        <break time="500ms"/>
        The system should automatically convert this to plain text.
      </prosody>
    </speak>`;
    
    try {
      const result2 = await ttsService.textToSpeech(ssmlText);
      console.log(`✅ SSML conversion test successful! Audio size: ${result2.audio.length} bytes`);
      console.log(`⏱️ Estimated duration: ${result2.duration}ms`);
    } catch (error) {
      console.error(`❌ SSML conversion test failed: ${error.message}`);
    }

    // Test 3: Long text
    console.log('\n📝 Test 3: Long text input');
    const longText = "This is a longer test to ensure the Chirp voice can handle extended conversations. " +
                    "It should process this text naturally and maintain good quality throughout the entire response. " +
                    "The voice should sound warm and engaging, perfect for a diet tracking assistant like Nutrina.";
    
    try {
      const result3 = await ttsService.textToSpeech(longText);
      console.log(`✅ Long text test successful! Audio size: ${result3.audio.length} bytes`);
      console.log(`⏱️ Estimated duration: ${result3.duration}ms`);
    } catch (error) {
      console.error(`❌ Long text test failed: ${error.message}`);
    }

    // Test 4: Question format (typical for Nutrina)
    console.log('\n📝 Test 4: Question format (Nutrina-style)');
    const questionText = "What did you have for breakfast today? I'd love to help you track your meal.";
    
    try {
      const result4 = await ttsService.textToSpeech(questionText);
      console.log(`✅ Question format test successful! Audio size: ${result4.audio.length} bytes`);
      console.log(`⏱️ Estimated duration: ${result4.duration}ms`);
    } catch (error) {
      console.error(`❌ Question format test failed: ${error.message}`);
    }

    console.log('\n🎉 All Chirp implementation tests completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Update your .env file with: GOOGLE_TTS_VOICE_NAME=en-US-Chirp3-HD-Aoede');
    console.log('2. Set GOOGLE_TTS_USE_SSML=false for Chirp voices');
    console.log('3. Test with your Nutrina application');
    console.log('4. Enjoy the improved voice quality!');

  } catch (error) {
    console.error('❌ Chirp implementation test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your Google Cloud credentials');
    console.log('2. Verify your project ID is correct');
    console.log('3. Ensure the Text-to-Speech API is enabled');
    console.log('4. Check the CHIRP_MODELS_GUIDE.md for configuration details');
  }
}

// Run the test
testChirpImplementation().catch(console.error); 