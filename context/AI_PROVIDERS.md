# AI Providers Configuration

Nutrina now supports both Google Gemini AI and OpenAI as AI providers. You can configure which one to use based on your preferences and API access.

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# AI Provider Selection
AI_PROVIDER=gemini  # or 'openai'

# Gemini Configuration (if using Gemini)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Common AI Settings
AI_MAX_TOKENS=120
AI_TEMPERATURE=0.4
AI_TIMEOUT=8000
```

## Provider Options

### 1. Google Gemini AI (Default)

**Pros:**
- Free tier available
- Good performance for conversational AI
- Integrated with Google's ecosystem

**Setup:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Set `AI_PROVIDER=gemini` in your `.env`
4. Add your `GEMINI_API_KEY`

**Available Models:**
- `gemini-1.5-pro` (recommended)
- `gemini-1.5-flash` (faster, cheaper)
- `gemini-pro`

### 2. OpenAI

**Pros:**
- Excellent conversation quality
- Wide range of models
- Well-documented API

**Setup:**
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Set `AI_PROVIDER=openai` in your `.env`
4. Add your `OPENAI_API_KEY`

**Available Models:**
- `gpt-4o-mini` (recommended, good balance)
- `gpt-4o` (higher quality, more expensive)
- `gpt-3.5-turbo` (faster, cheaper)

## Fallback Behavior

The system includes intelligent fallback:

1. **Primary Provider**: Uses the configured `AI_PROVIDER`
2. **Fallback**: If the primary provider fails, automatically falls back to the other provider (if available)
3. **Error Handling**: If both providers fail, returns a user-friendly error message

## Testing

You can test both providers using the included test script:

```bash
# Build the project first
npm run build

# Run the AI provider test
node scripts/test-ai-providers.js
```

## Performance Comparison

| Provider | Speed | Cost | Quality | Best For |
|----------|-------|------|---------|----------|
| Gemini | Fast | Low/Free | Good | Budget-conscious users |
| OpenAI | Medium | Medium | Excellent | Quality-focused users |

## Switching Providers

To switch between providers:

1. **Update your `.env` file:**
   ```env
   AI_PROVIDER=openai  # or 'gemini'
   ```

2. **Restart the application:**
   ```bash
   npm run dev
   ```

3. **Verify the change:**
   - Check the console logs for connection messages
   - Test with a simple conversation

## Troubleshooting

### Common Issues

1. **"No AI provider available"**
   - Ensure you have at least one API key configured
   - Check that `AI_PROVIDER` is set correctly

2. **Authentication errors**
   - Verify your API keys are correct
   - Check API key permissions and quotas

3. **Timeout errors**
   - Increase `AI_TIMEOUT` in your `.env`
   - Check your internet connection

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

This will show detailed information about which provider is being used and any errors that occur. 