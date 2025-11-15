import OpenAI from "openai";
import { Config } from "../config/config";

export interface EphemeralKeyResponse {
  client_secret: {
    value: string;
    expires_at: number;
  };
}

export interface RealtimeSessionData {
  sessionId: string;
  userId: string;
  userEmail: string;
  ephemeralKey: string;
  expiresAt: number;
  conversationHistory: any[];
}

export class OpenAIRealtimeService {
  private openai: OpenAI;
  private activeSessions: Map<string, RealtimeSessionData> = new Map();
  private mockMode: boolean = false;

  constructor() {
    if (!Config.OPENAI_API_KEY) {
      console.warn(
        "⚠️ OpenAI API key not found, enabling mock mode for testing"
      );
      this.mockMode = true;
    }

    this.openai = new OpenAI({
      apiKey: Config.OPENAI_API_KEY || "mock-key",
    });
  }

  /**
   * Generate an ephemeral key for OpenAI Realtime API
   */
  async generateEphemeralKey(
    sessionId: string,
    userId: string,
    userEmail: string
  ): Promise<EphemeralKeyResponse> {
    try {
      console.log(`🔑 Generating ephemeral key for session: ${sessionId}`);

      // Mock mode for testing when OpenAI API is not available
      if (this.mockMode) {
        console.log("🧪 Using mock ephemeral key for testing");
        const mockResponse: EphemeralKeyResponse = {
          client_secret: {
            value: "mock_ephemeral_key_" + Date.now(),
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          },
        };

        // Store session data
        this.activeSessions.set(sessionId, {
          sessionId,
          userId,
          userEmail,
          ephemeralKey: mockResponse.client_secret.value,
          expiresAt: mockResponse.client_secret.expires_at,
          conversationHistory: [],
        });

        console.log(
          `✅ Mock ephemeral key generated for session: ${sessionId}`
        );
        return mockResponse;
      }

      // Check if we have the required API key
      if (!Config.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured");
      }

      // Use the correct OpenAI Realtime API endpoint for creating sessions
      const response = await fetch(
        "https://api.openai.com/v1/realtime/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Config.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: Config.OPENAI_REALTIME_MODEL,
            modalities: ["text", "audio"],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API Error Response:", errorText);
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as EphemeralKeyResponse;

      // Store session data
      this.activeSessions.set(sessionId, {
        sessionId,
        userId,
        userEmail,
        ephemeralKey: data.client_secret.value,
        expiresAt: data.client_secret.expires_at,
        conversationHistory: [],
      });

      console.log(`✅ Ephemeral key generated for session: ${sessionId}`);
      return data;
    } catch (error) {
      console.error("❌ Failed to generate ephemeral key:", error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          throw new Error(
            "OpenAI API key is invalid or expired. Please check your API key."
          );
        } else if (error.message.includes("403")) {
          throw new Error(
            "OpenAI API key does not have access to Realtime API. Please upgrade your plan."
          );
        } else if (error.message.includes("404")) {
          throw new Error(
            "OpenAI Realtime API endpoint not found. Please check if the API is available."
          );
        } else if (error.message.includes("429")) {
          throw new Error(
            "OpenAI API rate limit exceeded. Please try again later."
          );
        } else {
          throw new Error(`Failed to generate ephemeral key: ${error.message}`);
        }
      } else {
        throw new Error(`Failed to generate ephemeral key: ${String(error)}`);
      }
    }
  }

  /**
   * Get session data by session ID
   */
  getSessionData(sessionId: string): RealtimeSessionData | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Update conversation history for a session
   */
  updateConversationHistory(sessionId: string, message: any): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (sessionData) {
      sessionData.conversationHistory.push(message);

      // Keep only the last N messages to prevent memory issues
      const maxHistory = Config.CONVERSATION_HISTORY_LIMIT * 2; // Double for both user and AI messages
      if (sessionData.conversationHistory.length > maxHistory) {
        sessionData.conversationHistory =
          sessionData.conversationHistory.slice(-maxHistory);
      }
    }
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): any[] {
    const sessionData = this.activeSessions.get(sessionId);
    return sessionData ? sessionData.conversationHistory : [];
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      if (sessionData.expiresAt < now) {
        console.log(`🧹 Cleaning up expired session: ${sessionId}`);
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Remove a specific session
   */
  removeSession(sessionId: string): void {
    console.log(`🗑️ Removing session: ${sessionId}`);
    this.activeSessions.delete(sessionId);
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get session statistics
   */
  getStats(): any {
    return {
      activeSessions: this.activeSessions.size,
      sessions: Array.from(this.activeSessions.keys()),
    };
  }
}
