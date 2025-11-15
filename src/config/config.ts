export class Config {
  // Server configuration
  static readonly PORT: number = parseInt(process.env['PORT'] || '3000', 10);
  static readonly WS_PORT: number = parseInt(process.env['WS_PORT'] || '3001', 10);
  static readonly NODE_ENV: string = process.env['NODE_ENV'] || 'development';
  static readonly MONGODB_URI: string = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/formfinch';
  static readonly GEMINI_API_KEY: string = process.env['GEMINI_API_KEY'] || '';
  static readonly GEMINI_MODEL: string = process.env['GEMINI_MODEL'] || 'gemini-1.5-pro';
  
  // Google Cloud TTS Configuration
  static readonly GOOGLE_CLOUD_PROJECT_ID: string = process.env['GOOGLE_CLOUD_PROJECT_ID'] || '';
  static readonly GOOGLE_APPLICATION_CREDENTIALS: string = process.env['GOOGLE_APPLICATION_CREDENTIALS'] || '';
  static readonly GOOGLE_APPLICATION_CREDENTIALS_FILE: string = process.env['GOOGLE_APPLICATION_CREDENTIALS_FILE'] || '';
  static readonly GOOGLE_APPLICATION_CREDENTIALS_BASE64: string = process.env['GOOGLE_APPLICATION_CREDENTIALS_BASE64'] || '';
  static readonly GOOGLE_TTS_VOICE_NAME: string = process.env['GOOGLE_TTS_VOICE_NAME'] || 'en-US-Chirp3-HD-Aoede';
  static readonly GOOGLE_TTS_LANGUAGE_CODE: string = process.env['GOOGLE_TTS_LANGUAGE_CODE'] || 'en-US';
  static readonly GOOGLE_TTS_AUDIO_ENCODING: string = process.env['GOOGLE_TTS_AUDIO_ENCODING'] || 'MP3';
  static readonly GOOGLE_TTS_USE_SSML: boolean = process.env['GOOGLE_TTS_USE_SSML'] !== 'false'; // Default to true
  
  // Legacy ElevenLabs configuration (for backward compatibility)
  static readonly ELEVENLABS_API_KEY: string = process.env['ELEVENLABS_API_KEY'] || '';
  static readonly ELEVENLABS_VOICE_ID: string = process.env['ELEVENLABS_VOICE_ID'] || '';
  static readonly ELEVENLABS_BASE_URL: string = process.env['ELEVENLABS_BASE_URL'] || 'https://api.elevenlabs.io/v1';  
  
  // CORS configuration
  static readonly CORS_ORIGIN: string = process.env['CORS_ORIGIN'] || 'http://localhost:3000';
  
  // Database configuration
  static readonly DATABASE_URL: string = process.env['DATABASE_URL'] || '';
  static readonly DATABASE_NAME: string = process.env['DATABASE_NAME'] || 'formfinch';
  
  // AI Service configuration
  static readonly OPENAI_API_KEY: string = process.env['OPENAI_API_KEY'] || '';
  static readonly AI_PROVIDER: string = process.env['AI_PROVIDER'] || 'gemini'; // 'gemini' or 'openai'
  static readonly OPENAI_MODEL: string = process.env['OPENAI_MODEL'] || 'gpt-4o-mini';
  
  // OpenAI Realtime API configuration
  static readonly OPENAI_REALTIME_ENABLED: boolean = process.env['OPENAI_REALTIME_ENABLED'] === 'true';
  static readonly OPENAI_REALTIME_MODEL: string = process.env['OPENAI_REALTIME_MODEL'] || 'gpt-4o-realtime-preview-2025-06-03';
  static readonly OPENAI_REALTIME_BASE_URL: string = process.env['OPENAI_REALTIME_BASE_URL'] || 'https://api.openai.com/v1/realtime';
  static readonly OPENAI_REALTIME_VOICE: string = process.env['OPENAI_REALTIME_VOICE'] || 'verse';
  
  // Audio configuration
  static readonly AUDIO_SAMPLE_RATE: number = parseInt(process.env['AUDIO_SAMPLE_RATE'] || '16000', 10);
  static readonly AUDIO_CHANNELS: number = parseInt(process.env['AUDIO_CHANNELS'] || '1', 10);
  
  // Performance configuration
  static readonly ENABLE_PERFORMANCE_MODE: boolean = process.env['ENABLE_PERFORMANCE_MODE'] === 'true';
  static readonly TTS_MODEL: string = process.env['TTS_MODEL'] || 'eleven_monolingual_v1';
  static readonly TTS_OUTPUT_FORMAT: string = process.env['TTS_OUTPUT_FORMAT'] || 'mp3_44100_32';
  static readonly AI_MAX_TOKENS: number = parseInt(process.env['AI_MAX_TOKENS'] || '2000', 10);
  static readonly AI_TEMPERATURE: number = parseFloat(process.env['AI_TEMPERATURE'] || '0.4');
  static readonly CONVERSATION_HISTORY_LIMIT: number = parseInt(process.env['CONVERSATION_HISTORY_LIMIT'] || '4', 10);
  
  // Performance optimization settings
  static readonly STT_TIMEOUT: number = parseInt(process.env['STT_TIMEOUT'] || '3000', 10);
  static readonly AI_TIMEOUT: number = parseInt(process.env['AI_TIMEOUT'] || '8000', 10); // Increased to 8 seconds for AI processing
  static readonly AI_RETRY_ATTEMPTS: number = parseInt(process.env['AI_RETRY_ATTEMPTS'] || '3', 10); // AI retry attempts
  static readonly AI_RETRY_DELAY: number = parseInt(process.env['AI_RETRY_DELAY'] || '1000', 10); // AI retry delay in ms
  static readonly TTS_TIMEOUT: number = parseInt(process.env['TTS_TIMEOUT'] || '600000', 10); // Increased to 15 seconds for longer text
  static readonly TTS_RETRY_ATTEMPTS: number = parseInt(process.env['TTS_RETRY_ATTEMPTS'] || '3', 10); // Increased retry attempts
  static readonly TTS_RETRY_DELAY: number = parseInt(process.env['TTS_RETRY_DELAY'] || '2000', 10); // Increased retry delay
  static readonly ENABLE_STT_CACHING: boolean = process.env['ENABLE_STT_CACHING'] === 'true';
  static readonly ENABLE_AI_CACHING: boolean = process.env['ENABLE_AI_CACHING'] === 'true';
  static readonly ENABLE_PARALLEL_PROCESSING: boolean = process.env['ENABLE_PARALLEL_PROCESSING'] === 'true';
  
  // TTS Provider selection
  static readonly TTS_PROVIDER: string = process.env['TTS_PROVIDER'] || 'google'; // 'google' or 'elevenlabs'
  
  // Validation
  static validate(): void {
    const required = ['GEMINI_API_KEY'];
    
    // Check TTS provider requirements
    if (this.TTS_PROVIDER === 'google') {
      if (!this.GOOGLE_CLOUD_PROJECT_ID) {
        required.push('GOOGLE_CLOUD_PROJECT_ID');
      }
    } else if (this.TTS_PROVIDER === 'elevenlabs') {
      if (!this.ELEVENLABS_API_KEY) {
        required.push('ELEVENLABS_API_KEY');
      }
    }
    
    // Check OpenAI Realtime requirements if enabled
    if (this.OPENAI_REALTIME_ENABLED && !this.OPENAI_API_KEY) {
      required.push('OPENAI_API_KEY');
    }
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
  
  // Helper methods
  static isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }
  
  static isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }
  
  static isGoogleTTS(): boolean {
    return this.TTS_PROVIDER === 'google';
  }
  
  static isElevenLabsTTS(): boolean {
    return this.TTS_PROVIDER === 'elevenlabs';
  }
  
  static isOpenAIRealtimeEnabled(): boolean {
    return this.OPENAI_REALTIME_ENABLED;
  }
} 