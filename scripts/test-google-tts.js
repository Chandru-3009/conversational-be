#!/usr/bin/env node

/**
 * Test script for Google TTS functionality
 * Run with: node scripts/test-google-tts.js
 */

const dotenv = require('dotenv');
dotenv.config();

const { GoogleTTSService } = require('../dist/services/googleTTSService');

async function testGoogleTTS() {
  console.log('🧪 Testing Google TTS Service...');
  
  const ttsService = new GoogleTTSService();
  
  const testText = "Hello! This is a test of the Google Text-to-Speech service. How are you doing today?";
  
  try {
    console.log('\n📝 Test 1: SSML Mode (default)');
    console.log('Setting GOOGLE_TTS_USE_SSML=true');
    process.env.GOOGLE_TTS_USE_SSML = 'true';
    
    const ssmlResult = await ttsService.textToSpeech(testText);
    console.log('✅ SSML mode successful');
    console.log(`Audio generated: ${ssmlResult.audio.length} bytes`);
    console.log(`Duration: ${ssmlResult.duration}ms`);
    
  } catch (error) {
    console.error('❌ SSML mode failed:', error.message);
  }
  
  try {
    console.log('\n📝 Test 2: Plain Text Mode');
    console.log('Setting GOOGLE_TTS_USE_SSML=false');
    process.env.GOOGLE_TTS_USE_SSML = 'false';
    
    const plainTextResult = await ttsService.textToSpeech(testText);
    console.log('✅ Plain text mode successful');
    console.log(`Audio generated: ${plainTextResult.audio.length} bytes`);
    console.log(`Duration: ${plainTextResult.duration}ms`);
    
  } catch (error) {
    console.error('❌ Plain text mode failed:', error.message);
  }
  
  console.log('\n🏁 Test completed');
}

testGoogleTTS().catch(console.error); 