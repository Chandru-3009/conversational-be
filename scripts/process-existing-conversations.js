const { MongoClient } = require('mongodb');
const { Config } = require('../dist/config/config');
const { AIService } = require('../dist/services/aiService');

class ConversationProcessor {
    constructor() {
        this.client = null;
        this.db = null;
        this.aiService = new AIService();
    }

    async connect() {
        try {
            this.client = new MongoClient(Config.MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db('nutrina');
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('✅ Disconnected from MongoDB');
        }
    }

    async processExistingConversations() {
        try {
            console.log('🔄 Processing existing conversations...\n');

            // Get all completed conversations that don't have food entries
            const conversations = await this.db.collection('conversations').find({
                'summary.completionStatus': 'complete',
                'summary.isCompleteMeal': true
            }).toArray();

            console.log(`📊 Found ${conversations.length} completed conversations to process`);

            let processedCount = 0;
            let successCount = 0;
            let errorCount = 0;

            for (const conversation of conversations) {
                try {
                    console.log(`\n🔄 Processing conversation: ${conversation.sessionId}`);

                    // Check if food entry already exists for this conversation
                    const existingEntry = await this.db.collection('foodEntries').findOne({
                        userId: conversation.userId,
                        date: {
                            $gte: new Date(conversation.createdAt.getTime() - 24 * 60 * 60 * 1000), // Within 24 hours
                            $lte: new Date(conversation.createdAt.getTime() + 24 * 60 * 60 * 1000)
                        }
                    });

                    if (existingEntry) {
                        console.log(`⏭️ Food entry already exists for this conversation, skipping`);
                        continue;
                    }

                    // Extract meal information
                    const mealInfo = await this.extractMealFromConversation(conversation);

                    if (mealInfo && mealInfo.foods && mealInfo.foods.length > 0) {
                        // Create food entry
                        await this.db.collection('foodEntries').insertOne(mealInfo);

                        // Update conversation summary with extracted foods
                        await this.db.collection('conversations').updateOne(
                            { _id: conversation._id },
                            {
                                $set: {
                                    'summary.foodsLogged': mealInfo.foods.map(f => f.name),
                                    'summary.totalCalories': mealInfo.totalCalories
                                }
                            }
                        );

                        // Update user stats
                        await this.db.collection('users').updateOne(
                            { _id: conversation.userId },
                            {
                                $inc: { 'stats.totalMeals': 1 },
                                $set: { 'stats.lastActive': new Date() }
                            }
                        );

                        console.log(`✅ Created food entry with ${mealInfo.foods.length} items`);
                        console.log(`   Foods: ${mealInfo.foods.map(f => `${f.quantity} ${f.name}`).join(', ')}`);
                        console.log(`   Total Calories: ${mealInfo.totalCalories}`);

                        successCount++;
                    } else {
                        console.log(`⚠️ No food items extracted from conversation`);
                    }

                    processedCount++;

                    // Add small delay to avoid overwhelming the AI service
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    console.error(`❌ Error processing conversation ${conversation.sessionId}:`, error.message);
                    errorCount++;
                }
            }

            console.log(`\n📊 Processing Summary:`);
            console.log(`   Total conversations: ${conversations.length}`);
            console.log(`   Processed: ${processedCount}`);
            console.log(`   Successful: ${successCount}`);
            console.log(`   Errors: ${errorCount}`);

        } catch (error) {
            console.error('❌ Error processing conversations:', error);
            throw error;
        }
    }

    async extractMealFromConversation(conversation) {
        try {
            const userMessages = conversation.messages.filter((m) => m.type === "user");
            if (userMessages.length === 0) return null;

            // Get all user messages to provide full context
            const userInput = userMessages.map(m => m.content).join(" | ");

            // Determine meal type from conversation context
            const mealType = this.determineMealType(conversation);

            // Use AI to extract food items
            const extractedFoods = await this.extractFoodItemsWithAI(userInput, mealType);

            if (!extractedFoods || extractedFoods.length === 0) {
                console.log("No food items extracted from conversation");
                return null;
            }

            // Calculate totals
            const totals = this.calculateNutritionalTotals(extractedFoods);

            return {
                userId: conversation.userId,
                mealType,
                foods: extractedFoods,
                totalCalories: totals.calories,
                totalProtein: totals.protein,
                totalCarbs: totals.carbs,
                totalFat: totals.fat,
                date: conversation.createdAt,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        } catch (error) {
            console.error("Error extracting meal from conversation:", error);
            return null;
        }
    }

    determineMealType(conversation) {
        // Check conversation summary first
        if (conversation.summary?.mealType) {
            return conversation.summary.mealType;
        }

        // Check messages for meal type indicators
        const allMessages = conversation.messages.map(m => m.content.toLowerCase()).join(" ");

        if (allMessages.includes("breakfast")) return "breakfast";
        if (allMessages.includes("lunch")) return "lunch";
        if (allMessages.includes("dinner")) return "dinner";
        if (allMessages.includes("snack")) return "snack";

        // Default based on time of day
        const hour = conversation.createdAt.getHours();
        if (hour < 11) return "breakfast";
        if (hour < 16) return "lunch";
        if (hour < 21) return "dinner";
        return "snack";
    }

    async extractFoodItemsWithAI(userInput, mealType) {
        try {
            const prompt = this.createFoodExtractionPrompt(userInput, mealType);
            const aiResponse = await this.aiService.generateAIResponse(prompt, userInput);

            if (!aiResponse.text) {
                console.log("No AI response for food extraction");
                return [];
            }

            // Parse the AI response to extract food items
            const foodItems = this.parseAIFoodResponse(aiResponse.text);
            return foodItems;
        } catch (error) {
            console.error("Error extracting food items with AI:", error);
            // Fallback to simple extraction
            return this.simpleFoodExtraction(userInput);
        }
    }

    createFoodExtractionPrompt(userInput, mealType) {
        return `Extract food items from this user input for ${mealType}. 

User input: "${userInput}"

Please extract food items in this exact JSON format:
[
  {
    "name": "food item name",
    "quantity": number,
    "unit": "serving/plate/bowl/cup/piece/packet/etc",
    "calories": estimated calories,
    "protein": estimated protein in grams,
    "carbs": estimated carbs in grams,
    "fat": estimated fat in grams
  }
]

Rules:
- Extract only actual food items, not drinks unless they have calories
- Use reasonable estimates for nutritional values
- For items like "chapatis", "pizza", "idli" use typical serving sizes
- For drinks like "coke", "coffee" include if they have calories
- Keep quantities as numbers (e.g., 2 for "two chapatis")
- Use appropriate units (piece, plate, bowl, cup, packet, etc.)

Only return the JSON array, nothing else.`;
    }

    parseAIFoodResponse(aiResponse) {
        try {
            // Clean the response to extract JSON
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.log("No JSON array found in AI response");
                return [];
            }

            const foodItems = JSON.parse(jsonMatch[0]);

            // Validate and clean the food items
            return foodItems.filter((item) => {
                return item &&
                    item.name &&
                    typeof item.quantity === 'number' &&
                    item.unit &&
                    typeof item.calories === 'number';
            }).map((item) => ({
                name: item.name.trim(),
                quantity: Math.max(1, item.quantity || 1),
                unit: item.unit.trim(),
                calories: Math.max(0, item.calories || 0),
                protein: Math.max(0, item.protein || 0),
                carbs: Math.max(0, item.carbs || 0),
                fat: Math.max(0, item.fat || 0)
            }));
        } catch (error) {
            console.error("Error parsing AI food response:", error);
            return [];
        }
    }

    simpleFoodExtraction(userInput) {
        const foods = [];
        const text = userInput.toLowerCase();

        const patterns = [
            { regex: /(\d+)\s*(chapatis?|roti)/i, name: "chapati", calories: 120, protein: 3, carbs: 20, fat: 2 },
            { regex: /(\d+)\s*(idli)/i, name: "idli", calories: 100, protein: 4, carbs: 18, fat: 1 },
            { regex: /(\d+)\s*(pizza)/i, name: "pizza", calories: 300, protein: 12, carbs: 35, fat: 15 },
            { regex: /(\d+)\s*(packet|packets)\s*(chips)/i, name: "chips", calories: 150, protein: 2, carbs: 15, fat: 10 },
            { regex: /(\d+)\s*(bowl|bowls)\s*(curry)/i, name: "curry", calories: 200, protein: 15, carbs: 10, fat: 12 },
            { regex: /(\d+)\s*(can|cans)\s*(coke)/i, name: "coke", calories: 140, protein: 0, carbs: 39, fat: 0 },
            { regex: /(\d+)\s*(coffee)/i, name: "coffee", calories: 5, protein: 0, carbs: 1, fat: 0 },
        ];

        patterns.forEach(pattern => {
            const match = text.match(pattern.regex);
            if (match) {
                const quantity = parseInt(match[1]);
                foods.push({
                    name: pattern.name,
                    quantity: quantity,
                    unit: "serving",
                    calories: pattern.calories * quantity,
                    protein: pattern.protein * quantity,
                    carbs: pattern.carbs * quantity,
                    fat: pattern.fat * quantity
                });
            }
        });

        return foods;
    }

    calculateNutritionalTotals(foods) {
        return foods.reduce((totals, food) => ({
            calories: totals.calories + (food.calories || 0),
            protein: totals.protein + (food.protein || 0),
            carbs: totals.carbs + (food.carbs || 0),
            fat: totals.fat + (food.fat || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
}

async function main() {
    const processor = new ConversationProcessor();

    try {
        // Validate configuration
        Config.validate();
        console.log('✅ Configuration validated');

        // Connect to database
        await processor.connect();

        // Process existing conversations
        await processor.processExistingConversations();

        console.log('\n🎉 Processing completed successfully!');
    } catch (error) {
        console.error('❌ Processing failed:', error);
        process.exit(1);
    } finally {
        await processor.disconnect();
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { ConversationProcessor }; 