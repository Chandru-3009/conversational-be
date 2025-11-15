# Migration Guide: ElevenLabs to Google TTS

This guide helps you migrate from ElevenLabs Text-to-Speech to Google Cloud Text-to-Speech.

## Why Migrate to Google TTS?

### Advantages of Google TTS
- **Cost-effective**: Generally more affordable for high-volume usage
- **High-quality voices**: Excellent natural-sounding speech synthesis
- **Multiple voice options**: Wide variety of voices and languages
- **Reliable infrastructure**: Google's highly reliable and scalable platform
- **Voice cloning**: Support for custom voice cloning (premium feature)
- **SSML support**: Advanced speech synthesis markup language support

### Cost Comparison
- **ElevenLabs**: Pay-per-character with monthly limits
- **Google TTS**: Pay-per-character with generous free tier (4M characters/month)

## Migration Steps

### 1. Set Up Google Cloud Project

1. **Create Google Cloud Project**
   ```bash
   # Install gcloud CLI (if not already installed)
   # https://cloud.google.com/sdk/docs/install
   
   # Create new project
   gcloud projects create your-nutrina-project
   
   # Set as default project
   gcloud config set project your-nutrina-project
   ```

2. **Enable Text-to-Speech API**
   ```bash
   gcloud services enable texttospeech.googleapis.com
   ```

3. **Set up authentication**
   ```bash
   # Option A: Use gcloud CLI (recommended for development)
   gcloud auth application-default login
   
   # Option B: Create service account (recommended for production)
   gcloud iam service-accounts create nutrina-tts \
     --display-name="Nutrina TTS Service Account"
   
   gcloud projects add-iam-policy-binding your-nutrina-project \
     --member="serviceAccount:nutrina-tts@your-nutrina-project.iam.gserviceaccount.com" \
     --role="roles/cloudtts.admin"
   
   gcloud iam service-accounts keys create nutrina-tts-key.json \
     --iam-account=nutrina-tts@your-nutrina-project.iam.gserviceaccount.com
   ```

### 2. Update Environment Variables

**Before (ElevenLabs):**
```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id
TTS_PROVIDER=elevenlabs
```

**After (Google TTS):**
```env
# Remove or comment out ElevenLabs config
# ELEVENLABS_API_KEY=your_elevenlabs_api_key
# ELEVENLABS_VOICE_ID=your_voice_id

# Add Google TTS config
TTS_PROVIDER=google
GOOGLE_CLOUD_PROJECT_ID=your-nutrina-project

# Option A: Using gcloud CLI (leave empty)
GOOGLE_APPLICATION_CREDENTIALS=

# Option B: Using service account key
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"your-nutrina-project",...}

# Voice configuration
GOOGLE_TTS_VOICE_NAME=en-US-Chirp3-HD-Aoede
GOOGLE_TTS_LANGUAGE_CODE=en-US
GOOGLE_TTS_AUDIO_ENCODING=MP3
```

### 3. Install Dependencies

```bash
# Remove ElevenLabs dependency
npm uninstall @elevenlabs/elevenlabs-js

# Install Google TTS dependency
npm install @google-cloud/text-to-speech

# Rebuild the project
npm run build
```

### 4. Test the Migration

```bash
# Test Google TTS functionality
npm run test:tts

# Start the development server
npm run dev
```

### 5. Voice Mapping

Here's a mapping of popular ElevenLabs voices to Google TTS equivalents:

| ElevenLabs Voice | Google TTS Voice | Description |
|------------------|------------------|-------------|
| Rachel | en-US-Chirp3-HD-Aoede | Natural, friendly female |
| Domi | en-US-Neural2-F | Clear, professional female |
| Bella | en-US-Studio-F | Warm, conversational female |
| Antoni | en-US-Neural2-M | Clear, professional male |
| Josh | en-US-Studio-M | Warm, conversational male |

### 6. Update Configuration

The application automatically detects the TTS provider based on the `TTS_PROVIDER` environment variable. No code changes are required.

## Voice Configuration Options

### Popular Google TTS Voices

**Female Voices:**
- `en-US-Chirp3-HD-Aoede` - Natural, friendly (recommended)
- `en-US-Neural2-F` - Clear, professional
- `en-US-Studio-F` - Warm, conversational
- `en-US-Wavenet-F` - High-quality neural voice

**Male Voices:**
- `en-US-Neural2-M` - Clear, professional
- `en-US-Studio-M` - Warm, conversational
- `en-US-Wavenet-M` - High-quality neural voice

### Audio Encoding Options

- `MP3` - Compressed, smaller files (recommended)
- `LINEAR16` - Uncompressed, larger files
- `OGG_OPUS` - Modern codec, good quality/size ratio

### Language Support

Google TTS supports 380+ voices across 50+ languages. Change `GOOGLE_TTS_LANGUAGE_CODE` to:

- `en-US` - US English
- `en-GB` - British English
- `es-ES` - Spanish
- `fr-FR` - French
- `de-DE` - German
- `ja-JP` - Japanese
- `ko-KR` - Korean
- `zh-CN` - Chinese (Simplified)

## Troubleshooting

### Common Issues

**Authentication Error**
```bash
# Error: Google Cloud authentication failed
# Solution: Run gcloud auth
gcloud auth application-default login
```

**API Not Enabled**
```bash
# Error: API not enabled
# Solution: Enable the API
gcloud services enable texttospeech.googleapis.com
```

**Voice Not Found**
```bash
# Error: Voice not found
# Solution: Check available voices
npm run test:tts
```

**Project ID Mismatch**
```bash
# Error: Project not found
# Solution: Verify project ID
gcloud config get-value project
```

### Performance Optimization

1. **Enable caching** (already configured)
   ```env
   ENABLE_AI_CACHING=true
   ```

2. **Adjust timeouts**
   ```env
   TTS_TIMEOUT=15000
   TTS_RETRY_ATTEMPTS=3
   ```

3. **Use appropriate voice**
   - Neural voices: Better quality, slower
   - Standard voices: Faster, good quality

## Rollback Plan

If you need to rollback to ElevenLabs:

1. **Update environment variables**
   ```env
   TTS_PROVIDER=elevenlabs
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_VOICE_ID=your_voice_id
   ```

2. **Reinstall ElevenLabs dependency**
   ```bash
   npm install @elevenlabs/elevenlabs-js
   npm uninstall @google-cloud/text-to-speech
   ```

3. **Restart the application**
   ```bash
   npm run dev
   ```

## Cost Analysis

### Google TTS Pricing (as of 2024)
- **Free tier**: 4M characters/month
- **Standard voices**: $4.00 per 1M characters
- **Neural voices**: $16.00 per 1M characters
- **WaveNet voices**: $16.00 per 1M characters

### Example Usage
- 100 conversations/day × 500 characters = 50K characters/day
- Monthly usage: 1.5M characters
- Cost: Free (within free tier)

## Support

For migration support:
1. Check the troubleshooting section above
2. Run the test script: `npm run test:tts`
3. Review Google Cloud documentation
4. Create an issue on GitHub

## Next Steps

After successful migration:
1. Test with different voice options
2. Optimize SSML for better speech quality
3. Monitor usage and costs
4. Consider voice cloning for brand consistency 