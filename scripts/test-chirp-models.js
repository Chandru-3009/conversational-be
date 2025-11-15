const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
require('dotenv').config();

async function testChirpModels() {
  console.log('🔍 Testing Google Cloud TTS Chirp Models...\n');

  // Initialize client
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!projectId) {
    console.error('❌ GOOGLE_CLOUD_PROJECT_ID is required');
    return;
  }

  const clientConfig = { projectId };
  
  if (credentials) {
    try {
      const credentialsObj = JSON.parse(credentials);
      clientConfig.credentials = credentialsObj;
    } catch (error) {
      console.warn('⚠️ Failed to parse credentials, using default authentication');
    }
  }

  const client = new TextToSpeechClient(clientConfig);

  try {
    // Get all available voices
    console.log('📋 Fetching all available voices...');
    const [voicesResponse] = await client.listVoices({});
    const allVoices = voicesResponse.voices || [];

    // Filter for Chirp models
    const chirpVoices = allVoices.filter(voice => 
      voice.name && voice.name.includes('Chirp')
    );

    console.log(`\n🎵 Found ${chirpVoices.length} Chirp voices:\n`);

    // Group by language
    const voicesByLanguage = {};
    chirpVoices.forEach(voice => {
      const languageCodes = voice.languageCodes || [];
      languageCodes.forEach(lang => {
        if (!voicesByLanguage[lang]) {
          voicesByLanguage[lang] = [];
        }
        voicesByLanguage[lang].push(voice);
      });
    });

    // Display Chirp voices by language
    Object.keys(voicesByLanguage).sort().forEach(language => {
      console.log(`🌍 ${language}:`);
      voicesByLanguage[language].forEach(voice => {
        const ssmlGender = voice.ssmlGender || 'UNSPECIFIED';
        const naturalSampleRateHertz = voice.naturalSampleRateHertz || 'Unknown';
        console.log(`  • ${voice.name} (${ssmlGender}, ${naturalSampleRateHertz}Hz)`);
      });
      console.log('');
    });

    // Test specific Chirp models
    const testText = "Hello! This is a test of the latest Chirp voice models from Google Cloud Text-to-Speech.";
    const testVoices = [
      'en-US-Chirp3-HD-Aoede',
      'en-US-Chirp3-HD-Aoede-Studio',
      'en-US-Chirp3-HD-Aoede-Studio-Enhanced',
      'en-US-Chirp3-HD-Aoede-Studio-Enhanced-24k',
      'en-US-Chirp3-HD-Aoede-Studio-Enhanced-48k'
    ];

    console.log('🧪 Testing specific Chirp models...\n');

    for (const voiceName of testVoices) {
      try {
        console.log(`🎵 Testing ${voiceName}...`);
        
        const request = {
          input: { text: testText },
          voice: {
            languageCode: 'en-US',
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0,
            effectsProfileId: ['headphone-class-device']
          }
        };

        const [response] = await client.synthesizeSpeech(request);
        
        if (response.audioContent) {
          const audioSize = response.audioContent.length;
          console.log(`  ✅ Success! Audio size: ${audioSize} bytes`);
        } else {
          console.log(`  ❌ No audio content received`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // Test with SSML
    console.log('\n🎵 Testing Chirp with SSML...\n');
    
    const ssmlText = `<speak>
      <prosody rate="medium">
        Hello! This is a test of Chirp voice models with SSML formatting. 
        <break time="500ms"/>
        The voice should sound natural and expressive.
      </prosody>
    </speak>`;

    try {
      const request = {
        input: { ssml: ssmlText },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Chirp3-HD-Aoede',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0,
          effectsProfileId: ['headphone-class-device']
        }
      };

      const [response] = await client.synthesizeSpeech(request);
      
      if (response.audioContent) {
        const audioSize = response.audioContent.length;
        console.log(`✅ SSML test successful! Audio size: ${audioSize} bytes`);
      } else {
        console.log(`❌ SSML test failed - no audio content`);
      }
      
    } catch (error) {
      console.log(`❌ SSML test error: ${error.message}`);
    }

    // Recommendations
    console.log('\n📋 Chirp Model Recommendations:\n');
    console.log('🎯 For Production Use:');
    console.log('  • en-US-Chirp3-HD-Aoede (Standard HD quality)');
    console.log('  • en-US-Chirp3-HD-Aoede-Studio (Enhanced quality)');
    console.log('  • en-US-Chirp3-HD-Aoede-Studio-Enhanced (Best quality)');
    console.log('\n🎯 For High-Fidelity Audio:');
    console.log('  • en-US-Chirp3-HD-Aoede-Studio-Enhanced-24k (24kHz sample rate)');
    console.log('  • en-US-Chirp3-HD-Aoede-Studio-Enhanced-48k (48kHz sample rate)');
    
    console.log('\n💡 Configuration Tips:');
    console.log('  • Use MP3 encoding for web applications');
    console.log('  • Enable SSML for better speech control');
    console.log('  • Use headphone-class-device effects profile for better audio quality');

  } catch (error) {
    console.error('❌ Error testing Chirp models:', error);
  }
}

// Run the test
testChirpModels().catch(console.error); 