const { AIService } = require('../dist/services/aiService');
const { Config } = require('../dist/config/config');

async function testAIProviders() {
  console.log('🧪 Testing AI Providers...\n');

  try {
    // Test with Gemini
    console.log('🔍 Testing Gemini AI...');
    process.env.AI_PROVIDER = 'gemini';
    const geminiService = new AIService();
    
    const geminiResponse = await geminiService.processMessage(
      'Hello, what should I eat for breakfast?',
      [],
      'TestUser'
    );
    
    console.log('✅ Gemini Response:', geminiResponse.text.substring(0, 100) + '...');
    console.log('Provider used: Gemini\n');

  } catch (error) {
    console.error('❌ Gemini test failed:', error.message);
  }

  try {
    // Test with OpenAI
    console.log('🔍 Testing OpenAI...');
    process.env.AI_PROVIDER = 'openai';
    const openaiService = new AIService();
    
    const openaiResponse = await openaiService.processMessage(
      'Hello, what should I eat for breakfast?',
      [],
      'TestUser'
    );
    
    console.log('✅ OpenAI Response:', openaiResponse.text.substring(0, 100) + '...');
    console.log('Provider used: OpenAI\n');

  } catch (error) {
    console.error('❌ OpenAI test failed:', error.message);
  }

  console.log('🎉 AI Provider testing completed!');
}

// Run the test
testAIProviders().catch(console.error); 