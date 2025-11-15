import { WebSocket, WebSocketServer } from "ws";
import { Config } from "../config/config";
import { ConversationModel, IConversation } from "../models/Conversation";
import { FoodEntryModel } from "../models/FoodEntry";
import { ISession, SessionModel } from "../models/Session";
import { IUser, UserModel } from "../models/User";
// import { AgentModel } from "../models/Agent";
import { NewAgentModel } from "../models/NewAgent";
import { AIService, IntentResponse } from "../services/aiService";
import { AudioService } from "../services/audioService";
import { OpenAIRealtimeService } from "../services/openaiRealtimeService";
import {
  UserActivityService,
  UserRecentActivity,
} from "../services/userActivityService";
import { WebSocketMessage } from "../types";
import { IntentBuilderResponseModel } from "../models/IntentBuilderResponse";

interface SessionData {
  sessionId: string;
  userId: string;
  userEmail: string;
  conversation: IConversation | null;
  session: ISession | null;
  lastActivity: number;
  lastSttTime?: number; // Track last STT processing time
  isProcessing: boolean; // Flag to prevent multiple simultaneous processing
  lastProcessedText?: string; // Track last processed text to avoid duplicates
  processingStartTime?: number; // Track when processing started
  recentActivity?: UserRecentActivity; // User's recent activity for context
  agentId?: string; // Track current agent id for mapping
  currentIntent?: {
    id: string;
    type: string;
    fieldsToExtract: string[];
    nextIntent: string;
  };
}

export class AudioStreamingServer {
  private wss: WebSocketServer;
  private sessions: Map<string, SessionData> = new Map();
  private audioService: AudioService;
  private aiService: AIService;
  private openaiRealtimeService: OpenAIRealtimeService | null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  // Simple rate limiting for greeting requests
  private lastGreetingRequests: Map<string, number> = new Map();

  constructor(port: number, openaiRealtimeService?: OpenAIRealtimeService) {
    this.wss = new WebSocketServer({ port });
    this.audioService = new AudioService();
    this.aiService = new AIService();
    this.openaiRealtimeService = openaiRealtimeService || null;

    this.setupWebSocketServer();
    this.startCleanupInterval();
    console.log(
      "✅ AudioStreamingServer initialized with enhanced user management"
    );
  }

  private setupWebSocketServer(): void {
    this.wss.on("connection", (ws: WebSocket, request) => {
      const sessionId = this.extractSessionId(request.url);
      const userEmail = this.extractUserEmail(request.url);

      console.log(
        `🔗 WebSocket connection attempt - SessionId: ${sessionId}, Email: ${userEmail}`
      );
      console.log(`🔗 Request URL: ${request.url}`);
      console.log(`🔗 Request headers:`, request.headers);

      if (!sessionId) {
        console.error(`❌ No session ID provided in URL: ${request.url}`);
        ws.close(1008, "Session ID required");
        return;
      }

      if (!userEmail) {
        console.error(`❌ No email provided in URL: ${request.url}`);
        ws.close(1008, "Email address required");
        return;
      }

      console.log(`🔗 New WebSocket connection: ${sessionId} (${userEmail})`);

      // Add connection debugging
      ws.on("ping", () => {
        console.log(`🏓 Ping received from ${sessionId}`);
        ws.pong();
      });

      ws.on("pong", () => {
        console.log(`🏓 Pong received from ${sessionId}`);
      });
      this.setupMessageHandlers(ws, sessionId);
      this.setupConnectionHandlers(ws, sessionId);
      this.initializeSession(sessionId, ws, userEmail);
    });
  }

  private extractSessionId(url: string | undefined): string | null {
    if (!url) return null;

    const urlObj = new URL(url, "ws://localhost");
    return urlObj.searchParams.get("sessionId");
  }

  private extractUserEmail(url: string | undefined): string | null {
    if (!url) return null;

    const urlObj = new URL(url, "ws://localhost");
    return urlObj.searchParams.get("userEmail");
  }

  private extractFirstNameFromEmail(email: string): string {
    // Extract the part before @
    const localPart = email.split("@")[0];

    if (!localPart) {
      return "User";
    }

    // Handle various email formats:
    // 1. Remove dots (e.g., "dharmaraj.m" -> "dharmaraj")
    // 2. Handle underscores (e.g., "john_doe" -> "john")
    // 3. Handle numbers at the end (e.g., "user123" -> "user")
    // 4. Handle common separators like + (e.g., "user+tag" -> "user")

    let firstName =
      localPart.split(".")[0] ||
      "" // Take first part before any dot
        .split("_")[0] ||
      "" // Take first part before any underscore
        .split("+")[0] ||
      "" // Take first part before any plus sign
        .split("-")[0] ||
      ""; // Take first part before any hyphen

    // Remove trailing numbers (common in email addresses like user123@domain.com)
    firstName = firstName.replace(/\d+$/, "");

    // Capitalize first letter and ensure it's not empty
    if (firstName.length > 0) {
      return (
        firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      );
    }

    return "User";
  }

  private async initializeSession(
    sessionId: string,
    ws: WebSocket,
    userEmail: string
  ): Promise<void> {
    try {
      console.log(
        `🚀 Initializing session: ${sessionId} for user: ${userEmail}`
      );

      let user: IUser | null = null;
      let recentActivity: UserRecentActivity | null = null;

      // Handle user authentication (email is now required)
      user = await UserModel.findByEmail(userEmail);

      if (!user) {
        // Create new user
        user = await UserModel.create({
          firstName: this.extractFirstNameFromEmail(userEmail),
          lastName: "",
          email: userEmail,
        });
        console.log(`👤 New user created: ${userEmail}`);
      } else {
        console.log(`👤 Existing user found: ${user.firstName}`);
      }

      // Get user's recent activity for context
      recentActivity = await UserActivityService.getUserRecentActivity(
        user._id!.toString()
      );

      // Update user's last active time
      await UserModel.updateLastActive(user._id!.toString());

      // Check if session already exists in memory
      let sessionData = this.sessions.get(sessionId);

      if (!sessionData) {
        // First, check if session exists in database
        let dbSession = await SessionModel.findBySessionId(sessionId);

        if (dbSession) {
          // Session exists in database but not in memory - restore it
          console.log(
            `🔄 Restoring existing session from database: ${sessionId}`
          );
          const newSessionData: SessionData = {
            sessionId,
            userId: user!._id!.toString(),
            userEmail: userEmail,
            conversation: null, // Will be loaded if needed
            session: dbSession,
            lastActivity: Date.now(),
            isProcessing: false,
          };

          if (recentActivity) {
            newSessionData.recentActivity = recentActivity;
          }

          this.sessions.set(sessionId, newSessionData);
          sessionData = newSessionData;
        } else {
          // Session doesn't exist anywhere - create it
          console.log(`🆕 Creating new session: ${sessionId}`);

          // Create new session data
          const newSessionData: SessionData = {
            sessionId,
            userId: user!._id!.toString(),
            userEmail: userEmail,
            conversation: null,
            session: null,
            lastActivity: Date.now(),
            isProcessing: false,
          };

          if (recentActivity) {
            newSessionData.recentActivity = recentActivity;
          }

          // Add to memory first to prevent race conditions
          this.sessions.set(sessionId, newSessionData);
          sessionData = newSessionData;

          // Use findOrCreate to handle race conditions atomically
          try {
            dbSession = await SessionModel.findOrCreate({
              sessionId,
              userId: user!._id!.toString(),
              userEmail: userEmail,
              context: {
                userEngagement: recentActivity?.averageEngagement || 5,
                conversationMood: "neutral" as const,
                ...(recentActivity?.lastMeal?.mealType && {
                  lastMealType: recentActivity.lastMeal.mealType,
                }),
                ...(recentActivity?.lastMeal?.date && {
                  lastMealDate: recentActivity.lastMeal.date,
                }),
              },
            });
            sessionData.session = dbSession;

            // Update user stats only for new sessions (check if this is actually new)
            if (
              dbSession.createdAt.getTime() === dbSession.updatedAt.getTime()
            ) {
              await UserActivityService.updateUserStats(user!._id!.toString(), {
                totalSessions: (user!.stats?.totalSessions || 0) + 1,
              });
            }

            console.log(
              `✅ Session created/retrieved successfully: ${sessionId}`
            );
          } catch (error: any) {
            console.error(`❌ Session creation error:`, error);
            throw error;
          }
        }

        // Don't send personalized greeting automatically - wait for client-ready message
        console.log(
          `🎯 Session initialized - waiting for client-ready message before sending greeting`
        );
      } else {
        // Resume existing session
        sessionData.lastActivity = Date.now();
        sessionData.userEmail = userEmail;
        sessionData.userId = user!._id!.toString();

        if (recentActivity) {
          sessionData.recentActivity = recentActivity;
        }

        ws.send(
          JSON.stringify({
            type: "status",
            data: { message: "Session resumed" },
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      console.error("Session initialization error:", error);

      // Clean up the session from memory if creation failed
      if (this.sessions.has(sessionId)) {
        this.sessions.delete(sessionId);
      }

      // Send error message to client
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Failed to initialize session. Please try again." },
          timestamp: Date.now(),
        })
      );
    }
  }

  // Define the full intent progression
  private getIntentProgression() {
    return {
      "0001": { id: "0001", type: "intro", fieldsToExtract: ["name", "preferred_name"], nextIntent: "0002" },
      "0002": { id: "0002", type: "age", fieldsToExtract: ["age"], nextIntent: "0003" },
      "0003": { id: "0003", type: "occupation", fieldsToExtract: ["occupation"], nextIntent: "1001" },
      "1001": { id: "1001", type: "breakfast", fieldsToExtract: ["mealType", "foods", "calories"], nextIntent: "2001" },
      "2001": { id: "2001", type: "lunch", fieldsToExtract: ["mealType", "foods", "calories"], nextIntent: "3001" },
      "3001": { id: "3001", type: "dinner", fieldsToExtract: ["mealType", "foods", "calories"], nextIntent: "4001" },
      "4001": { id: "4001", type: "snack", fieldsToExtract: ["mealType", "foods", "calories"], nextIntent: "9001" },
      "9001": { id: "9001", type: "wrapup", fieldsToExtract: [], nextIntent: "summary" },
      "summary": { id: "summary", type: "summary", fieldsToExtract: [], nextIntent: "0001" }
    };
  }

  private getInitialIntent() {
    return {
      id: "0001",
      type: "intro",
      fieldsToExtract: ["name", "preferred_name"],
      nextIntent: "0002"
    };
  }

  private getCurrentIntentContext(sessionId: string): string {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData?.currentIntent) {
      return this.getInitialIntentContext();
    }

    const intent = sessionData.currentIntent;
    const progression = this.getIntentProgression();
    const nextIntent = progression[intent.nextIntent as keyof typeof progression];

    return `Intent ID:
${intent.id}

Current Intent:
Ask what the user had for ${intent.type}

Fields to Extract:
- mealType: "${intent.type}"
- foods: List of food items consumed (e.g., "rice, chicken, vegetables")
- calories: Total calories as a number (optional)

Next Intent:
${nextIntent ? `Ask what the user had for ${nextIntent.type}` : "Complete meal tracking"}`;
  }

  private getInitialIntentContext(): string {
    return `Intent ID:
1001

Current Intent:
Ask what the user had for breakfast

Fields to Extract:
- mealType: "breakfast"
- foods: List of food items consumed (e.g., "rice, chicken, vegetables")
- calories: Total calories as a number (optional)

Next Intent:
Ask what the user had for lunch`;
  }

  private progressToNextIntent(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData?.currentIntent) {
      console.log(`⚠️ No current intent found for session ${sessionId}, resetting to initial intent`);
      sessionData!.currentIntent = this.getInitialIntent();
      return;
    }

    const progression = this.getIntentProgression();
    const nextIntentId = sessionData.currentIntent.nextIntent;
    const nextIntent = progression[nextIntentId as keyof typeof progression];

    if (nextIntent) {
      console.log(`🔄 Progressing intent for session ${sessionId}: ${sessionData.currentIntent.type} (${sessionData.currentIntent.id}) → ${nextIntent.type} (${nextIntent.id})`);
      sessionData.currentIntent = nextIntent;
    } else {
      console.log(`✅ Intent progression complete for session ${sessionId}, resetting to initial intent`);
      sessionData.currentIntent = this.getInitialIntent();
    }
  }

  private async sendPersonalizedGreeting(
    sessionId: string,
    ws: WebSocket,
    user: IUser,
    recentActivity: UserRecentActivity | null
  ): Promise<void> {
    const userId = user._id!.toString();
    const now = Date.now();

    // Simple rate limiting - prevent multiple greeting requests within 5 seconds
    const lastRequest = this.lastGreetingRequests.get(userId);
    if (lastRequest && now - lastRequest < 5000) {
      console.log(
        `⏰ Rate limiting greeting request for user ${user.firstName} (last request: ${now - lastRequest}ms ago)`
      );
      ws.send(
        JSON.stringify({
          type: "error",
          data: {
            message: "Please wait a moment before requesting another greeting.",
          },
          timestamp: now,
        })
      );
      return;
    }

    // Update last request time
    this.lastGreetingRequests.set(userId, now);

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) return;

        // Get today's conversations and recent conversations for AI-powered greeting
        const todayConversations =
          await ConversationModel.getTodayConversations(user._id!.toString());
        const recentConversations = recentActivity?.recentConversations || [];

        // Generate AI-powered greeting with timeout
        const greetingPromise = this.aiService.generateAIPoweredGreeting(
          user,
          todayConversations,
          recentConversations
        );

        const greeting = await Promise.race([
          greetingPromise,
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("AI greeting timeout")), 10000)
          ),
        ]);

        // Convert to speech with timeout
        const ttsPromise = this.audioService.textToSpeech(greeting);
        const ttsResponse = await Promise.race([
          ttsPromise,
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error("TTS timeout")), 15000)
          ),
        ]);

        // Check if conversation already exists for this session (race condition protection)
        let conversation = await ConversationModel.findBySessionId(sessionId);

        if (!conversation) {
          // Create conversation record (user is now guaranteed to exist)
          conversation = await ConversationModel.create({
            sessionId,
            userId: user._id!.toString(),
            messages: [
              {
                type: "ai",
                content: greeting,
                timestamp: new Date(),
                metadata: {
                  mealContext: this.getCurrentMealContext(),
                  sentiment: "positive",
                },
              },
            ],
          });
        } else {
          // Conversation exists, add the greeting message to it
          await ConversationModel.addMessage(sessionId, {
            type: "ai",
            content: greeting,
            timestamp: new Date(),
            metadata: {
              mealContext: this.getCurrentMealContext(),
              sentiment: "positive",
            },
          });
          conversation = (await ConversationModel.findBySessionId(sessionId))!;
        }

        // Update session data
        sessionData.conversation = conversation;
        sessionData.userId = user._id!.toString();

        // Send response with clean text for frontend display
        ws.send(
          JSON.stringify({
            type: "audio",
            sessionId,
            data: {
              text: this.stripSSMLTags(greeting),
              audio: ttsResponse.audio,
              duration: ttsResponse.duration,
            },
            timestamp: Date.now(),
          })
        );

        // Success - break out of retry loop
        break;
      } catch (error: any) {
        retryCount++;

        // Check if this is a duplicate key error (race condition)
        if (error.code === 11000 && error.keyPattern?.sessionId) {
          console.log(
            `🔄 Race condition detected for session ${sessionId}, retrying...`
          );
          // For duplicate key errors, retry immediately without delay
          continue;
        }

        console.error(
          `Personalized greeting error (attempt ${retryCount}/${maxRetries + 1}):`,
          error
        );

        // If this is the last attempt, send error to client
        if (retryCount > maxRetries) {
          ws.send(
            JSON.stringify({
              type: "error",
              data: {
                message:
                  "Failed to generate personalized greeting. Please try again.",
              },
              timestamp: Date.now(),
            })
          );
          return;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 3000);
        console.log(`Retrying greeting in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async handleConversationCompleted(
    sessionId: string,
    ws: WebSocket,
    message: any
  ): Promise<void> {
    try {
      console.log(`✅ Processing conversation completion for session: ${sessionId}`);

      const sessionData = this.sessions.get(sessionId);
      if (!sessionData) {
        console.error(`❌ Session data not found for conversation completion: ${sessionId}`);
        return;
      }

      const { completedFields, conversationHistory, agentId } = message.data;

      console.log(`📊 Conversation completed with fields:`, completedFields);
      console.log(`💬 Conversation history length:`, conversationHistory?.length || 0);

      // === PATCH: Extract and save meal/food data from completedFields ===
      if (completedFields) {
        let mealTypeRaw = completedFields.mealType || completedFields.meal_type;
        let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined = undefined;
        if (["breakfast", "lunch", "dinner", "snack"].includes((mealTypeRaw || '').toLowerCase())) {
          mealType = (mealTypeRaw || '').toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack';
        }
        let foodsLoggedRaw = completedFields.foodsLogged || completedFields.foods_logged;
        let foodsLogged: string[] = [];
        if (typeof foodsLoggedRaw === 'string') {
          try {
            const parsed = JSON.parse(foodsLoggedRaw);
            if (Array.isArray(parsed)) {
              foodsLogged = parsed.map((f: any) => typeof f === 'string' ? f : (f?.name || ''));
            } else {
              foodsLogged = foodsLoggedRaw.split(',').map((f: string) => f.trim()).filter(Boolean);
            }
          } catch {
            foodsLogged = foodsLoggedRaw.split(',').map((f: string) => f.trim()).filter(Boolean);
          }
        } else if (Array.isArray(foodsLoggedRaw)) {
          foodsLogged = foodsLoggedRaw.map((f: any) => typeof f === 'string' ? f : (f?.name || ''));
        }
        foodsLogged = foodsLogged.filter(Boolean);
        const totalCalories = Number(completedFields.totalCalories || completedFields.calories || 0);
        const totalProtein = Number(completedFields.totalProtein || completedFields.protein || 0);
        const totalCarbs = Number(completedFields.totalCarbs || completedFields.carbs || 0);
        const totalFat = Number(completedFields.totalFat || completedFields.fat || 0);

        // Update conversation summary only if mealType is valid
        if (mealType) {
          await ConversationModel.updateSummary(sessionId, {
            mealType,
            foodsLogged,
            totalCalories,
            completionStatus: "complete",
            isCompleteMeal: true,
          });
        }

        // Create food entry if valid
        if (mealType && foodsLogged.length > 0) {
          let foods: any[] = foodsLogged;
          if (typeof foods[0] === 'string') {
            foods = foods.map((name: string) => ({
              name,
              quantity: 1,
              unit: '',
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            }));
          }
          await FoodEntryModel.create({
            userId: sessionData.userId,
            mealType,
            foods,
            totalCalories,
            totalProtein,
            totalCarbs,
            totalFat,
          });
        }
      }
      // === END PATCH ===

      // Store the completed conversation data
      if (conversationHistory && conversationHistory.length > 0) {
        // Create or update conversation record
        let conversation = await ConversationModel.findBySessionId(sessionId);

        if (!conversation) {
          conversation = await ConversationModel.create({
            sessionId,
            userId: sessionData.userId,
            messages: conversationHistory.map((entry: any) => ({
              type: entry.speaker === 'agent' ? 'ai' : 'user',
              content: entry.text,
              timestamp: new Date(),
              metadata: {
                mealContext: this.getCurrentMealContext(),
                sentiment: "positive",
              },
            })),
          });
        } else {
          // Add new messages to existing conversation
          for (const entry of conversationHistory) {
            await ConversationModel.addMessage(sessionId, {
              type: entry.speaker === 'agent' ? 'ai' : 'user',
              content: entry.text,
              timestamp: new Date(),
              metadata: {
                mealContext: this.getCurrentMealContext(),
                sentiment: "positive",
              },
            });
          }
        }

        // Update conversation summary
        await ConversationModel.updateSummary(sessionId, {
          completionStatus: "complete",
          isCompleteMeal: true,
        });

        // Store completed fields in session context for future reference
        await SessionModel.updateContext(sessionId, {
          completedFields: completedFields,
          agentId: agentId,
        });

        console.log(`✅ Conversation data stored successfully for session: ${sessionId}`);
      }

      // Send confirmation to client
      ws.send(
        JSON.stringify({
          type: "status",
          data: { message: "Conversation data stored successfully" },
          timestamp: Date.now(),
        })
      );

    } catch (error) {
      console.error("Conversation completion error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Failed to store conversation data. Please try again." },
          timestamp: Date.now(),
        })
      );
    }
  }

  private async handleConversationSummaryRequest(
    sessionId: string,
    ws: WebSocket,
    message: any
  ): Promise<void> {
    try {
      console.log(`📊 Processing conversation summary request for session: ${sessionId}`);

      const sessionData = this.sessions.get(sessionId);
      if (!sessionData) {
        console.error(`❌ Session data not found for conversation summary: ${sessionId}`);
        return;
      }

      const { conversationHistory, agentId } = message.data;

      if (!conversationHistory || conversationHistory.length === 0) {
        console.log(`📊 No conversation history to summarize for session: ${sessionId}`);
        ws.send(
          JSON.stringify({
            type: "conversation_summary_response",
            data: { summary: "No conversation history available to summarize." },
            timestamp: Date.now(),
          })
        );
        return;
      }

      console.log(`📊 Generating summary for ${conversationHistory.length} conversation entries`);

      // Generate conversation summary using AI
      const summary = await this.generateConversationSummary(conversationHistory, agentId);

      // Send summary response to client
      ws.send(
        JSON.stringify({
          type: "conversation_summary_response",
          data: { summary },
          timestamp: Date.now(),
        })
      );

      console.log(`✅ Conversation summary sent successfully for session: ${sessionId}`);

    } catch (error) {
      console.error("Conversation summary handling error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Failed to generate conversation summary" },
          timestamp: Date.now(),
        })
      );
    }
  }

  private async generateConversationSummary(
    conversationHistory: any[],
    agentId?: string
  ): Promise<string> {
    try {
      // Format conversation history for AI processing
      const formattedHistory = conversationHistory
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');

      // Create prompt for conversation summarization
      const systemPrompt = `Please provide a concise summary of the following conversation between a user and an AI assistant. Focus on the key points, information shared, and the overall flow of the conversation.
        Please provide a summary in this format:
        - Agent introduced itself and explained its role
        - User shared [specific information]
        - Agent asked about [specific topic]
        - User replied [specific response]
        - [Continue with key points...]`;

      const userPrompt = `Conversation: ${formattedHistory}`;
      
      // Use AI service to generate summary
      const aiResponse = await this.aiService.converseWithAI(systemPrompt, userPrompt);

      // Extract summary from AI response
      let summary = aiResponse || "Unable to generate summary";

      return summary;

    } catch (error) {
      console.error("Error generating conversation summary:", error);
      return "Unable to generate conversation summary at this time.";
    }
  }


  private async gatherUserInformation(userId: string): Promise<any> {
    try {
      console.log(`👤 Gathering user information for userId: ${userId}`);

      // Get user's recent activity
      const recentActivity = await UserActivityService.getUserRecentActivity(userId);

      // Get user's conversation history
      const recentConversations = await ConversationModel.getRecentConversations(userId, 5);

      // Get user's completed sessions
      const completedSessions = await SessionModel.findByUserId(userId, 10);

      // Determine if user has interacted before
      const hasInteractedBefore = recentConversations.length > 0 || completedSessions.length > 0;

      // Get last interaction details
      const lastInteraction = recentConversations.length > 0 ? recentConversations[0] : null;
      const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;

      const userInfo = {
        hasInteractedBefore,
        totalConversations: recentConversations.length,
        totalSessions: completedSessions.length,
        lastInteractionDate: lastInteraction?.createdAt || null,
        lastSessionDate: lastSession?.startTime || null,
        averageEngagement: recentActivity?.averageEngagement || 5,
        lastMealType: recentActivity?.lastMeal?.mealType || null,
        lastMealDate: recentActivity?.lastMeal?.date || null,
        userStats: {
          totalMeals: recentActivity?.totalMeals || 0,
          totalSessions: recentActivity?.totalSessions || 0
        }
      };

      console.log(`✅ User information gathered:`, userInfo);
      return userInfo;

    } catch (error) {
      console.error("Error gathering user information:", error);
      // Return default user info if there's an error
      return {
        hasInteractedBefore: false,
        totalConversations: 0,
        totalSessions: 0,
        lastInteractionDate: null,
        lastSessionDate: null,
        averageEngagement: 5,
        lastMealType: null,
        lastMealDate: null,
        userStats: {
          totalMeals: 0,
          totalSessions: 0
        }
      };
    }
  }

  private setupMessageHandlers(ws: WebSocket, sessionId: string): void {
    console.log(`🔊 Setting up message handlers for session: ${sessionId}`);
    ws.on("message", async (data: Buffer) => {
      try {
        console.log(
          `🔊 Message received from ${sessionId}: ${data.toString()}`
        );
        const message: WebSocketMessage = JSON.parse(data.toString());
        const sessionData = this.sessions.get(sessionId);

        // For realtime_session_request and client_ready_request, we need to handle them even if session doesn't exist yet
        if (message.type === "realtime_session_request") {
          console.log(`🔑 Realtime session request from ${sessionId}`);
          await this.handleRealtimeSessionRequest(sessionId, ws, message);
          return;
        }

        // Handle client ready request even if session doesn't exist yet
        if (message.type === "client_ready_request") {
          console.log(`✅ Client ready request received from ${sessionId}`);
          await this.handleClientReadyRequest(sessionId, ws, message);
          return;
        }

        // For other messages, session must exist
        if (!sessionData) return;
        sessionData.lastActivity = Date.now();

        console.log(`🔊 Message received from ${sessionId}: ${message.data}`);
        if (message.type === "test") {
          console.log(
            `🧪 Test message received from ${sessionId}: ${message.data}`
          );
          ws.send(
            JSON.stringify({
              type: "status",
              data: { message: `Test message received: ${message.data}` },
              timestamp: Date.now(),
            })
          );
          return;
        }

        // Handle user text message (new WebSocket-based flow)
        else if (message.type === "user_message") {
          console.log(`💬 User message from ${sessionId}: "${message.data}"`);
          await this.handleUserMessage(sessionId, ws, message);
          return;
        }

        // Handle TTS request
        else if (message.type === "tts_request") {
          console.log(`🔊 TTS request from ${sessionId}: "${message.data}"`);
          await this.handleTTSRequest(sessionId, ws, message);
          return;
        }
        // Handle conversation completed message
        else if (message.type === "conversation_completed") {
          console.log(`✅ Conversation completed message received from ${sessionId}`);
          await this.handleConversationCompleted(sessionId, ws, message);
          return;
        }
        // Handle conversation summary request
        else if (message.type === "conversation_summary_request") {
          console.log(`📊 Conversation summary request received from ${sessionId}`);
          await this.handleConversationSummaryRequest(sessionId, ws, message);
          return;
        }
        else {
          console.error(`🔊 Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error("Message handling error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Failed to process message" },
            timestamp: Date.now(),
          })
        );
      }
    });
  }

  private setupConnectionHandlers(ws: WebSocket, sessionId: string): void {
    ws.on("close", (code, reason) => {
      console.log(
        `🔌 WebSocket connection closed: ${sessionId} - Code: ${code}, Reason: ${reason}`
      );
      this.cleanupSession(sessionId);
    });

    ws.on("error", (error) => {
      console.error(`❌ WebSocket error for ${sessionId}:`, error);
      this.cleanupSession(sessionId);
    });

    // Add heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // Send ping every 30 seconds

    ws.on("close", () => {
      clearInterval(heartbeat);
    });
  }

  private async handleRealtimeSessionRequest(
    sessionId: string,
    ws: WebSocket,
    message: any
  ): Promise<void> {
    try {
      const userEmail = message.userEmail;
      if (!userEmail) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "User email is required for realtime session." },
            timestamp: Date.now(),
          })
        );
        return;
      }

      const user = await UserModel.findByEmail(userEmail);
      if (!user) {
        // Create new user
        const newUser = await UserModel.create({
          firstName: this.extractFirstNameFromEmail(userEmail),
          lastName: "",
          email: userEmail,
        });
        console.log(`👤 New user created for realtime session: ${userEmail}`);
      } else {
        console.log(
          `👤 Existing user found for realtime session: ${user.firstName}`
        );
      }

      // Check if session already exists in memory
      let sessionData = this.sessions.get(sessionId);

      if (!sessionData) {
        // First, check if session exists in database
        let dbSession = await SessionModel.findBySessionId(sessionId);

        if (dbSession) {
          // Session exists in database but not in memory - restore it
          console.log(
            `🔄 Restoring existing session from database for realtime: ${sessionId}`
          );
          const newSessionData: SessionData = {
            sessionId,
            userId: user!._id!.toString(),
            userEmail: userEmail,
            conversation: null, // Will be loaded if needed
            session: dbSession,
            lastActivity: Date.now(),
            isProcessing: false,
          };

          this.sessions.set(sessionId, newSessionData);
          sessionData = newSessionData;
        } else {
          // Session doesn't exist anywhere - create it
          console.log(`🆕 Creating new session for realtime: ${sessionId}`);

          // Create new session data
          const newSessionData: SessionData = {
            sessionId,
            userId: user!._id!.toString(),
            userEmail: userEmail,
            conversation: null,
            session: null,
            lastActivity: Date.now(),
            isProcessing: false,
          };

          // Add to memory first to prevent race conditions
          this.sessions.set(sessionId, newSessionData);
          sessionData = newSessionData;

          // Use findOrCreate to handle race conditions atomically
          try {
            dbSession = await SessionModel.findOrCreate({
              sessionId,
              userId: user!._id!.toString(),
              userEmail: userEmail,
              context: {
                userEngagement: 5, // Default engagement for realtime sessions
                conversationMood: "neutral",
              },
            });
            sessionData.session = dbSession;

            // Update user stats only for new sessions (check if this is actually new)
            if (
              dbSession.createdAt.getTime() === dbSession.updatedAt.getTime()
            ) {
              await UserActivityService.updateUserStats(user!._id!.toString(), {
                totalSessions: (user!.stats?.totalSessions || 0) + 1,
              });
            }

            console.log(
              `✅ Session created/retrieved successfully for realtime: ${sessionId}`
            );
          } catch (error: any) {
            console.error(`❌ Session creation error for realtime:`, error);
            throw error;
          }
        }

        // For realtime sessions, don't send greeting automatically - wait for client_ready
        console.log(
          `🎯 Realtime session created - waiting for client_ready message before sending greeting`
        );
      } else {
        // Resume existing session
        sessionData.lastActivity = Date.now();
        sessionData.userEmail = userEmail;
        sessionData.userId = user!._id!.toString();

        ws.send(
          JSON.stringify({
            type: "status",
            data: { message: "Session resumed for realtime" },
            timestamp: Date.now(),
          })
        );
      }

      // Generate ephemeral key for OpenAI Realtime API
      if (this.openaiRealtimeService && Config.isOpenAIRealtimeEnabled()) {
        try {
          const ephemeralKeyResponse =
            await this.openaiRealtimeService.generateEphemeralKey(
              sessionId,
              user!._id!.toString(),
              userEmail
            );

          ws.send(
            JSON.stringify({
              type: "realtime_session_response",
              data: ephemeralKeyResponse,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.error("Failed to generate ephemeral key:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              data: {
                message:
                  "Failed to generate ephemeral key for OpenAI Realtime API",
              },
              timestamp: Date.now(),
            })
          );
        }
      } else {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "OpenAI Realtime API is not enabled" },
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      console.error("Realtime session request error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: {
            message: "Failed to initialize realtime session. Please try again.",
          },
          timestamp: Date.now(),
        })
      );
    }
  }

  private async handleClientReadyRequest(
    sessionId: string,
    ws: WebSocket,
    message: any
  ): Promise<void> {
    try {
      const agentId = message.data?.agentId;
      console.log(`🔍 Agent ID: ${agentId}`);
      
      // Ensure session data exists in memory
      let sessionData = this.sessions.get(sessionId);
      console.log(`🔍 Session data: ${sessionData}`);
      
      if (!sessionData) {
        console.log(`⏳ Session not yet initialized for client ready request: ${sessionId}, initializing now`);
        
        // Try to get user email from the message or URL parameters
        const userEmail = message.data?.userEmail || message.userEmail;
        console.log(`🔍 User email: ${userEmail}`);
        if (!userEmail) {
          console.error(`❌ No user email provided in client ready request: ${sessionId}`);
          ws.send(
            JSON.stringify({
              type: "error",
              data: { message: "User email is required for client ready request" },
              timestamp: Date.now(),
            })
          );
          return;
        }
        
        // Initialize session data
        await this.initializeSession(sessionId, ws, userEmail);
        sessionData = this.sessions.get(sessionId);
        console.log(`🔍 Session data after initialization: ${sessionData}`);
        
        if (!sessionData) {
          console.error(`❌ Failed to initialize session data for: ${sessionId}`);
          ws.send(
            JSON.stringify({
              type: "error",
              data: { message: "Failed to initialize session" },
              timestamp: Date.now(),
            })
          );
          return;
        }
      }
      
      if (!agentId) {
        console.error(`❌ No agentId provided in client ready request`);
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Agent ID is required" },
            timestamp: Date.now(),
          })
        );
        return;
      }

      console.log(`🤖 Processing client ready request for session: ${sessionId}, agentId: ${agentId}`);

      // Fetch agent from database
      const agent = await NewAgentModel.getFormattedAgent(agentId);
      console.log(`🔍 Agent:`, agent);
      if (!agent) {
        console.error(`❌ Agent not found in database: ${agentId}`);
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: `Agent not found: ${agentId}` },
            timestamp: Date.now(),
          })
        );
        return;
      }

      // Get user information
      const user = await UserModel.findByEmail(sessionData.userEmail);
      console.log(`🔍 User:`, user);
      const userInfo = user ? await this.gatherUserInformation(user._id!.toString()) : {};
      console.log(`✅ Agent found: ${agent._id}, sections: ${agent.sections.length}`);
      console.log(`👤 User info:`, userInfo);

      // Save agentId into session for later persistence mapping
      const sessionForAgent = this.sessions.get(sessionId);
      if (sessionForAgent) {
        sessionForAgent.agentId = agentId;
      }

      // Send client ready response with agent and user info
      ws.send(
        JSON.stringify({
          type: "client_ready_response",
          sessionId,
          data: {
            agent: agent,
            userInfo: userInfo
          },
          timestamp: Date.now(),
        })
      );

      console.log(`✅ Client ready response sent successfully for session: ${sessionId}`);      

    } catch (error) {
      console.error("Client ready request handling error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Failed to handle client ready request. Please try again." },
          timestamp: Date.now(),
        })
      );
    }
  }

  private async handleTTSRequest(
    sessionId: string,
    ws: WebSocket,
    message: any
  ): Promise<void> {
    try {
      // Handle both message.text and message.data formats
      const text = message.text || message.data;
      if (!text) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Text is required for TTS request." },
            timestamp: Date.now(),
          })
        );
        return;
      }

      console.log(`🔊 TTS request for session ${sessionId}: "${text}"`);
      const ttsResponse = await this.audioService.textToSpeech(text);
      console.log(
        `🔊 TTS response received, audio length: ${ttsResponse.audio.length}, duration: ${ttsResponse.duration}ms`
      );

      const responseMessage = {
        type: "tts_response",
        sessionId,
        data: {
          text: text,
          audio: ttsResponse.audio,
          duration: ttsResponse.duration,
        },
        timestamp: Date.now(),
      };

      console.log(
        `📤 Sending TTS response, message size: ${JSON.stringify(responseMessage).length} characters`
      );
      ws.send(JSON.stringify(responseMessage));
      console.log(`✅ TTS response sent successfully`);
    } catch (error) {
      console.error("TTS request error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Failed to generate TTS. Please try again." },
          timestamp: Date.now(),
        })
      );
    }
  }

  private async handleUserMessage(
    sessionId: string,
    ws: WebSocket,
    message: any
  ): Promise<void> {
    try {
      // Support both current string payload and new structured payload
      const isStructured = message && message.data && typeof message.data === 'object' && message.data !== null;
      const promptForLLM: string = isStructured ? (message.data.prompt || '') : message.data;
      const userTranscript: string | undefined = isStructured ? (message.data.userTranscript || '') : undefined;
      // New structure supports conversationId; keep agentId for backward compatibility
      const meta = isStructured ? {
        conversationId: message.data.conversationId,
        agentId: message.data.agentId,
        sectionId: message.data.sectionId,
        intentId: message.data.intentId,
        intentPrompt: message.data.intentPrompt,
        sttConfidence: message.data.sttConfidence,
        sttAlternatives: message.data.sttAlternatives,
      } : undefined;

      const userText = promptForLLM;
      if (!userText) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "User message is required." },
            timestamp: Date.now(),
          })
        );
        return;
      }

      console.log(`💬 Processing user message for session ${sessionId}: "${userText}"`);

      // Create conversation prompt based on context
      const systemPrompt = this.getIntentSystemPrompt();

      // Call OpenAI API to get response
      console.log(`🤖 Calling OpenAI API for session ${sessionId}`);
      const aiResponse: IntentResponse = await this.aiService.generateAIResponse(systemPrompt, userText);

      // Ensure we always have a user-facing reply
      if (!aiResponse?.nextPrompt || !aiResponse.nextPrompt.trim()) {
        const fallback = this.buildUserFacingFollowUp(meta?.intentPrompt);
        aiResponse.nextPrompt = fallback;
      }

      // Send text response to client immediately (do not block on TTS/DB)
      ws.send(
        JSON.stringify({
          type: "ai_response",
          sessionId,
          data: {
            intentResponse: aiResponse,
          },
          timestamp: Date.now(),
        })
      );
      console.log(`✅ AI response (text) sent immediately for session: ${sessionId}`);

      // Track simple intent progression id for mapping when FE ids are numeric
      const sessionForIntent = this.sessions.get(sessionId);
      if (sessionForIntent) {
        // If the AI returns a numeric id, store it as currentIntent for future mapping
        if (aiResponse?.id) {
          sessionForIntent.currentIntent = {
            id: String(aiResponse.id),
            type: '',
            fieldsToExtract: [],
            nextIntent: ''
          };
        }
      }

      // Persist per-intent response in background efficiently
      {
        const sessionData = this.sessions.get(sessionId);
        if (sessionData) {
          const effectiveIntentId = (meta?.intentId as any) || aiResponse?.id || this.extractIntentIdFromPrompt(promptForLLM) || '';
          const shouldPersist = !!effectiveIntentId && ((aiResponse?.fields && Object.keys(aiResponse.fields).length > 0) || !!aiResponse?.isCompleted);
          if (shouldPersist) {
            const payload = {
              userId: sessionData.userId,
              sessionId: sessionData.sessionId,
              agentId: String(meta?.agentId || sessionData.agentId || ''), // backward compatible; model maps internally
              conversationId: String((meta as any)?.conversationId || ''), // optional new mapping
              sectionId: String(meta?.sectionId || ''), // may be empty if not provided
              intentId: String(effectiveIntentId),
              intentPrompt: String(meta?.intentPrompt || ''),
              userTranscript: String(userTranscript || this.extractLatestResponseFromPrompt(promptForLLM) || ''),
              fields: aiResponse?.fields || {},
              isCompleted: !!aiResponse?.isCompleted,
            } as any;

            IntentBuilderResponseModel.createOrAppend(payload).catch((persistErr: any) => {
              console.error('Failed to persist intent response:', persistErr);
            });
          }
        }
      }

      // Extract and save meal/food data in background if intent is completed
      if (aiResponse.isCompleted && aiResponse.fields) {
        (async () => {
          const sessionData = this.sessions.get(sessionId);
          if (!sessionData) return;

          // Extract fields
          let mealTypeRaw = aiResponse.fields.mealType || aiResponse.fields.meal_type;
          let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined = undefined;
          if (["breakfast", "lunch", "dinner", "snack"].includes((mealTypeRaw || '').toLowerCase())) {
            mealType = (mealTypeRaw || '').toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack';
          }
          let foodsLoggedRaw = aiResponse.fields.foodsLogged || aiResponse.fields.foods_logged;
          let foodsLogged: string[] = [];
          if (typeof foodsLoggedRaw === 'string') {
            try {
              foodsLogged = JSON.parse(foodsLoggedRaw);
            } catch {
              foodsLogged = foodsLoggedRaw.split(',').map((f: string) => f.trim()).filter(Boolean);
            }
          }
          if (!Array.isArray(foodsLogged)) foodsLogged = [];
          const totalCalories = Number(aiResponse.fields.totalCalories || aiResponse.fields.calories || 0);
          const totalProtein = Number(aiResponse.fields.totalProtein || aiResponse.fields.protein || 0);
          const totalCarbs = Number(aiResponse.fields.totalCarbs || aiResponse.fields.carbs || 0);
          const totalFat = Number(aiResponse.fields.totalFat || aiResponse.fields.fat || 0);

          // Update conversation summary only if mealType is valid
          if (mealType) {
            await ConversationModel.updateSummary(sessionId, {
              mealType,
              foodsLogged,
              totalCalories,
              completionStatus: "complete",
              isCompleteMeal: true,
            });
          }

          // Create food entry if valid
          if (mealType && foodsLogged.length > 0) {
            let foods: any[] = foodsLogged;
            if (typeof foods[0] === 'string') {
              foods = foods.map((name: string) => ({
                name,
                quantity: 1,
                unit: '',
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
              }));
            }
            await FoodEntryModel.create({
              userId: sessionData.userId,
              mealType,
              foods,
              totalCalories,
              totalProtein,
              totalCarbs,
              totalFat,
            });
          }
        })().catch((error: any) => {
          console.error('Failed background meal/food persistence:', error);
        });
      }

      // TTS in background; send tts_response when ready
      if (aiResponse.nextPrompt) {
        console.log(`🎵 Converting AI response to speech (background) for session ${sessionId}`);
        this.audioService
          .textToSpeech(aiResponse.nextPrompt)
          .then((ttsResponse: any) => {
            ws.send(
              JSON.stringify({
                type: "tts_response",
                sessionId,
                data: {
                  text: aiResponse.nextPrompt,
                  audio: ttsResponse.audio,
                  duration: ttsResponse.duration,
                },
                timestamp: Date.now(),
              })
            );
          })
          .catch((error: any) => {
            console.error("TTS request error (background):", error);
          });
      }

      // Store conversation in database in background
      const sessionDataForStore = this.sessions.get(sessionId);
      this.storeConversationMessage(
        sessionId,
        sessionDataForStore?.userId || message.userId,
        isStructured ? (userTranscript || '') : userText,
        aiResponse.nextPrompt
      ).catch((error: any) => {
        console.error('Error storing conversation (background):', error);
      });

      console.log(`🚀 Background tasks scheduled for session: ${sessionId}`);

    } catch (error) {
      console.error("User message handling error:", error);
      // Graceful fallback response so user doesn't see silence
      const fallbackText = this.buildUserFacingFollowUp((message?.data && message.data.intentPrompt) || undefined);
      const fallbackResponse = {
        id: String((message?.data && message.data.intentId) || ''),
        isCompleted: false,
        fields: {},
        nextPrompt: fallbackText,
      } as IntentResponse;

      // Send fallback ai response
      try {
        ws.send(
          JSON.stringify({
            type: "ai_response",
            sessionId,
            data: { intentResponse: fallbackResponse },
            timestamp: Date.now(),
          })
        );
      } catch (sendErr) {
        console.error('Failed to send fallback ai_response:', sendErr);
      }

      // Try TTS in background for fallback
      if (fallbackText) {
        this.audioService
          .textToSpeech(fallbackText)
          .then((ttsResponse: any) => {
            ws.send(
              JSON.stringify({
                type: "tts_response",
                sessionId,
                data: { text: fallbackText, audio: ttsResponse.audio, duration: ttsResponse.duration },
                timestamp: Date.now(),
              })
            );
          })
          .catch((ttsErr: any) => console.error('Fallback TTS failed:', ttsErr));
      }

      // Also notify client of error for observability (non-blocking UI toast)
      try {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "AI had trouble formatting a reply. Sent a fallback prompt." },
            timestamp: Date.now(),
          })
          
        );
      } catch {}
    }
  }

  private getIntentSystemPrompt(): string {

    let prompt = `You are a conversational agent designed to process structured intent and engage with the user in a natural, engaging, and human-like way.
        For every user input:
        1. Review the current intent and identify the expected fields to extract.
        2. Use the conversation history and the latest user input to determine whether the current intent is completed.
        3. If the intent is **incomplete**, ask a friendly, empathetic follow-up question to gather the missing data. Personalize your question if possible using prior context.
        4. If the intent is **complete**:
          - Set 'isCompleted: true'
          - Extract the field values
          - Respond with a **natural, human-like remark or lighthearted comment** based on the user's input (e.g., show enthusiasm, curiosity, appreciation, or warmth).
          - Then, smoothly transition into the next topic by providing a warm 'nextPrompt'.

        5. If there is no follow-up needed, leave 'nextPrompt' as an empty string.
        6. - Current Intent is the priority, only if it is completed, then move to next intent.

        Tone guidelines:        
        - Use friendly, emotionally intelligent language — like a caring companion, not a robot.        
        - Add micro reactions, compliments, or soft humor where it helps build rapport.
        - Never rush — value each user response with a thoughtful reply.
        - Maintain clarity and purpose without sounding overly scripted.
        - Never use emojis
        - Keep sentences short and conversational.
        - Use ellipses ('...') for soft, thoughtful pauses.
        - Use line breaks to separate ideas clearly.
        - Avoid long, run-on sentences.
        - End thoughts with a natural pause before transitioning.

        Always make the user feel you're present, attentive, and happy to chat.
        Your OUTPUT must strictly follow this JSON format:
        {
          "id": "<Intent ID>",
          "isCompleted": true | false,
          "fields": {
            "<fieldName>": "<extractedValue>"
          },
          "nextPrompt": "<follow-up or transition to next intent, or empty string>"
        }
        
        CRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks (\`\`\`json), do NOT add any explanations, do NOT include any text before or after the JSON. Return the JSON object directly as plain text.`;

    return prompt;
  }

  private extractLatestResponseFromPrompt(prompt: string): string | null {
    if (!prompt) return null;
    try {
      // Look for the marker used in FE prompt construction
      const marker = "User's latest response:";
      const idx = prompt.indexOf(marker);
      if (idx === -1) return null;
      // Extract substring after marker
      const after = prompt.slice(idx + marker.length);
      // Remove leading newlines/spaces
      const trimmed = after.replace(/^\s+/, '');
      // Take until the next blank line or end of string
      const match = trimmed.match(/^[\s\S]*?(?=\n\n|$)/);
      const captured = match ? match[0].trim() : trimmed.trim();
      return captured || null;
    } catch {
      return null;
    }
  }

  // Extract intent id from the structured text prompt when metadata is not provided
  private extractIntentIdFromPrompt(prompt: string | undefined): string | null {
    if (!prompt || typeof prompt !== 'string') return null;
    try {
      // Expecting a header like: "Intent ID:\n<id>" near the start of the prompt
      const idHeaderIndex = prompt.indexOf('Intent ID:');
      if (idHeaderIndex === -1) return null;
      const after = prompt.slice(idHeaderIndex + 'Intent ID:'.length);
      // Capture the next non-empty line as the id
      const lines = after.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return null;
      const candidate = lines[0];
      // Accept numeric or string id
      return candidate;
    } catch {
      return null;
    }
  }

  private buildUserFacingFollowUp(intentPrompt?: string): string {
    const defaultMsg = 'Could you please clarify or provide more details?';
    if (!intentPrompt || typeof intentPrompt !== 'string') return defaultMsg;
    const cleaned = intentPrompt.trim();
    if (!cleaned) return defaultMsg;
    const endsWithQuestion = /\?[\s]*$/.test(cleaned);
    return endsWithQuestion ? cleaned : `${cleaned}?`;
  }

  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    } else if (hour < 17) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  }

  private getCurrentMealContext(): string {
    const hour = new Date().getHours();
    if (hour < 11) return "breakfast";
    if (hour < 16) return "lunch";
    if (hour < 21) return "dinner";
    return "snack";
  }

  private async storeConversationMessage(
    sessionId: string,
    userId: string,
    userText: string,
    aiText: string
  ): Promise<void> {
    try {
      // Create or update conversation record
      let conversation = await ConversationModel.findBySessionId(sessionId);

      if (!conversation) {
        conversation = await ConversationModel.create({
          sessionId,
          userId: userId,
          messages: [
            {
              type: "user",
              content: userText,
              timestamp: new Date(),
              metadata: {
                mealContext: this.getCurrentMealContext(),
                sentiment: "neutral",
              },
            },
            {
              type: "ai",
              content: aiText,
              timestamp: new Date(),
              metadata: {
                mealContext: this.getCurrentMealContext(),
                sentiment: "positive",
              },
            },
          ],
        });
      } else {
        // Add user message
        await ConversationModel.addMessage(sessionId, {
          type: "user",
          content: userText,
          timestamp: new Date(),
          metadata: {
            mealContext: this.getCurrentMealContext(),
            sentiment: "neutral",
          },
        });

        // Add AI message
        await ConversationModel.addMessage(sessionId, {
          type: "ai",
          content: aiText,
          timestamp: new Date(),
          metadata: {
            mealContext: this.getCurrentMealContext(),
            sentiment: "positive",
          },
        });
      }

      console.log(`✅ Conversation stored for session: ${sessionId}`);
    } catch (error) {
      console.error("Error storing conversation:", error);
    }
  }

  private cleanupSession(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData) {
      // Complete the session in database
      if (sessionData.session) {
        SessionModel.completeSession(sessionId).catch((error) => {
          console.error("Error completing session:", error);
        });
      }

      // Clean up rate limiting for this user if no other sessions exist
      const userId = sessionData.userId;
      if (userId) {
        const hasOtherSessions = Array.from(this.sessions.values()).some(
          (session) => session.userId === userId
        );
        if (!hasOtherSessions) {
          this.lastGreetingRequests.delete(userId);
        }
      }

      this.sessions.delete(sessionId);
      console.log(`🧹 Cleaned up session: ${sessionId}`);
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [sessionId, sessionData] of this.sessions.entries()) {
        if (now - sessionData.lastActivity > timeout) {
          console.log(`⏰ Session timeout: ${sessionId}`);
          this.cleanupSession(sessionId);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  public getStats(): any {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter((s) => !s.isProcessing);
    const processingSessions = sessions.filter((s) => s.isProcessing);

    return {
      connectedClients: this.sessions.size,
      activeSessions: activeSessions.length,
      processingSessions: processingSessions.length,
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        userId: s.userId,
        userEmail: s.userEmail,
        lastActivity: s.lastActivity,
        isProcessing: s.isProcessing,
      })),
    };
  }

  public close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.wss.close();
    console.log("🛑 AudioStreamingServer closed");
  }

  private estimateDuration(text: string): number {
    // Rough estimate: 150 words per minute
    const words = text.split(" ").length;
    return Math.max(1000, (words / 150) * 60 * 1000);
  }

  /**
   * Strip SSML tags from text for frontend display
   * @param text - Text that may contain SSML tags
   * @returns Clean text without SSML tags
   */
  private stripSSMLTags(text: string): string {
    if (!text || typeof text !== "string") {
      return text;
    }

    // Remove SSML tags while preserving the text content
    return (
      text
        // Remove <speak> and </speak> tags
        .replace(/<\/?speak>/gi, "")
        // Remove <break> tags with their attributes
        .replace(/<break[^>]*>/gi, "")
        // Remove <prosody> tags with their attributes
        .replace(/<\/?prosody[^>]*>/gi, "")
        // Remove <emphasis> tags with their attributes
        .replace(/<\/?emphasis[^>]*>/gi, "")
        // Remove any other SSML tags that might be present
        .replace(/<\/?[^>]+>/g, "")
        // Clean up extra whitespace
        .replace(/\s+/g, " ")
        .trim()
    );
  }
}
