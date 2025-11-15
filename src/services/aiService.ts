import { GoogleGenerativeAI } from "@google/generative-ai";
import { toZonedTime } from "date-fns-tz";
import OpenAI from "openai";
import { Config } from "../config/config";
import { IConversation, IMessage } from "../models/Conversation";
import { IUser } from "../models/User";
import { UserRecentActivity } from "./userActivityService";

export interface AIResponse {
  text: string;
  shouldEndSession: boolean;
  mealCompleted?: boolean;
  sentiment?: "positive" | "neutral" | "negative";
  mealContext?: string;
}

export interface IntentResponse {
  id: string;
  isCompleted: boolean;
  fields: Record<string, string>;
  nextPrompt: string;
}

export class AIService {
  private genAI?: GoogleGenerativeAI;
  private openai?: OpenAI;
  private geminiModel?: any;
  private responseCache: Map<string, AIResponse> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize Gemini
    const geminiApiKey = Config.GEMINI_API_KEY;
    if (geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.geminiModel = this.genAI.getGenerativeModel({
        model: Config.GEMINI_MODEL,
        generationConfig: {
          temperature: Config.AI_TEMPERATURE,        
          maxOutputTokens: Math.max(Config.AI_MAX_TOKENS, 4000), // Ensure minimum 4000 tokens for JSON responses
          candidateCount: 1,
        },
      });
    }

    // Initialize OpenAI
    const openaiApiKey = Config.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
      });
    }

    // Test the connection
    this.testConnection();

    // Clean up cache periodically
    setInterval(() => this.cleanupCache(), this.cacheTimeout);
  }

  private async testConnection(): Promise<void> {
    try {
      console.log("🔍 Testing AI API connection...");
      if (this.geminiModel) {
        console.log("🔍 Testing Gemini API connection...");
        const result = await this.geminiModel.generateContent("Hello");
        const response = await result.response;
        console.log("✅ Gemini API connection successful");
      }

      if (this.openai) {
        console.log("🔍 Testing OpenAI API connection...");
        await this.openai.chat.completions.create({
          model: Config.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 10,
        });
        console.log("✅ OpenAI API connection successful");
      }
    } catch (error) {
      console.error("❌ AI API connection failed:", error);
      console.error(
        "Please check your API keys and ensure they have access to the models"
      );
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - (value as any).timestamp > this.cacheTimeout) {
        this.responseCache.delete(key);
      }
    }
  }

  public async converseWithAI(
  systemPrompt: string,
  userMessage: string
  ): Promise<string> {  

      // Try OpenAI first if available and configured
      if (this.openai && Config.AI_PROVIDER === "openai") {
        try {
          const completion = await this.openai.chat.completions.create({
            model: Config.OPENAI_MODEL,
            messages: [          
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            max_tokens: Config.AI_MAX_TOKENS,
            temperature: Config.AI_TEMPERATURE,
          });
  
          const text = completion.choices[0]?.message?.content?.trim() || "";
  
          return text;
        } catch (error) {
          console.error("OpenAI request failed, falling back to Gemini:", error);
        }
      }

      // Fallback to Gemini
      if (this.geminiModel) {
        try {
          // Use Gemini's generateContent with proper system prompt handling
          const fullPrompt = systemPrompt 
            ? `${systemPrompt}\n\nUser: ${userMessage}`
            : userMessage;
          
          const result = await this.geminiModel.generateContent(fullPrompt);
          const response = result.response;
          const text = response.text().trim();

          return text;
        } catch (error) {
          console.error("Gemini generateContent failed:", error);
          throw error;
        }
      }

      throw new Error(
        "No AI provider available. Please configure either OpenAI or Gemini API keys."
      );
  }

  public async generateAIResponse(    
    systemPrompt: string,
    userMessage: string,    
  ): Promise<IntentResponse> {
    // Try OpenAI first if available and configured
    if (this.openai && Config.AI_PROVIDER === "openai") {
      try {
        const enhancedSystemPrompt = systemPrompt 
          ? `${systemPrompt}\n\nCRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks (\`\`\`json), do NOT add any explanations, do NOT include any text before or after the JSON. Return the JSON object directly as plain text.`
          : `CRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks (\`\`\`json), do NOT add any explanations, do NOT include any text before or after the JSON. Return the JSON object directly as plain text.`;
        
        const completion = await this.openai.chat.completions.create({
          model: Config.OPENAI_MODEL,
          messages: [          
            { role: "system", content: enhancedSystemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: Math.max(Config.AI_MAX_TOKENS, 4000), // Ensure minimum 4000 tokens for JSON responses
          temperature: Config.AI_TEMPERATURE,
        });

        const text = completion.choices[0]?.message?.content?.trim() || "";

        try {
          const cleanedText = this.cleanJsonResponse(text);
          const parsedResponse = JSON.parse(cleanedText) as IntentResponse;
          
          // Validate the response structure
          if (!parsedResponse.id || typeof parsedResponse.isCompleted !== 'boolean') {
            throw new Error("Invalid intent response structure");
          }
          
          return parsedResponse;
        } catch (parseError) {
          console.error("Failed to parse JSON response from OpenAI:", parseError);
          console.error("Raw response:", text);
          console.error("Cleaned response:", this.cleanJsonResponse(text));
          throw new Error("Invalid JSON response from AI");
        }
      } catch (error) {
        console.error("OpenAI request failed, falling back to Gemini:", error);
      }
    }

    // Fallback to Gemini
    if (this.geminiModel) {
      try {
        // Use Gemini's generateContent with proper system prompt handling
        const enhancedSystemPrompt = systemPrompt 
          ? `${systemPrompt}\n\nCRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks (\`\`\`json), do NOT add any explanations, do NOT include any text before or after the JSON. Return the JSON object directly as plain text.`
          : `CRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks (\`\`\`json), do NOT add any explanations, do NOT include any text before or after the JSON. Return the JSON object directly as plain text.`;
        
        const fullPrompt = enhancedSystemPrompt 
          ? `${enhancedSystemPrompt}\n\nUser: ${userMessage}`
          : userMessage;
        
        const result = await this.geminiModel.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text().trim();        
        
        try {
          const cleanedText = this.cleanJsonResponse(text);
          console.log("Cleaned response:", cleanedText);
          const parsedResponse = JSON.parse(cleanedText) as IntentResponse;
          
          // Validate the response structure
          if (!parsedResponse.id || typeof parsedResponse.isCompleted !== 'boolean') {
            throw new Error("Invalid intent response structure");
          }
          
          return parsedResponse;
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError);
          console.error("Raw response:", text);
          console.error("Cleaned response:", this.cleanJsonResponse(text));
          throw new Error("Invalid JSON response from AI");
        }
      } catch (error) {
        console.error("Gemini generateContent failed:", error);
        throw error;
      }
    }

    throw new Error(
      "No AI provider available. Please configure either OpenAI or Gemini API keys."
    );
  }

  

  async generateAIPoweredGreeting(
    user: IUser,
    todayConversations: IConversation[],
    recentConversations: IConversation[]
  ): Promise<string> {
    let lastError: any = null;

    // Try AI-powered greeting with retries
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(
          `🤖 AI greeting attempt ${attempt}/3 for user: ${user.firstName}`
        );

        // Prepare context for AI
        const context = this.prepareGreetingContext(
          user,
          todayConversations,
          recentConversations
        );

        // Generate greeting using AI with timeout
        const prompt = this.createGreetingPrompt(context);
        const aiResponse = await Promise.race([
          this.generateAIResponse('', prompt),
          new Promise<IntentResponse>((_, reject) =>
            setTimeout(() => reject(new Error("AI greeting timeout")), 8000)
          ),
        ]);

        console.log(`✅ AI greeting successful on attempt ${attempt}`);
        return aiResponse.nextPrompt;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ AI greeting attempt ${attempt} failed:`, {
          message: error.message,
          user: user.firstName,
          attempt: attempt,
        });

        // Don't retry for authentication errors
        if (
          error.message?.includes("API key") ||
          error.message?.includes("authentication")
        ) {
          console.error(
            "AI Greeting Error: Authentication failed - using fallback"
          );
          break;
        }

        // For timeout or network errors, retry if we have attempts left
        if (attempt < 3) {
          console.log(`🔄 Retrying AI greeting in 1000ms...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        break;
      }
    }
    return "Hello";
  }

  private prepareGreetingContext(
    user: IUser,
    todayConversations: IConversation[],
    recentConversations: IConversation[]
  ): any {
    const timeGreeting = this.getTimeBasedGreeting(user);
    const currentMeal = this.getCurrentMealContext(user);

    // Check if user has conversations today
    const hasTodayConversations = todayConversations.length > 0;

    // Get today's meal information
    let todayMealInfo = null;
    if (hasTodayConversations && todayConversations[0]) {
      const lastTodayConversation = todayConversations[0]; // Most recent
      todayMealInfo = {
        mealType: lastTodayConversation.summary?.mealType,
        isComplete: lastTodayConversation.summary?.isCompleteMeal || false,
        completionStatus: lastTodayConversation.summary?.completionStatus,
        foodsLogged: lastTodayConversation.summary?.foodsLogged || [],
        messages: lastTodayConversation.messages.slice(-5), // Last 5 messages for context
      };
    }

    // Get recent meal history (last 3 days)
    const recentMeals = recentConversations
      .filter((conv) => conv.summary?.mealType)
      .slice(0, 5)
      .map((conv) => ({
        mealType: conv.summary?.mealType,
        isComplete: conv.summary?.isCompleteMeal || false,
        foodsLogged: conv.summary?.foodsLogged || [],
        date: conv.createdAt,
      }));

    // Calculate days since last conversation
    let daysSinceLastConversation = 0;
    let lastConversationDate = null;
    if (recentConversations.length > 0) {
      const lastConversation = recentConversations[0]; // Most recent
      if (lastConversation) {
        lastConversationDate = new Date(lastConversation.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastConversationDate.getTime());
        daysSinceLastConversation = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    // Determine the next meal to suggest
    let nextMealSuggestion = currentMeal;
    if (hasTodayConversations && todayMealInfo?.mealType) {
      nextMealSuggestion = AIService.getNextMealType(todayMealInfo.mealType);
    }

    return {
      userName: user.firstName,
      timeGreeting,
      currentMeal,
      hasTodayConversations,
      todayMealInfo,
      recentMeals,
      isFirstTime: recentConversations.length === 0,
      daysSinceLastConversation,
      lastConversationDate,
      nextMealSuggestion,
    };
  }

  private createGreetingPrompt(context: any): string {
    const {
      userName,
      timeGreeting,
      currentMeal,
      hasTodayConversations,
      todayMealInfo,
      recentMeals,
      isFirstTime,
      daysSinceLastConversation,
      nextMealSuggestion,
    } = context;

    let prompt = `You are Ameya, a friendly voice-powered diet tracking assistant.
    You converse with the user to get their meal details.
Generate a personalized greeting based on the user's context.

User Context:
- Name: ${userName}
- Time: ${timeGreeting}
- Current meal time: ${currentMeal}
- First time user: ${isFirstTime}
- Has conversations today: ${hasTodayConversations}
- Days since last conversation: ${daysSinceLastConversation}
- Next meal suggestion: ${nextMealSuggestion}

`;

    if (isFirstTime) {
      prompt += `
1. Introduces yourself as Ameya, their voice-powered diet tracking assistant
2. Explains your capabilities:
   - You help track meals naturally through conversation      

3. Explains how they can interact with you:   
   - Use natural language like "I had a small bowl of rice with curry"
   - You'll ask follow-up questions to get complete information  

4. Emphasizes privacy and data security:
   - You only track essential food log data (food items and quantities)
   - No personally identifiable information is stored

5. Suggests starting with their ${currentMeal}

Make it warm, encouraging, and make them feel comfortable about sharing their meals with you.`;
    } else if (hasTodayConversations && todayMealInfo) {
      prompt += `Today's meal information:
    - Last meal logged: ${todayMealInfo.mealType}
    - Is complete: ${todayMealInfo.isComplete}
    - Foods logged: ${todayMealInfo.foodsLogged.join(", ")}

Create a greeting that:
1. Acknowledges their progress today with the ${todayMealInfo.mealType}
2. Warmly welcomes them back for another session
3. Suggests the next logical meal (${nextMealSuggestion}) based on what they've already logged
4. Encourages them to continue their meal tracking journey
5. Keep it conversational and supportive

Focus on continuity and progress rather than starting fresh.`;
    } else {
      prompt += `User is an existing user returning after ${daysSinceLastConversation} day${daysSinceLastConversation !== 1 ? 's' : ''}.
Create a greeting that:
1. Warmly welcomes them back with appropriate enthusiasm based on how long they've been away
2. If they've been away for more than 2 days, acknowledge the gap and express that you've missed them
3. If it's been just a day or less, keep it casual and friendly
4. Based on the current time (${timeGreeting}), suggest starting with their ${currentMeal}
6. Make them feel valued and encourage them to continue their meal tracking

Keep it warm, personal, and focused on getting them back into their meal tracking routine.`;
    }

    prompt += `

IMPORTANT REQUIREMENTS:
- Be warm, natural, and supportive
- Use conversational language that sounds human
- Reference their meal progress appropriately
- Suggest the next logical meal or action
- Keep it concise but engaging
- Make them feel valued and comfortable
- Focus on continuity and progress
- Dont use any emojis
- Make it short and concise

Generate the greeting:`;

    return prompt;
  }

  

  private getCurrentMealContext(user?: IUser): string {
    // Get user's timezone, default to UTC if not set
    const userTimezone = user?.preferences?.timezone || "UTC";
    const now = new Date();
    const userNow = toZonedTime(now, userTimezone);
    const hour = userNow.getHours();

    if (hour < 11) return "breakfast";
    if (hour < 16) return "lunch";
    if (hour < 21) return "dinner";
    return "a snack";
  }

  private getNextMealSuggestion(lastMeal?: any): string {
    if (!lastMeal) {
      const hour = new Date().getHours();
      if (hour < 11) return "breakfast";
      if (hour < 16) return "lunch";
      if (hour < 21) return "dinner";
      return "snack";
    }

    return AIService.getNextMealType(lastMeal.mealType);
  }  

  private getTimeBasedGreeting(user?: IUser): string {
    // Get user's timezone, default to UTC if not set
    const userTimezone = user?.preferences?.timezone || "UTC";
    const now = new Date();
    const userNow = toZonedTime(now, userTimezone);
    const hour = userNow.getHours();

    if (hour < 12) {
      return "Good morning";
    } else if (hour < 17) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  }

  private getMealContext(messages: IMessage[]): string {
    const userMessages = messages.filter((m) => m.type === "user");
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (!lastUserMessage) {
      return "Starting fresh conversation - ready to help track meals!";
    }

    const content = lastUserMessage.content.toLowerCase();

    if (content.includes("breakfast") || content.includes("morning")) {
      return "User is logging breakfast - ask about specific foods and quantities";
    } else if (content.includes("lunch") || content.includes("noon")) {
      return "User is logging lunch - ask about specific foods and quantities";
    } else if (
      content.includes("dinner") ||
      content.includes("evening") ||
      content.includes("night")
    ) {
      return "User is logging dinner - ask about specific foods and quantities";
    } else if (content.includes("snack")) {
      return "User is logging snacks - ask about specific foods and quantities";
    } else if (
      content.includes("done") ||
      content.includes("finished") ||
      content.includes("complete")
    ) {
      return "User wants to end the session - provide a friendly goodbye";
    }

    return "Continuing meal logging conversation - be engaging and ask follow-up questions";
  }

  private generateCacheKey(
    userMessage: string,
    conversationHistory: IMessage[],
    userName?: string
  ): string {
    const recentMessages = conversationHistory
      .slice(-2)
      .map((m) => m.content)
      .join("|");
    return `${userName || "unknown"}|${userMessage}|${recentMessages}`;
  }

  private shouldEndSession(aiResponse: string, userMessage: string): boolean {
    const endPhrases = [
      "goodbye",
      "bye",
      "see you",
      "end session",
      "finished",
      "done",
      "complete",
      "thank you",
      "thanks",
      "that's all",
      "that is all",
    ];

    const userLower = userMessage.toLowerCase();
    const aiLower = aiResponse.toLowerCase();

    return endPhrases.some(
      (phrase) => userLower.includes(phrase) || aiLower.includes(phrase)
    );
  }

  private isMealCompleted(aiResponse: string): boolean {
    const completionPhrases = [
      "breakfast is logged",
      "lunch is logged",
      "dinner is logged",
      "snack is logged",
      "meal is complete",
      "logged successfully",
      "saved your meal",
      "logged your meal",
      "logged your meal successfully",
    ];

    const responseLower = aiResponse.toLowerCase();
    return completionPhrases.some((phrase) => responseLower.includes(phrase));
  }

  private analyzeSentiment(text: string): "positive" | "neutral" | "negative" {
    const positiveWords = [
      "good",
      "great",
      "awesome",
      "love",
      "enjoy",
      "delicious",
      "amazing",
      "perfect",
      "wonderful",
      "excellent",
      "fantastic",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "hate",
      "dislike",
      "awful",
      "sick",
      "tired",
      "horrible",
      "disgusting",
      "worst",
    ];

    const words = text.toLowerCase().split(" ");
    const positiveCount = words.filter((word) =>
      positiveWords.includes(word)
    ).length;
    const negativeCount = words.filter((word) =>
      negativeWords.includes(word)
    ).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  private extractMealContext(text: string): string {
    const textLower = text.toLowerCase();

    if (textLower.includes("breakfast")) return "breakfast";
    if (textLower.includes("lunch")) return "lunch";
    if (textLower.includes("dinner")) return "dinner";
    if (textLower.includes("snack")) return "snack";

    return "general";
  }

  private static getNextMealType(lastMealType?: string): string {
    const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
    const currentIndex = mealOrder.indexOf(lastMealType || "");
    const nextIndex = (currentIndex + 1) % mealOrder.length;
    return mealOrder[nextIndex] || "breakfast";
  }

  private static getMealContext(lastMealType?: string): string {
    const contexts: Record<string, string> = {
      breakfast: "Great! Let's plan your lunch next",
      lunch: "Perfect! What's on the menu for dinner?",
      dinner: "Excellent! Don't forget about healthy snacks",
      snack: "Wonderful! Let's start fresh with breakfast tomorrow",
    };

    if (!lastMealType || !(lastMealType in contexts)) {
      return "Let's continue with your next meal";
    }

    return contexts[lastMealType] || "Let's continue with your next meal";
  }

  private static getCurrentDay(): string {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayIndex = new Date().getDay();
    return days[dayIndex] || "today";
  }

  private static getRandomGreeting(): string {
    const greetings = [
      "Hello",
      "Hi there",
      "Good to see you",
      "Welcome back",
      "Hey",
    ];
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex] || "Hello";
  }

  private cleanJsonResponse(text: string): string {
    if (!text) return text;
    // Remove all code block markers and language tags, anywhere in the string
    return text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
  }
}
