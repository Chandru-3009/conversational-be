import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { readFileSync } from 'fs';
import { Config } from '../config/config';

export interface TTSResponse {
  audio: string; // base64 encoded
  duration: number;
}

export class GoogleTTSService {
  private client: TextToSpeechClient;
  private voiceName: string;
  private languageCode: string;
  private audioEncoding: string;

  constructor() {
    // Initialize Google Cloud TTS client
    const projectId = Config.GOOGLE_CLOUD_PROJECT_ID;
    const credentials = this.loadCredentials();

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID is required for Google TTS');
    }
    
    // Configure client with credentials if provided
    const clientConfig: any = {
      projectId: projectId
    };
    
    if (credentials) {
      clientConfig.credentials = credentials;
    }
    
    this.client = new TextToSpeechClient(clientConfig);
    this.voiceName = Config.GOOGLE_TTS_VOICE_NAME;
    this.languageCode = Config.GOOGLE_TTS_LANGUAGE_CODE;
    this.audioEncoding = Config.GOOGLE_TTS_AUDIO_ENCODING;
    
    // Validate configuration
    this.validateConfiguration();
  }
  private loadCredentials(): Record<string, unknown> | undefined {
    const inlineJson = Config.GOOGLE_APPLICATION_CREDENTIALS;
    const base64Credentials = Config.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
    const credentialsFile = Config.GOOGLE_APPLICATION_CREDENTIALS_FILE;

    if (inlineJson) {
      try {
        return JSON.parse(inlineJson);
      } catch (error) {
        console.warn('Failed to parse GOOGLE_APPLICATION_CREDENTIALS as JSON, falling back to other credential sources');
      }
    }

    if (base64Credentials) {
      try {
        const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
        return JSON.parse(decoded);
      } catch (error) {
        console.warn('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_BASE64, falling back to credential file');
      }
    }

    if (credentialsFile) {
      try {
        const fileContents = readFileSync(credentialsFile, 'utf8');
        return JSON.parse(fileContents);
      } catch (error) {
        console.warn(`Failed to read credentials file at ${credentialsFile}, Google client will use default ADC auth`, error);
      }
    }

    return undefined;
  }

  /**
   * Validate Google TTS configuration and test connection
   */
  private async validateConfiguration(): Promise<void> {
    try {
      console.log('🔍 Validating Google TTS configuration...');
      console.log(`Project ID: ${Config.GOOGLE_CLOUD_PROJECT_ID}`);
      console.log(`Voice Name: ${this.voiceName}`);
      console.log(`Language Code: ${this.languageCode}`);
      console.log(`Audio Encoding: ${this.audioEncoding}`);
      
      // Test the connection by listing voices
      const [voices] = await this.client.listVoices({});
      const availableVoices = voices.voices || [];
      
      // Check if our configured voice is available
      const voice = availableVoices.find(v => 
        v.name === this.voiceName && 
        v.languageCodes?.includes(this.languageCode)
      );
      
      if (!voice) {
        console.warn(`⚠️ Voice ${this.voiceName} not found in available voices`);
        console.log('Available voices:', availableVoices.map(v => `${v.name} (${v.languageCodes?.join(', ')})`));
        
        // Try to find a suitable alternative
        const alternativeVoice = availableVoices.find(v => 
          v.languageCodes?.includes(this.languageCode) && 
          v.name?.includes('en-US')
        );
        
        if (alternativeVoice) {
          console.log(`🔄 Using alternative voice: ${alternativeVoice.name}`);
          this.voiceName = alternativeVoice.name || this.voiceName;
        }
      } else {
        console.log(`✅ Voice found: ${voice.name} (${voice.languageCodes?.join(', ')})`);
      }
      
      console.log('✅ Google TTS configuration validated successfully');
      
    } catch (error: any) {
      console.error('❌ Google TTS configuration validation failed:', error);
      if (error.code === 7) {
        throw new Error('Google Cloud authentication failed. Please check your credentials and project ID.');
      }
      throw error;
    }
  }

  /**
   * Convert text to speech using Google Cloud TTS
   * @param text - The text to convert to speech
   * @returns Promise<TTSResponse> - Audio response with base64 encoded audio and duration
   */
  async textToSpeech(text: string): Promise<TTSResponse> {
    let lastError: any = null;
    
    // Convert text to SSML for better speech synthesis
    console.log(`🎵 Google TTS: Processing text (${text.length} chars)`);
    console.log(`🎵 Text preview:`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
    // Retry logic for TTS requests
    for (let attempt = 1; attempt <= Config.TTS_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`🎵 Google TTS attempt ${attempt}/${Config.TTS_RETRY_ATTEMPTS} for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<TTSResponse>((_, reject) => {
          setTimeout(() => {
            console.error(`⏰ Google TTS timeout after ${Config.TTS_TIMEOUT}ms`);
            reject(new Error('Google TTS processing timeout'));
          }, Config.TTS_TIMEOUT);
        });

        let ttsPromise: Promise<TTSResponse>;
        
        // Check if this is a Chirp voice (Chirp voices don't support SSML)
        const isChirpVoice = this.voiceName.includes('Chirp');
        
        // Check if the input is already SSML (starts with <speak>)
        const isAlreadySSML = text.trim().startsWith('<speak>');
        
        if (isChirpVoice) {
          // For Chirp voices, always use plain text
          console.log(`🎵 Chirp voice detected - using plain text mode`);
          if (isAlreadySSML) {
            // Extract text from SSML for Chirp voices
            const plainText = this.extractTextFromSSML(text);
            console.log(`🎵 Extracted plain text from SSML:`, plainText.substring(0, 200) + (plainText.length > 200 ? '...' : ''));
            ttsPromise = this.synthesizeSpeechPlainText(plainText);
          } else {
            ttsPromise = this.synthesizeSpeechPlainText(text);
          }
        } else if (isAlreadySSML) {
          console.log(`🎵 Input is already SSML, using directly`);
          console.log(`🎵 SSML input:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
          ttsPromise = this.synthesizeSpeech(text);
        } else if (Config.GOOGLE_TTS_USE_SSML) {
          const ssmlText = this.convertToSSML(text);
          console.log(`🎵 Converting to SSML mode`);
          console.log(`🎵 Generated SSML:`, ssmlText.substring(0, 200) + (ssmlText.length > 200 ? '...' : ''));
          ttsPromise = this.synthesizeSpeech(ssmlText);
        } else {
          console.log(`🎵 Using plain text mode`);
          ttsPromise = this.synthesizeSpeechPlainText(text);
        }
        
        const result = await Promise.race([ttsPromise, timeoutPromise]);
        
        console.log(`✅ Google TTS successful on attempt ${attempt}`);
        return result;
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Google TTS attempt ${attempt} failed:`, {
          message: error.message,
          code: error.code,
          voiceName: this.voiceName,
          languageCode: this.languageCode,
          audioEncoding: this.audioEncoding,
          textLength: text.length
        });

        // Don't retry for authentication or configuration errors
        if (error.code === 7) {
          console.error('Google TTS Error: Permission denied - Check credentials and project ID');
          throw new Error('Google TTS authentication failed. Please check your Google Cloud credentials and project ID.');
        } else if (error.code === 3) {
          console.error('Google TTS Error: Invalid argument - Check voice configuration');
          // Try with plain text instead of SSML for Neural2 voices
          if (attempt === 1 && this.voiceName.includes('Neural2')) {
            console.log('🔄 Retrying with plain text instead of SSML...');
            try {
              const plainTextResult = await this.synthesizeSpeechPlainText(text);
              console.log(`✅ Google TTS successful with plain text on attempt ${attempt}`);
              return plainTextResult;
            } catch (plainTextError) {
              console.error('❌ Plain text attempt also failed:', plainTextError);
              throw new Error('Google TTS configuration error. Please check voice name and language code.');
            }
          } else {
            throw new Error('Google TTS configuration error. Please check voice name and language code.');
          }
        } else if (error.code === 13) {
          console.error('Google TTS Error: Internal error - Service unavailable');
          throw new Error('Google TTS service temporarily unavailable. Please try again.');
        }

        // For network/timeout errors, retry if we have attempts left
        if (attempt < Config.TTS_RETRY_ATTEMPTS) {
          console.log(`🔄 Retrying Google TTS in ${Config.TTS_RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, Config.TTS_RETRY_DELAY));
          continue;
        }
        
        break;
      }
    }

    // Enhanced error handling for final failure
    if (lastError.code === 14) {
      console.error('Google TTS Error: Unavailable after retries');
      throw new Error('Google TTS service unavailable after retries. Please try again later.');
    } else if (lastError.message?.includes('timeout')) {
      console.error('Google TTS Error: Timeout after retries');
      throw new Error('Google TTS connection timeout after retries. Please try again.');
    }

    console.error('Google TTS Unexpected error after retries:', lastError);
    throw new Error('Google TTS failed after retries: ' + lastError.message);
  }

  /**
   * Synthesize speech using Google Cloud TTS API with SSML
   * @param ssmlText - SSML formatted text
   * @returns Promise<TTSResponse>
   */
  private async synthesizeSpeech(ssmlText: string): Promise<TTSResponse> {
    const request = {
      input: {
        ssml: ssmlText
      },
      voice: {
        languageCode: this.languageCode,
        name: this.voiceName,
        // Voice cloning configuration (if needed)
        // voiceClone: {}
      },
      audioConfig: {
        audioEncoding: this.audioEncoding as any,
        speakingRate: 1.0, // Normal speed
        pitch: 0.0, // Normal pitch
        volumeGainDb: 0.0, // Normal volume
        effectsProfileId: ['headphone-class-device'] // Optimize for headphones
      }
    };

    console.log(`🎵 Google TTS Request:`, {
      voice: request.voice,
      audioConfig: request.audioConfig,
      textLength: ssmlText.length
    });

    const [response] = await this.client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content received from Google TTS');
    }

    // Convert audio content to base64
    const base64Audio = Buffer.from(response.audioContent).toString('base64');
    const duration = this.estimateDuration(ssmlText);

    console.log(`✅ Google TTS Response: ${base64Audio.length} bytes, estimated duration: ${duration}ms`);

    return {
      audio: base64Audio,
      duration: duration
    };
  }

  /**
   * Synthesize speech using Google Cloud TTS API with plain text
   * @param text - Plain text
   * @returns Promise<TTSResponse>
   */
  private async synthesizeSpeechPlainText(text: string): Promise<TTSResponse> {
    const request = {
      input: {
        text: text
      },
      voice: {
        languageCode: this.languageCode,
        name: this.voiceName,
      },
      audioConfig: {
        audioEncoding: this.audioEncoding as any,
        speakingRate: 1.0, // Normal speed
        pitch: 0.0, // Normal pitch
        volumeGainDb: 0.0, // Normal volume
        effectsProfileId: ['headphone-class-device'] // Optimize for headphones
      }
    };

    console.log(`🎵 Google TTS Plain Text Request:`, {
      voice: request.voice,
      audioConfig: request.audioConfig,
      textLength: text.length
    });

    const [response] = await this.client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content received from Google TTS');
    }

    // Convert audio content to base64
    const base64Audio = Buffer.from(response.audioContent).toString('base64');
    const duration = this.estimateDuration(text);

    console.log(`✅ Google TTS Plain Text Response: ${base64Audio.length} bytes, estimated duration: ${duration}ms`);

    return {
      audio: base64Audio,
      duration: duration
    };
  }

  /**
   * Convert text to SSML for better speech synthesis
   * @param text - Plain text
   * @returns SSML formatted text
   */
  private convertToSSML(text: string): string {
    // Clean and escape the text to prevent SSML injection
    let cleanText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .trim();

    // Check if this is a Chirp voice (Chirp voices don't support SSML)
    if (this.voiceName.includes('Chirp')) {
      console.log('🎵 Chirp voice detected - using plain text instead of SSML');
      return cleanText; // Return plain text for Chirp voices
    }

    // Simple SSML with basic pauses for punctuation
    // This is a more conservative approach that should work with Neural2 voices
    cleanText = cleanText
      .replace(/([.!?])\s+/g, '$1<break time="300ms"/> ')
      .replace(/(,)\s+/g, '$1<break time="150ms"/> ');

    // Wrap in speak tag with basic prosody for natural speech
    return `<speak><prosody rate="medium">${cleanText}</prosody></speak>`;
  }

  /**
   * Extract plain text from SSML markup
   * @param ssmlText - SSML formatted text
   * @returns Plain text without SSML tags
   */
  private extractTextFromSSML(ssmlText: string): string {
    // Remove SSML tags and decode HTML entities
    let plainText = ssmlText
      .replace(/<speak[^>]*>/gi, '')
      .replace(/<\/speak>/gi, '')
      .replace(/<prosody[^>]*>/gi, '')
      .replace(/<\/prosody>/gi, '')
      .replace(/<break[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, '') // Remove any remaining tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return plainText;
  }

  /**
   * Estimate audio duration based on text length
   * @param text - The text content
   * @returns Estimated duration in milliseconds
   */
  private estimateDuration(text: string): number {
    // Rough estimation: 150 words per minute
    const words = text.split(' ').length;
    return Math.max(1000, Math.ceil(words / 2.5) * 1000); // 2.5 words per second, minimum 1 second
  }

  /**
   * Get available voices for the configured language
   * @returns Promise<Array> - List of available voices
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      const [voices] = await this.client.listVoices({
        languageCode: this.languageCode
      });
      
      return voices.voices || [];
    } catch (error) {
      console.error('Error fetching available voices:', error);
      return [];
    }
  }

  /**
   * Test the TTS service with a simple text
   * @returns Promise<boolean> - True if test succeeds
   */
  async testConnection(): Promise<boolean> {
    try {
      const testText = "Hello, this is a test of Google Text-to-Speech.";
      const result = await this.textToSpeech(testText);
      
      console.log('✅ Google TTS connection test successful');
      console.log(`Test audio generated: ${result.audio.length} bytes`);
      
      return true;
    } catch (error) {
      console.error('❌ Google TTS connection test failed:', error);
      return false;
    }
  }
} 