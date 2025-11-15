// Test agent configuration
const testAgent = {
    id: "ameya_diet_tracker",
    about: "You are Ameya, a friendly, supportive nutritional diet tracking assistant that helps users log their meals and track their nutrition.",
    mode: ["text"],
    sections: [
        {
            id: 1,
            name: "personal-info-section",
            about: "Captures the user's personal information to tailor the experience.",
            introduction: [
                {
                    intent: "Give a warm introduction about this section and its objective"
                }
            ],
            intents: [
                {
                    id: 3221,
                    intent: "Get user's name and preferred way of addressing",
                    fieldsToExtract: [
                        {
                            name: "name",
                            type: "string",
                            description: "The name or nickname provided by the user",
                            example: "John",
                            validation: "Name must be at least 2 characters and contain only letters and spaces."
                        }
                    ],
                    isMandatory: true,
                    retryLimit: 3
                },
                {
                    id: 3222,
                    intent: "Get user's age",
                    fieldsToExtract: [
                        {
                            name: "age",
                            type: "number",
                            description: "User's age in years",
                            example: 28,
                            validation: "Number between 1 and 120"
                        }
                    ],
                    isMandatory: true,
                    retryLimit: 3
                },
                {
                    id: 3223,
                    intent: "Ask about user's daily exercise or activity",
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
                    ],
                    isMandatory: false,
                    retryLimit: 2
                }
            ]
        }
    ]
};

// Mock conversation history for testing
const conversationHistory = [
    { speaker: 'agent', text: "What's your name and how should I address you?" },
    { speaker: 'user', text: "You can call me Raj." },
    { speaker: 'agent', text: "Thanks, Raj! How old are you?" },
    { speaker: 'user', text: "I'm 28." },
    { speaker: 'agent', text: "Got it! Do you follow any regular exercise routine?" },
    { speaker: 'user', text: "I do yoga 3 times a week in the mornings." }
];

// Function to format conversation history (matching the frontend implementation)
function formatConversationHistory() {
    if (conversationHistory.length === 0) {
        return "agent: What's your name and how should I address you?\nuser: You can call me Raj.";
    }

    return conversationHistory.map(entry =>
        `${entry.speaker}: ${entry.text}`
    ).join('\n');
}

// Function to format intent prompt (matching the frontend implementation)
function formatIntentPrompt(currentIntent, nextIntent) {
    let prompt = `Current Intent:\n${currentIntent.intent}\n\n`;

    // Add fields to extract
    if (currentIntent.fieldsToExtract && currentIntent.fieldsToExtract.length > 0) {
        prompt += `Fields to Extract:\n`;
        currentIntent.fieldsToExtract.forEach(field => {
            prompt += `- ${field.name}: ${field.description}`;
            if (field.example) {
                prompt += ` (e.g., ${field.example})`;
            }
            prompt += `\n`;
        });
    }

    // Add next intent info
    if (nextIntent) {
        prompt += `\nNext Intent:\n${nextIntent.intent}\n`;
    } else {
        prompt += `\nNext Intent:\nNone\n`;
    }

    // Add conversation history
    prompt += `\nConversation so far:\n${formatConversationHistory()}\n`;

    return prompt;
}

// Test the prompt formatting
function testPromptFormatting() {
    console.log('🧪 Testing prompt formatting...\n');

    const section = testAgent.sections[0];
    const intents = section.intents;

    // Test each intent
    for (let i = 0; i < intents.length; i++) {
        const currentIntent = intents[i];
        const nextIntent = i < intents.length - 1 ? intents[i + 1] : null;

        console.log(`📝 Testing Intent ${currentIntent.id}: ${currentIntent.intent}`);
        console.log('─'.repeat(80));
        
        const prompt = formatIntentPrompt(currentIntent, nextIntent);
        console.log(prompt);
        console.log('─'.repeat(80));
        console.log();
    }
}

// Test the expected format from the documentation
function testExpectedFormat() {
    console.log('📋 Testing against expected format from documentation...\n');
    
    const expectedPrompt = `Current Intent:
Ask about user's daily exercise or activity

Fields to Extract:
- lifestyle: Type of physical activity (e.g., Yoga)
- frequency: How often (e.g., 3 times a week)

Next Intent:
None

Conversation so far:
agent: Got it! Do you follow any regular exercise routine?
user: I do yoga 3 times a week in the mornings.`;

    console.log('Expected format:');
    console.log('─'.repeat(80));
    console.log(expectedPrompt);
    console.log('─'.repeat(80));
    console.log();

    // Test our implementation with the same intent
    const testIntent = {
        id: 3223,
        intent: "Ask about user's daily exercise or activity",
        fieldsToExtract: [
            {
                name: "lifestyle",
                type: "string",
                description: "Type of physical activity",
                example: "Yoga"
            },
            {
                name: "frequency",
                type: "string",
                description: "How often",
                example: "3 times a week"
            }
        ]
    };

    const ourPrompt = formatIntentPrompt(testIntent, null);
    
    console.log('Our implementation:');
    console.log('─'.repeat(80));
    console.log(ourPrompt);
    console.log('─'.repeat(80));
    console.log();

    // Compare
    const matches = ourPrompt.trim() === expectedPrompt.trim();
    console.log(`✅ Format matches expected: ${matches}`);
    
    if (!matches) {
        console.log('\n❌ Differences found:');
        console.log('Expected:', JSON.stringify(expectedPrompt));
        console.log('Actual:', JSON.stringify(ourPrompt));
    }
}

// Run tests
if (require.main === module) {
    testPromptFormatting();
    testExpectedFormat();
}

module.exports = {
    formatIntentPrompt,
    formatConversationHistory,
    testAgent
}; 