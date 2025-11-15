import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Config } from "../config/config";
import { GoogleTTSService } from "./googleTTSService";

export interface STTResponse {
  text: string;
  confidence: number;
}

export interface TTSResponse {
  audio: string; // base64 encoded
  duration: number;
}

export class AudioService {
  private elevenlabs: ElevenLabsClient | null = null;
  private googleTTS: GoogleTTSService | null = null;
  private voiceId: string = "";

  /**
   * AudioService handles speech-to-text and text-to-speech operations.
   *
   * AUDIO FORMAT CONTRACT:
   * - Frontend can send WebM audio directly (no conversion needed!)
   * - Speech-to-text uses ElevenLabs Scribe API (supports WebM, MP3, WAV, etc.)
   * - Text-to-speech uses Google Cloud TTS (default) or ElevenLabs API (fallback)
   */
  constructor() {
    // Initialize TTS provider based on configuration
    if (Config.isGoogleTTS()) {
      this.initializeGoogleTTS();
    } else if (Config.isElevenLabsTTS()) {
      this.initializeElevenLabs();
    } else {
      throw new Error(
        'No TTS provider configured. Set TTS_PROVIDER to "google" or "elevenlabs"'
      );
    }

    // Validate configuration and test connection
    this.validateConfiguration();
  }

  /**
   * Initialize Google TTS service
   */
  private initializeGoogleTTS(): void {
    try {
      console.log("🎵 Initializing Google TTS service...");
      this.googleTTS = new GoogleTTSService();
      console.log("✅ Google TTS service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Google TTS:", error);
      throw error;
    }
  }

  /**
   * Initialize ElevenLabs service
   */
  private initializeElevenLabs(): void {
    const elevenLabsApiKey = Config.ELEVENLABS_API_KEY;
    const voiceId = Config.ELEVENLABS_VOICE_ID;

    if (!elevenLabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY is required for ElevenLabs TTS");
    }

    if (!voiceId) {
      throw new Error("ELEVENLABS_VOICE_ID is required for ElevenLabs TTS");
    }

    this.elevenlabs = new ElevenLabsClient({
      apiKey: elevenLabsApiKey,
    });
    this.voiceId = voiceId;

    console.log("✅ ElevenLabs service initialized");
  }

  /**
   * Validate TTS configuration and test connection
   */
  private async validateConfiguration(): Promise<void> {
    try {
      console.log("🔍 Validating TTS configuration...");

      if (Config.isGoogleTTS()) {
        if (!this.googleTTS) {
          throw new Error("Google TTS service not initialized");
        }

        // Test Google TTS connection
        const testResult = await this.googleTTS.testConnection();
        if (!testResult) {
          throw new Error("Google TTS connection test failed");
        }

        console.log("✅ Google TTS configuration validated successfully");
      } else if (Config.isElevenLabsTTS()) {
        if (!this.elevenlabs) {
          throw new Error("ElevenLabs service not initialized");
        }

        // Test ElevenLabs voice access
        const voicesResponse = await this.elevenlabs.voices.getAll();
        const voices = voicesResponse.voices || [];
        const voice = voices.find((v: any) => v.voiceId === this.voiceId);

        if (!voice) {
          console.error(
            `❌ Voice ID ${this.voiceId} not found in available voices`
          );
          console.log(
            "Available voices:",
            voices.map((v: any) => `${v.name} (${v.voiceId})`)
          );
          throw new Error(
            `Voice ID ${this.voiceId} not found. Please check ELEVENLABS_VOICE_ID configuration.`
          );
        }

        console.log(
          `✅ ElevenLabs voice found: ${voice.name} (${voice.voiceId})`
        );
        console.log("✅ ElevenLabs configuration validated successfully");
      }
    } catch (error: any) {
      console.error("❌ TTS configuration validation failed:", error);
      if (error.status === 401 || error.statusCode === 401) {
        throw new Error(
          "TTS API key is invalid. Please check your configuration."
        );
      }
      throw error;
    }
  }

  /**
   * Converts speech audio to text using ElevenLabs Scribe API.
   * Supports multiple audio formats including WebM, MP3, WAV, etc.
   *
   * @param audioBuffer - Audio buffer in any supported format (WebM, MP3, WAV, etc.)
   * @param mimeType - MIME type of the audio (e.g., 'audio/webm', 'audio/mp3')
   * @returns Promise<STTResponse> - Transcription result with confidence score
   * @throws Error - If audio format is invalid or API call fails
   */
  async speechToText(
    audioBuffer: Buffer,
    mimeType?: string
  ): Promise<STTResponse> {
    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length < 5000) {
      console.log("Audio buffer too small or empty, skipping STT");
      return { text: "", confidence: 0 };
    }

    try {
      console.log(
        `🎤 ElevenLabs STT: Processing audio buffer of ${audioBuffer.length} bytes`
      );
      console.log(`🎤 ElevenLabs STT: MIME type: ${mimeType || "unknown"}`);

      // Skip detailed quality checks for WebM files (they're usually good)
      if (mimeType !== "audio/webm") {
        const nonZeroBytes = audioBuffer.filter((byte) => byte !== 0).length;
        const zeroPercentage =
          ((audioBuffer.length - nonZeroBytes) / audioBuffer.length) * 100;
        console.log(
          `🎤 ElevenLabs STT: Audio quality - ${nonZeroBytes}/${audioBuffer.length} non-zero bytes (${(100 - zeroPercentage).toFixed(1)}% non-zero)`
        );
      }

      // Use ElevenLabs Scribe API for speech-to-text with optimized settings
      const audioBlob = new Blob([audioBuffer], {
        type: mimeType || "audio/webm",
      });

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<STTResponse>((_, reject) => {
        setTimeout(
          () => reject(new Error("STT processing timeout")),
          Config.STT_TIMEOUT
        );
      });

      const sttPromise = this.elevenlabs!.speechToText.convert({
        file: audioBlob,
        modelId: "scribe_v1", // Latest STT model
        languageCode: "en", // English language
        tagAudioEvents: false, // Disable audio event tagging for faster processing
        diarize: false, // Disable speaker diarization for faster processing
      }).then((response: any) => {
        // Extract transcription from response
        const transcription = response.text || "";
        console.log(`✅ ElevenLabs STT result: "${transcription}"`);

        // ElevenLabs doesn't provide confidence scores, so we'll estimate based on text quality
        const confidence = this.estimateConfidence(transcription);

        return {
          text: transcription,
          confidence: confidence,
        };
      });

      const result = await Promise.race([sttPromise, timeoutPromise]);
      return result;
    } catch (error: any) {
      console.error("ElevenLabs STT error details:", {
        message: error.message,
        status: error.status,
        bufferSize: audioBuffer?.length,
        mimeType: mimeType,
      });

      // Enhanced error handling for ElevenLabs API
      if (error.status === 429) {
        console.error("ElevenLabs STT Error: Rate limit exceeded");
        throw new Error(
          "Speech recognition rate limit exceeded. Please wait a moment and try again."
        );
      } else if (error.status === 401) {
        console.error("ElevenLabs STT Error: Unauthorized");
        throw new Error(
          "Authentication failed. Please check API configuration."
        );
      } else if (error.status === 400) {
        console.error(
          "ElevenLabs STT Error: Bad request - invalid audio format"
        );
        throw new Error("Invalid audio format. Please try speaking again.");
      } else if (error.status === 413) {
        console.error("ElevenLabs STT Error: File too large");
        throw new Error(
          "Audio file too large. Please try a shorter recording."
        );
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("timeout")
      ) {
        console.error("ElevenLabs STT Error: Network timeout");
        throw new Error("Connection timeout. Please try again.");
      }

      // Log unexpected errors for debugging
      console.error("ElevenLabs STT Unexpected error:", error);
      throw new Error("Speech recognition failed. Please try again.");
    }
  }

  /**
   * Estimate confidence score based on transcription quality
   * @param transcription - The transcribed text
   * @returns Estimated confidence score (0-1)
   */
  private estimateConfidence(transcription: string): number {
    if (!transcription.trim()) {
      return 0;
    }

    // Simple heuristics for confidence estimation
    let confidence = 0.8; // Base confidence

    // Reduce confidence for very short transcriptions
    if (transcription.length < 10) {
      confidence -= 0.2;
    }

    // Reduce confidence for transcriptions with many numbers (often misheard)
    const numberCount = (transcription.match(/\d+/g) || []).length;
    if (numberCount > 2) {
      confidence -= 0.1;
    }

    // Reduce confidence for transcriptions with repeated words
    const words = transcription.toLowerCase().split(" ");
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    if (repetitionRatio < 0.7) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Convert text to speech using the configured TTS provider
   * @param text - The text to convert to speech
   * @returns Promise<TTSResponse> - Audio response with base64 encoded audio and duration
   */
  async textToSpeech(text: string): Promise<TTSResponse> {
    if (Config.isGoogleTTS()) {
      return this.googleTTS!.textToSpeech(text);
    } else if (Config.isElevenLabsTTS()) {
      return this.elevenlabsTextToSpeech(text);
    } else {
      throw new Error("No TTS provider configured");
    }
  }

  /**
   * ElevenLabs text-to-speech implementation (legacy)
   * @param text - The text to convert to speech
   * @returns Promise<TTSResponse> - Audio response
   */
  private async elevenlabsTextToSpeech(text: string): Promise<TTSResponse> {
    let lastError: any = null;

    // Check if the input is already SSML (starts with <speak>)
    const isAlreadySSML = text.trim().startsWith("<speak>");

    if (isAlreadySSML) {
      console.log(`🎵 ElevenLabs TTS: Input is already SSML, using directly`);
      console.log(
        `🎵 SSML input:`,
        text.substring(0, 200) + (text.length > 200 ? "..." : "")
      );
    } else {
      text = this.convertToSSML(text);
      console.log(`🎵 ElevenLabs TTS: Converted text to SSML: ${text}`);
    }

    // Check if text is too long and needs chunking
    if (text.length > 1000) {
      console.log(
        `📝 Text is long (${text.length} chars), chunking for better TTS performance`
      );
      return this.textToSpeechChunked(text);
    }

    // Retry logic for TTS requests
    for (let attempt = 1; attempt <= Config.TTS_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(
          `🎵 ElevenLabs TTS attempt ${attempt}/${Config.TTS_RETRY_ATTEMPTS} for text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}" (${text.length} chars, timeout: ${Config.TTS_TIMEOUT}ms)`
        );

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<TTSResponse>((_, reject) => {
          setTimeout(() => {
            console.error(
              `⏰ ElevenLabs TTS timeout after ${Config.TTS_TIMEOUT}ms for text length: ${text.length}`
            );
            reject(new Error("TTS processing timeout"));
          }, Config.TTS_TIMEOUT);
        });

        // Optimize voice settings for faster generation
        const voiceSettings = {
          stability: 0.1, // Lower stability for faster generation
          similarityBoost: 0.1, // Lower similarity for faster generation
          style: 0.0, // No style for faster generation
          useSpeakerBoost: false, // Disable speaker boost for faster generation
        };

        const ttsPromise = this.elevenlabs!.textToSpeech.convert(this.voiceId, {
          text: text,
          modelId: Config.TTS_MODEL, // Use configurable model
          outputFormat: Config.TTS_OUTPUT_FORMAT as any, // Use configurable format
          voiceSettings: voiceSettings,
        }).then(async (audio: any) => {
          // Convert the ReadableStream to base64
          const chunks: Uint8Array[] = [];
          const reader = audio.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }

          const totalLength = chunks.reduce(
            (acc, chunk) => acc + chunk.length,
            0
          );
          const audioBuffer = new Uint8Array(totalLength);
          let offset = 0;

          for (const chunk of chunks) {
            audioBuffer.set(chunk, offset);
            offset += chunk.length;
          }

          const base64Audio = Buffer.from(audioBuffer).toString("base64");

          return {
            audio: base64Audio,
            duration: this.estimateDuration(text),
          };
        });

        const result = await Promise.race([ttsPromise, timeoutPromise]);
        console.log(`✅ ElevenLabs TTS successful on attempt ${attempt}`);
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ ElevenLabs TTS attempt ${attempt} failed:`, {
          message: error.message,
          status: error.status,
          statusCode: error.statusCode,
          voiceId: this.voiceId,
          modelId: Config.TTS_MODEL,
          outputFormat: Config.TTS_OUTPUT_FORMAT,
          textLength: text.length,
        });

        // Don't retry for authentication or configuration errors
        if (error.status === 401 || error.statusCode === 401) {
          console.error(
            "ElevenLabs TTS Error: Unauthorized - Check API key and voice ID"
          );
          throw new Error(
            "TTS authentication failed. Please check ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID configuration."
          );
        } else if (error.status === 404 || error.statusCode === 404) {
          console.error("ElevenLabs TTS Error: Voice not found");
          throw new Error(
            "Voice not found. Please check ELEVENLABS_VOICE_ID configuration."
          );
        } else if (error.status === 400 || error.statusCode === 400) {
          console.error(
            "ElevenLabs TTS Error: Bad request - invalid parameters"
          );
          throw new Error(
            "TTS request failed. Please check voice settings and text content."
          );
        }

        // For network/timeout errors, retry if we have attempts left
        if (attempt < Config.TTS_RETRY_ATTEMPTS) {
          console.log(
            `🔄 Retrying ElevenLabs TTS in ${Config.TTS_RETRY_DELAY}ms...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, Config.TTS_RETRY_DELAY)
          );
          continue;
        }

        // If we've exhausted all retries, throw the last error
        break;
      }
    }

    // Enhanced error handling for final failure
    if (lastError.status === 429 || lastError.statusCode === 429) {
      console.error("ElevenLabs TTS Error: Rate limit exceeded after retries");
      throw new Error(
        "TTS rate limit exceeded. Please wait a moment and try again."
      );
    } else if (
      lastError.message?.includes("network") ||
      lastError.message?.includes("timeout")
    ) {
      console.error("ElevenLabs TTS Error: Network timeout after retries");
      throw new Error(
        "TTS connection timeout after retries. Please try again."
      );
    }

    // Log unexpected errors for debugging
    console.error("ElevenLabs TTS Unexpected error after retries:", lastError);
    throw new Error(
      "Text-to-speech failed after retries: " + lastError.message
    );
  }

  private estimateDuration(text: string): number {
    // Rough estimation: 150 words per minute
    const words = text.split(" ").length;
    return Math.max(1, Math.ceil(words / 2.5)); // 2.5 words per second
  }

  private convertToSSML(text: string): string {
    // Step 1: Add expressive pauses for punctuation and ellipsis
    const replacements = [
      { regex: /\.{3}/g, replacement: '<break time="300ms"/>' },
      { regex: /([.?!])\s*/g, replacement: '$1<break time="250ms"/> ' },
      { regex: /,/g, replacement: '<break time="150ms"/>' },
      { regex: /—/g, replacement: '<break time="200ms"/>' },
    ];

    let ssml = text.trim();

    // Step 2: Apply break formatting
    for (const { regex, replacement } of replacements) {
      ssml = ssml.replace(regex, replacement);
    }

    // Step 3: Add emphasis to key words (you can customize this list)
    const emphasizeWords = [
      "really",
      "just",
      "start",
      "healthy",
      "pizza",
      "toast",
      "coke",
      "delicious",
      "sure",
      "great",
      "good",
    ];
    for (const word of emphasizeWords) {
      const wordRegex = new RegExp(`\\b(${word})\\b`, "gi");
      ssml = ssml.replace(
        wordRegex,
        '<emphasis level="moderate">$1</emphasis>'
      );
    }

    // Step 4: Add initial pause
    ssml = `<break time="600ms"/>${ssml}`;

    // Step 5: Wrap in speak + prosody
    return `<speak><prosody rate="medium" pitch="+2%">${ssml}</prosody></speak>`;
  }

  /**
   * Handle TTS for long text by chunking it into smaller pieces
   * @param text - The long text to convert to speech
   * @returns Promise<TTSResponse> - Combined audio response
   */
    private async textToSpeechChunked(text: string): Promise<TTSResponse> {
      console.log(`🎵 Processing long text (${text.length} chars) in chunks`);

      // Check if this is SSML and handle accordingly
      const isSSML = text.trim().startsWith("<speak>");

      let sentences: string[];
      if (isSSML) {
        console.log(`🎵 Processing SSML text in chunks`);
        // For SSML, we need to be more careful about splitting
        // Split by sentence boundaries but preserve SSML structure
        sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      } else {
        // Split text into sentences for better natural breaks
        sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      }
      const chunks: string[] = [];
      let currentChunk = "";

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > 800) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            // Single sentence is too long, split by words
            const words = sentence.split(" ");
            let wordChunk = "";
            for (const word of words) {
              if ((wordChunk + " " + word).length > 800) {
                if (wordChunk) {
                  chunks.push(wordChunk.trim());
                  wordChunk = word;
                } else {
                  chunks.push(word);
                }
              } else {
                wordChunk += (wordChunk ? " " : "") + word;
              }
            }
            if (wordChunk) {
              currentChunk = wordChunk;
            }
          }
        } else {
          currentChunk += sentence;
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      console.log(`📝 Split into ${chunks.length} chunks for processing`);

      // Process each chunk
      const chunkResults: TTSResponse[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;

        console.log(
          `🎵 Processing chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 50)}${chunk.length > 50 ? "..." : ""}"`
        );

        try {
          const chunkResult = await this.textToSpeech(chunk);
          chunkResults.push(chunkResult);

          // Add small delay between chunks to prevent rate limiting
          if (i < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`❌ Failed to process chunk ${i + 1}:`, error);
          throw error;
        }
      }

      // Combine audio chunks (this is a simplified approach - in production you might want to concatenate audio files)
      console.log(`🎵 Combining ${chunkResults.length} audio chunks`);

      // Combine audio from all chunks
      const audioBuffers = chunkResults.map((result) =>
        Buffer.from(result.audio, "base64")
      );
      const combinedAudioBuffer = Buffer.concat(audioBuffers);

      const combinedResult: TTSResponse = {
        audio: combinedAudioBuffer.toString("base64"),
        duration: chunkResults.reduce(
          (total, result) => total + result.duration,
          0
        ),
      };

      console.log(
        `✅ Combined audio result: ${combinedResult.audio.length} bytes, ${combinedResult.duration}ms duration`
      );
      return combinedResult;
    }

  validateAudioChunk(audioBuffer: Buffer, mimeType?: string): boolean {
    if (!audioBuffer || audioBuffer.length === 0) {
      console.log("Audio chunk validation failed: empty buffer");
      return false;
    }

    // Check minimum size for meaningful audio
    if (audioBuffer.length < 1000) {
      console.log("Audio chunk validation failed: buffer too small");
      return false;
    }

    // Check for all-zero buffer (silence)
    const nonZeroBytes = audioBuffer.filter((byte) => byte !== 0).length;
    const zeroPercentage =
      ((audioBuffer.length - nonZeroBytes) / audioBuffer.length) * 100;

    if (zeroPercentage > 95) {
      console.log(
        `Audio chunk validation failed: too much silence (${zeroPercentage.toFixed(1)}% zero bytes)`
      );
      return false;
    }

    // Validate MIME type if provided
    if (mimeType) {
      const validMimeTypes = [
        "audio/webm",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/m4a",
      ];
      if (!validMimeTypes.includes(mimeType)) {
        console.log(
          `Audio chunk validation failed: invalid MIME type: ${mimeType}`
        );
        return false;
      }
    }

    console.log(
      `✅ Audio chunk validation passed: ${audioBuffer.length} bytes, ${(100 - zeroPercentage).toFixed(1)}% non-zero`
    );
    return true;
  }

  estimateAudioDuration(audioBuffer: Buffer, mimeType?: string): number {
    if (!audioBuffer || audioBuffer.length === 0) {
      return 0;
    }

    // Rough estimation based on file size and format
    let bytesPerSecond = 16000; // Default for 16kHz mono

    if (mimeType === "audio/webm") {
      bytesPerSecond = 32000; // WebM with Opus codec
    } else if (mimeType === "audio/mp3") {
      bytesPerSecond = 64000; // MP3 at 64kbps
    } else if (mimeType === "audio/wav") {
      bytesPerSecond = 32000; // WAV at 16kHz, 16-bit
    }

    const durationSeconds = audioBuffer.length / bytesPerSecond;
    return Math.max(0, Math.ceil(durationSeconds * 1000)); // Convert to milliseconds
  }
}
