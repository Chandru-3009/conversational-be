const { AIService } = require('../dist/services/aiService');
const { Config } = require('../dist/config/config');

class FoodExtractionTester {
  constructor() {
    this.aiService = new AIService();
  }

  async testFoodExtraction() {
    console.log('🧪 Testing Food Extraction System\n');

    const testCases = [
      {
        name: 'Breakfast with Indian Food',
        userInput: 'I had two chapatis for breakfast | I had one small bowl of chicken curry | yes I had one filter coffee',
        mealType: 'breakfast'
      },
      {
        name: 'Lunch with Pizza',
        userInput: 'yes I had one plate of Pizza a small size to Pizza chicken | I had one can of coke',
        mealType: 'lunch'
      },
      {
        name: 'Dinner with Idli',
        userInput: 'I had I am planning to have just idli | I am thinking of having three',
        mealType: 'dinner'
      },
      {
        name: 'Snacks',
        userInput: 'I had a one packet of chips',
        mealType: 'snack'
      },
      {
        name: 'Complex Meal',
        userInput: 'two chapatis | one bowl curry | one coffee | one packet chips',
        mealType: 'breakfast'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📝 Test: ${testCase.name}`);
      console.log(`Input: "${testCase.userInput}"`);
      console.log(`Meal Type: ${testCase.mealType}`);
      
      try {
        const prompt = this.createFoodExtractionPrompt(testCase.userInput, testCase.mealType);
        console.log('\n🤖 AI Prompt:');
        console.log(prompt);
        
        const aiResponse = await this.aiService.generateAIResponse(prompt, testCase.userInput);
        console.log('\n🤖 AI Response:');
        console.log(aiResponse.text);
        
        const foodItems = this.parseAIFoodResponse(aiResponse.text);
        console.log('\n🍽️ Extracted Food Items:');
        console.log(JSON.stringify(foodItems, null, 2));
        
        if (foodItems.length > 0) {
          const totals = this.calculateNutritionalTotals(foodItems);
          console.log('\n📊 Nutritional Totals:');
          console.log(`Calories: ${totals.calories}`);
          console.log(`Protein: ${totals.protein}g`);
          console.log(`Carbs: ${totals.carbs}g`);
          console.log(`Fat: ${totals.fat}g`);
        }
        
        console.log('\n' + '='.repeat(60));
      } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n' + '='.repeat(60));
      }
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

  calculateNutritionalTotals(foods) {
    return foods.reduce((totals, food) => ({
      calories: totals.calories + (food.calories || 0),
      protein: totals.protein + (food.protein || 0),
      carbs: totals.carbs + (food.carbs || 0),
      fat: totals.fat + (food.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  async testSimpleExtraction() {
    console.log('\n🔧 Testing Simple Extraction Fallback\n');
    
    const testInputs = [
      'I had two chapatis for breakfast',
      'one packet of chips',
      'three idlis',
      'one can of coke'
    ];

    for (const input of testInputs) {
      console.log(`Input: "${input}"`);
      const foods = this.simpleFoodExtraction(input);
      console.log('Extracted:', JSON.stringify(foods, null, 2));
      console.log('---');
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
}

async function runTests() {
  try {
    // Validate configuration
    Config.validate();
    console.log('✅ Configuration validated');

    const tester = new FoodExtractionTester();
    
    // Test AI-powered extraction
    await tester.testFoodExtraction();
    
    // Test simple extraction fallback
    await tester.testSimpleExtraction();
    
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { FoodExtractionTester }; 