# Performance Optimization Guide

## Current Performance Targets
- **Total Processing Time**: < 4000ms (4 seconds)
- **STT Processing**: < 2000ms
- **AI Processing**: < 2000ms  
- **TTS Processing**: < 1500ms

## Implemented Optimizations

### 1. AI Service Optimizations
- **Balanced Token Limits**: `AI_MAX_TOKENS` set to 120 (balanced for engagement and speed)
- **Optimal Temperature**: `AI_TEMPERATURE` set to 0.4 (balanced for creativity and consistency)
- **Faster Generation**: Optimized `topK` to 15 and `topP` to 0.6
- **Response Caching**: Enable with `ENABLE_AI_CACHING=true`
- **Timeout Protection**: `AI_TIMEOUT` set to 2500ms
- **Engaging Prompts**: Maintain conversation history limit of 4 messages
- **Follow-up Questions**: AI instructed to ask about quantities and portions
- **Friendly Tone**: Maintains emojis and encouraging language

### 2. Audio Service Optimizations
- **STT Timeout**: `STT_TIMEOUT` set to 3000ms
- **TTS Timeout**: `TTS_TIMEOUT` set to 2000ms
- **Faster Voice Settings**: Reduced stability and similarity boost to 0.2
- **Optimized STT Settings**: Disabled audio event tagging and diarization

### 3. Parallel Processing
- **Database Operations**: All database writes are now non-blocking
- **TTS Parallelization**: Enable with `ENABLE_PARALLEL_PROCESSING=true`
- **Concurrent Operations**: TTS starts while database updates happen

### 4. Configuration Settings

```bash
# Performance Mode
ENABLE_PERFORMANCE_MODE=true

# AI Optimizations
AI_MAX_TOKENS=120
AI_TEMPERATURE=0.4
CONVERSATION_HISTORY_LIMIT=4
ENABLE_AI_CACHING=true
AI_TIMEOUT=2500

# Audio Optimizations
STT_TIMEOUT=3000
TTS_TIMEOUT=2000
ENABLE_PARALLEL_PROCESSING=true

# TTS Settings
TTS_MODEL=eleven_monolingual_v1
TTS_OUTPUT_FORMAT=mp3_44100_32
```

## Performance Monitoring

The system now provides detailed performance insights:

```
✅ Total audio processing completed in 6893ms (STT: 2854ms, AI: 2989ms, TTS: 1046ms)
🚀 Performance Mode: Total time 6893ms (Target: <4000ms)
⚠️  Performance warning: Processing took 6893ms (above 4s threshold)
💡 STT optimization suggestion: Consider reducing audio quality or using faster STT model
💡 AI optimization suggestion: Consider reducing token limits or enabling caching
💡 TTS optimization suggestion: Consider using faster voice settings or enabling parallel processing
```

## Expected Performance Improvements

With all optimizations enabled:

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| STT | 2854ms | ~2000ms | ~30% faster |
| AI | 2989ms | ~2200ms | ~26% faster |
| TTS | 1046ms | ~800ms | ~25% faster |
| **Total** | **6893ms** | **~4500ms** | **~35% faster** |

**Note**: AI processing time is slightly higher to maintain engaging, follow-up questions while still being significantly faster than the original implementation.

## Additional Optimization Strategies

### 1. Audio Quality Reduction
```bash
# Reduce audio sample rate for faster processing
AUDIO_SAMPLE_RATE=8000  # Instead of 16000
```

### 2. Model Selection
```bash
# Use faster models
GEMINI_MODEL=gemini-1.5-flash  # Fastest Gemini model
TTS_MODEL=eleven_monolingual_v1  # Fastest TTS model
```

### 3. Caching Strategy
- **AI Responses**: Cached for 5 minutes
- **STT Results**: Consider implementing audio fingerprinting
- **TTS Audio**: Consider caching common phrases

### 4. Network Optimization
- **Connection Pooling**: Reuse API connections
- **Request Batching**: Batch multiple requests when possible
- **CDN Usage**: Use CDN for static assets

## Troubleshooting Performance Issues

### High STT Times
1. Check network latency to ElevenLabs API
2. Reduce audio quality/sample rate
3. Use shorter audio chunks
4. Enable STT caching if available

### High AI Times
1. Reduce `AI_MAX_TOKENS`
2. Lower `AI_TEMPERATURE`
3. Enable `ENABLE_AI_CACHING`
4. Reduce conversation history
5. Use faster AI model

### High TTS Times
1. Enable `ENABLE_PARALLEL_PROCESSING`
2. Reduce voice stability/similarity settings
3. Use faster TTS model
4. Consider pre-generating common responses

## Monitoring Commands

```bash
# Check current performance settings
curl http://localhost:3000/api/performance

# Monitor real-time performance
tail -f logs/performance.log

# Get system stats
curl http://localhost:3000/api/stats
```

## Best Practices

1. **Enable Performance Mode**: Always use `ENABLE_PERFORMANCE_MODE=true` in production
2. **Monitor Timeouts**: Set appropriate timeouts to prevent hanging requests
3. **Use Caching**: Enable caching for repeated queries
4. **Parallel Processing**: Enable parallel processing for independent operations
5. **Regular Monitoring**: Monitor performance metrics and adjust settings accordingly 