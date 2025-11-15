# Chirp Models Guide for Nutrina

## 🎵 What are Chirp Models?

Chirp models are Google's latest and most advanced text-to-speech voices, offering:

- **Natural Sounding**: More human-like speech with better intonation and rhythm
- **High Quality**: 24kHz sample rate for crisp, clear audio
- **Multiple Languages**: Available in 50+ languages and variants
- **Emotional Range**: Better expression and natural pauses
- **Studio Quality**: Professional-grade voice synthesis

## 🚀 Latest Chirp3 Models Available

Based on our testing, here are the available Chirp3 models for different languages:

### 🌍 English (US) - en-US
- `en-US-Chirp3-HD-Aoede` (FEMALE) - **Recommended for Nutrina**
- `en-US-Chirp3-HD-Achird` (MALE)
- `en-US-Chirp3-HD-Algenib` (MALE)
- `en-US-Chirp3-HD-Algieba` (MALE)
- `en-US-Chirp3-HD-Alnilam` (MALE)
- `en-US-Chirp3-HD-Autonoe` (FEMALE)
- `en-US-Chirp3-HD-Callirrhoe` (FEMALE)
- `en-US-Chirp3-HD-Charon` (MALE)
- `en-US-Chirp3-HD-Despina` (FEMALE)
- `en-US-Chirp3-HD-Enceladus` (MALE)
- `en-US-Chirp3-HD-Erinome` (FEMALE)
- `en-US-Chirp3-HD-Fenrir` (MALE)
- `en-US-Chirp3-HD-Gacrux` (FEMALE)
- `en-US-Chirp3-HD-Iapetus` (MALE)
- `en-US-Chirp3-HD-Kore` (FEMALE)
- `en-US-Chirp3-HD-Laomedeia` (FEMALE)
- `en-US-Chirp3-HD-Leda` (FEMALE)
- `en-US-Chirp3-HD-Orus` (MALE)
- `en-US-Chirp3-HD-Puck` (MALE)
- `en-US-Chirp3-HD-Pulcherrima` (FEMALE)
- `en-US-Chirp3-HD-Rasalgethi` (MALE)
- `en-US-Chirp3-HD-Sadachbia` (MALE)
- `en-US-Chirp3-HD-Sadaltager` (MALE)
- `en-US-Chirp3-HD-Schedar` (MALE)
- `en-US-Chirp3-HD-Sulafat` (FEMALE)
- `en-US-Chirp3-HD-Umbriel` (MALE)
- `en-US-Chirp3-HD-Vindemiatrix` (FEMALE)
- `en-US-Chirp3-HD-Zephyr` (FEMALE)
- `en-US-Chirp3-HD-Zubenelgenubi` (MALE)

### 🌍 Other Languages
The same voice names are available for other languages:
- **British English**: `en-GB-Chirp3-HD-Aoede`
- **Australian English**: `en-AU-Chirp3-HD-Aoede`
- **Spanish**: `es-ES-Chirp3-HD-Aoede`, `es-US-Chirp3-HD-Aoede`
- **French**: `fr-FR-Chirp3-HD-Aoede`, `fr-CA-Chirp3-HD-Aoede`
- **German**: `de-DE-Chirp3-HD-Aoede`
- **Italian**: `it-IT-Chirp3-HD-Aoede`
- **Portuguese**: `pt-BR-Chirp3-HD-Aoede`
- **Japanese**: `ja-JP-Chirp3-HD-Aoede`
- **Korean**: `ko-KR-Chirp3-HD-Aoede`
- **Chinese**: `zh-CN-Chirp3-HD-Aoede`
- **And many more...**

## ⚙️ Configuration

### Environment Variables

Update your `.env` file to use Chirp models:

```env
# TTS Provider Configuration
TTS_PROVIDER=google

# Google Cloud TTS Configuration
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
GOOGLE_APPLICATION_CREDENTIALS=your_credentials_here

# Chirp Voice Configuration
GOOGLE_TTS_VOICE_NAME=en-US-Chirp3-HD-Aoede
GOOGLE_TTS_LANGUAGE_CODE=en-US
GOOGLE_TTS_AUDIO_ENCODING=MP3
GOOGLE_TTS_USE_SSML=false  # Chirp voices don't support SSML
```

### Voice Selection

Choose your preferred voice by changing `GOOGLE_TTS_VOICE_NAME`:

```env
# For a warm, friendly female voice (recommended for Nutrina)
GOOGLE_TTS_VOICE_NAME=en-US-Chirp3-HD-Aoede

# For a professional male voice
GOOGLE_TTS_VOICE_NAME=en-US-Chirp3-HD-Achird

# For a different language
GOOGLE_TTS_VOICE_NAME=es-ES-Chirp3-HD-Aoede  # Spanish
GOOGLE_TTS_VOICE_NAME=fr-FR-Chirp3-HD-Aoede  # French
```

## 🔧 Technical Implementation

### Chirp-Specific Features

The updated `GoogleTTSService` automatically:

1. **Detects Chirp voices** by checking if the voice name contains "Chirp"
2. **Uses plain text** instead of SSML (Chirp voices don't support SSML)
3. **Extracts text from SSML** if the AI response contains SSML markup
4. **Optimizes audio settings** for Chirp voices

### Audio Configuration

Chirp voices work best with these settings:

```typescript
audioConfig: {
  audioEncoding: 'MP3',
  speakingRate: 1.0,        // Normal speed
  pitch: 0.0,               // Normal pitch
  volumeGainDb: 0.0,        // Normal volume
  effectsProfileId: ['headphone-class-device']  // Optimize for headphones
}
```

## 🧪 Testing Chirp Models

Use the included test script to discover and test Chirp models:

```bash
# Test all available Chirp models
node scripts/test-chirp-models.js

# Test specific voice
npm run test:tts
```

## 📊 Performance Comparison

| Feature | Chirp3 Models | Neural2 Models | Standard Models |
|---------|---------------|----------------|-----------------|
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Naturalness** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **SSML Support** | ❌ | ✅ | ✅ |
| **Sample Rate** | 24kHz | 24kHz | 16kHz |
| **Processing Speed** | Fast | Medium | Fast |
| **Cost** | Standard | Standard | Lower |

## 🎯 Recommendations for Nutrina

### Best Voice Choices

1. **Primary Recommendation**: `en-US-Chirp3-HD-Aoede`
   - Warm, friendly female voice
   - Perfect for conversational AI
   - Natural intonation for questions and responses

2. **Alternative Female Voices**:
   - `en-US-Chirp3-HD-Autonoe` - Slightly different tone
   - `en-US-Chirp3-HD-Callirrhoe` - More energetic
   - `en-US-Chirp3-HD-Kore` - Professional but warm

3. **Male Voice Options**:
   - `en-US-Chirp3-HD-Achird` - Professional male voice
   - `en-US-Chirp3-HD-Charon` - Deep, authoritative
   - `en-US-Chirp3-HD-Fenrir` - Friendly male voice

### Configuration Tips

1. **Set SSML to false**: Chirp voices don't support SSML
   ```env
   GOOGLE_TTS_USE_SSML=false
   ```

2. **Use MP3 encoding**: Best balance of quality and file size
   ```env
   GOOGLE_TTS_AUDIO_ENCODING=MP3
   ```

3. **Optimize for headphones**: Better audio quality
   ```typescript
   effectsProfileId: ['headphone-class-device']
   ```

## 🔄 Migration from Neural2

If you're currently using Neural2 voices, the migration is seamless:

1. **Update voice name**:
   ```env
   # Before
   GOOGLE_TTS_VOICE_NAME=en-US-Neural2-F
   
   # After
   GOOGLE_TTS_VOICE_NAME=en-US-Chirp3-HD-Aoede
   ```

2. **Disable SSML** (if using Chirp):
   ```env
   GOOGLE_TTS_USE_SSML=false
   ```

3. **Test the new voice**:
   ```bash
   npm run test:tts
   ```

## 🚨 Important Notes

### Chirp Limitations

1. **No SSML Support**: Chirp voices don't support SSML markup
2. **Plain Text Only**: All input must be plain text
3. **No Custom Prosody**: Can't control speech rate, pitch, or volume via SSML

### Fallback Behavior

The system automatically:
- Detects Chirp voices and switches to plain text mode
- Extracts text from SSML responses for Chirp voices
- Falls back to Neural2 if Chirp voices are unavailable
- Provides clear error messages for unsupported features

## 🎉 Benefits for Nutrina

Using Chirp models provides:

1. **Better User Experience**: More natural, human-like responses
2. **Improved Engagement**: Users feel more connected to the AI
3. **Professional Quality**: Studio-grade voice synthesis
4. **Language Support**: Available in 50+ languages
5. **Future-Proof**: Latest Google TTS technology

## 📞 Support

If you encounter issues with Chirp models:

1. **Check voice availability**: Run the test script
2. **Verify credentials**: Ensure Google Cloud access
3. **Check language codes**: Match voice name with language code
4. **Review logs**: Check for specific error messages

The Chirp models represent the cutting edge of text-to-speech technology and will significantly enhance the Nutrina user experience! 