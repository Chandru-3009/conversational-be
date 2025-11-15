const { AIService } = require('../dist/services/aiService');
const { ConversationModel } = require('../dist/models/Conversation');
const { UserModel } = require('../dist/models/User');

async function testAIGreeting() {
  try {
    console.log('🧪 Testing AI-Powered Greeting System...\n');

    // Initialize services
    const aiService = new AIService();

    // Test 1: First-time user scenario
    console.log('📋 Test 1: First-time user');
    const newUser = {
      _id: 'test-user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      preferences: { timezone: 'UTC' }
    };

    const firstTimeGreeting = await aiService.generateAIPoweredGreeting(
      newUser,
      [], // No today conversations
      []  // No recent conversations
    );
    console.log('✅ First-time greeting generated:', firstTimeGreeting.substring(0, 100) + '...\n');

    // Test 2: Returning user with today's conversations
    console.log('📋 Test 2: Returning user with today\'s conversations');
    const returningUser = {
      _id: 'test-user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      preferences: { timezone: 'UTC' }
    };

    const todayConversations = [
      {
        _id: 'conv-1',
        userId: 'test-user-2',
        sessionId: 'session-1',
        messages: [
          { type: 'user', content: 'I had eggs and toast for breakfast', timestamp: new Date() },
          { type: 'ai', content: 'Great! How many eggs did you have?', timestamp: new Date() }
        ],
        summary: {
          mealType: 'breakfast',
          foodsLogged: ['eggs', 'toast'],
          totalCalories: 300,
          completionStatus: 'complete',
          isCompleteMeal: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const recentConversations = [
      {
        _id: 'conv-2',
        userId: 'test-user-2',
        sessionId: 'session-2',
        messages: [],
        summary: {
          mealType: 'dinner',
          foodsLogged: ['chicken', 'rice'],
          totalCalories: 500,
          completionStatus: 'complete',
          isCompleteMeal: true
        },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ];

    const returningGreeting = await aiService.generateAIPoweredGreeting(
      returningUser,
      todayConversations,
      recentConversations
    );
    console.log('✅ Returning user greeting generated:', returningGreeting.substring(0, 100) + '...\n');

    // Test 3: User with incomplete meal today
    console.log('📋 Test 3: User with incomplete meal today');
    const incompleteUser = {
      _id: 'test-user-3',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@example.com',
      preferences: { timezone: 'UTC' }
    };

    const incompleteConversations = [
      {
        _id: 'conv-3',
        userId: 'test-user-3',
        sessionId: 'session-3',
        messages: [
          { type: 'user', content: 'I had a sandwich for lunch', timestamp: new Date() },
          { type: 'ai', content: 'What kind of sandwich?', timestamp: new Date() }
        ],
        summary: {
          mealType: 'lunch',
          foodsLogged: ['sandwich'],
          totalCalories: 250,
          completionStatus: 'incomplete',
          isCompleteMeal: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const incompleteGreeting = await aiService.generateAIPoweredGreeting(
      incompleteUser,
      incompleteConversations,
      []
    );
    console.log('✅ Incomplete meal greeting generated:', incompleteGreeting.substring(0, 100) + '...\n');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAIGreeting(); 