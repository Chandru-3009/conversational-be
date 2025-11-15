// Test script to verify introduction flow
console.log('🧪 Testing introduction flow...\n');

// Mock the flow to simulate what happens
class MockFlow {
    constructor() {
        this.conversationHistory = [];
        this.currentSection = null;
        this.currentIntent = null;
        this.completedFields = {};
    }

    processSectionIntroduction(section) {
        console.log('🎯 Processing section introduction for:', section.name);

        const introduction = section.introduction[0];
        if (introduction && introduction.intent) {
            // Set current section for context
            this.currentSection = section;
            
            // Send introduction as a regular conversational message (not intent-based)
            console.log('📤 Sending introduction as regular message:', introduction.intent);
            
            // Add to conversation history
            this.conversationHistory.push({
                speaker: 'agent',
                text: introduction.intent
            });

            console.log('✅ Introduction added to conversation history');
            console.log('📝 Conversation history:', this.conversationHistory);

            // Simulate proceeding to intents after 2 seconds
            console.log('⏰ Waiting 2 seconds, then proceeding to intents...');
            setTimeout(() => {
                console.log('✅ Introduction completed, proceeding to intents');
                this.startSectionIntents(section);
            }, 2000);
        } else {
            // No introduction, proceed to intents
            this.startSectionIntents(section);
        }
    }

    startSectionIntents(section) {
        console.log('🎯 Starting section intents for section:', section.name);        

        if (!section.intents || section.intents.length === 0) {
            console.log('✅ Section completed, no intents to process');
            return;
        }

        // Set current section and start with first intent
        this.currentSection = section;
        this.currentIntent = section.intents[0];
        this.intentRetryCount = 0;

        console.log('🎯 Starting first intent:', this.currentIntent.intent);
        this.processCurrentIntent();
    }

    processCurrentIntent() {       
        if (!this.currentIntent) {
            console.error('❌ No current intent to process');
            return;
        }

        console.log('🎯 Processing intent:', this.currentIntent.intent);

        // Get next intent for context
        const nextIntent = this.getNextIntent();

        // Format the prompt according to the intent-based implementation
        const prompt = this.formatIntentPrompt(this.currentIntent, nextIntent);

        console.log('🎯 Prompt:', prompt);
        console.log('✅ Intent processing completed - would send to LLM');
    }

    formatIntentPrompt(currentIntent, nextIntent) {
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
        prompt += `\nConversation so far:\n${this.formatConversationHistory()}\n`;

        return prompt;
    }

    getNextIntent() {
        if (!this.currentSection || !this.currentSection.intents) {
            return null;
        }

        const currentIndex = this.currentSection.intents.findIndex(intent => intent.id === this.currentIntent.id);
        if (currentIndex === -1 || currentIndex >= this.currentSection.intents.length - 1) {
            return null;
        }

        return this.currentSection.intents[currentIndex + 1];
    }

    formatConversationHistory() {
        if (this.conversationHistory.length === 0) {
            return "agent: What's your name and how should I address you?\nuser: You can call me Raj.";
        }

        return this.conversationHistory.map(entry =>
            `${entry.speaker}: ${entry.text}`
        ).join('\n');
    }
}

// Test agent configuration
const testAgent = {
    id: "ameya_diet_tracker",
    about: "You are Ameya, a friendly, supportive nutritional diet tracking assistant.",
    sections: [
        {
            id: 1,
            name: "personal-info-section",
            about: "Captures the user's personal information to tailor the experience.",
            introduction: [
                {
                    intent: "Welcome! I'm here to help you track your meals and nutrition. Let's start by getting to know you a bit better."
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
                            example: "John"
                        }
                    ],
                    isMandatory: true,
                    retryLimit: 3
                }
            ]
        }
    ]
};

// Run the test
const mockFlow = new MockFlow();
const section = testAgent.sections[0];

console.log('🚀 Starting test with section:', section.name);
console.log('📋 Section has introduction:', section.introduction ? 'Yes' : 'No');
console.log('📋 Section has intents:', section.intents ? section.intents.length : 0);

mockFlow.processSectionIntroduction(section);

console.log('\n⏳ Test running... (will complete in 2 seconds)'); 