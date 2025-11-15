const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const CHATAGENT_DB = 'chatagent';
const AGENT_COLLECTION = 'agent';

async function setupSampleAgent() {
  let client;
  
  try {
    console.log('🔧 Setting up sample agent in chatagent database...');
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(CHATAGENT_DB);
    const collection = db.collection(AGENT_COLLECTION);
    
    // Sample agent configuration
    const sampleAgent = {
      name: "Ameya Diet Assistant",
      about: "You are Ameya, a friendly, supportive nutritional diet tracking assistant that helps users log their meals and track their nutrition.",
      mode: ["text"],
      tone: "warm and supportive",
      personality: "caring, encouraging, and knowledgeable about nutrition",
      gender: "female",
      chatSections: [
        {
          name: "personal-info-section",
          about: "Captures the user's personal information to tailor the experience.",
          introduction: [
            {
              id: 1001,
              intent: "Give a warm introduction about this section and its objective",
              isMandatory: true,
              retryLimit: 1,
              fieldsToExtract: []
            }
          ],
          intents: [
            {
              id: 3221,
              intent: "Get user's name and preferred way of addressing",
              isMandatory: true,
              retryLimit: 3,
              fieldsToExtract: [
                {
                  name: "name",
                  type: "string",
                  description: "The name or nickname provided by the user",
                  example: "John",
                  validation: "Name must be at least 2 characters and contain only letters and spaces."
                }
              ]
            },
            {
              id: 3222,
              intent: "Get user's age",
              isMandatory: true,
              retryLimit: 3,
              fieldsToExtract: [
                {
                  name: "age",
                  type: "number",
                  description: "User's age in years",
                  example: "28",
                  validation: "Number between 1 and 120"
                }
              ]
            },
            {
              id: 3223,
              intent: "Ask about user's daily exercise or activity",
              isMandatory: false,
              retryLimit: 2,
              fieldsToExtract: [
                {
                  name: "lifestyle",
                  type: "string",
                  description: "Type of physical activity",
                  example: "Yoga",
                  validation: "Any valid activity description"
                },
                {
                  name: "frequency",
                  type: "string",
                  description: "How often they exercise",
                  example: "3 times a week",
                  validation: "Any valid frequency description"
                }
              ]
            }
          ]
        },
        {
          name: "meal-tracking-section",
          about: "Helps users log their meals and track nutrition.",
          introduction: [
            {
              id: 2001,
              intent: "Introduce meal tracking and ask what meal they'd like to log",
              isMandatory: true,
              retryLimit: 1,
              fieldsToExtract: []
            }
          ],
          intents: [
            {
              id: 4001,
              intent: "Determine meal type (breakfast, lunch, dinner, snack)",
              isMandatory: true,
              retryLimit: 3,
              fieldsToExtract: [
                {
                  name: "mealType",
                  type: "string",
                  description: "Type of meal being logged",
                  example: "breakfast",
                  validation: "Must be one of: breakfast, lunch, dinner, snack"
                }
              ]
            },
            {
              id: 4002,
              intent: "Get food items and quantities",
              isMandatory: true,
              retryLimit: 3,
              fieldsToExtract: [
                {
                  name: "foodItems",
                  type: "string",
                  description: "List of food items with quantities",
                  example: "rice, chicken, vegetables",
                  validation: "Must include food names and quantities"
                }
              ]
            }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if agent already exists
    const existingAgent = await collection.findOne({ name: sampleAgent.name });
    
    if (existingAgent) {
      console.log('⚠️ Agent already exists, updating...');
      await collection.updateOne(
        { name: sampleAgent.name },
        { $set: { ...sampleAgent, updatedAt: new Date() } }
      );
      console.log('✅ Agent updated successfully');
      console.log('🆔 Agent ID:', existingAgent._id.toString());
    } else {
      console.log('🆕 Creating new agent...');
      const result = await collection.insertOne(sampleAgent);
      console.log('✅ Agent created successfully');
      console.log('🆔 Agent ID:', result.insertedId.toString());
    }
    
    // Create indexes
    console.log('📊 Creating indexes...');
    await collection.createIndex({ name: 1 }, { unique: true });
    await collection.createIndex({ gender: 1 });
    await collection.createIndex({ createdAt: -1 });
    console.log('✅ Indexes created');
    
    // List all agents
    const agents = await collection.find({}).toArray();
    console.log('\n📋 Available agents:');
    agents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent._id})`);
      console.log(`    Gender: ${agent.gender}`);
      console.log(`    Sections: ${agent.chatSections.length}`);
      console.log(`    Created: ${agent.createdAt.toISOString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error setting up sample agent:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the setup
setupSampleAgent()
  .then(() => {
    console.log('\n🎉 Sample agent setup completed!');
    console.log('\n💡 To test with the agent, use:');
    console.log('   agent.html?agentId=<agent_id_from_above>');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sample agent setup failed:', error.message);
    process.exit(1);
  }); 