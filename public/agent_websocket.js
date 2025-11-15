class AmeyaApp {
    constructor() {
        this.sessionId = null;
        this.userId = null;
        this.userEmail = null;
        this.agentId = null; // Agent ID from URL query parameter
        this.ephemeralKey = null;
        this.peerConnection = null;
        this.dataChannel = null;
        this.isInCall = false;
        this.isConnected = false;
        this.isListening = false;
        this.speechRecognition = null;
        this.websocket = null;
        this.audioContext = null;
        this.audioQueue = [];
        this.isPlayingAudio = false;
        this.ringtoneAudio = null;
        this.isPlayingRingtone = false;

        // Intent-based conversation state
        this.agent = null;
        this.user = null;
        this.currentSection = null;
        this.currentIntent = null;
        this.currentIntentResponse = null;
        this.isIntroductionIntent = false;
        this.completedFields = {};
        this.conversationHistory = [];
        this.conversationSummary = [];
        this.userLatestResponse = null;
        this.isProcessingIntent = false;
        this.hasPromptButCompleted = false;
        this.intentRetryCount = 0;
        this.maxIntentRetries = 3;

        // Conversation summary management
        this.conversationSummaryThreshold = 5; // Trigger summary after 5 conversations
        this.lastSummaryLength = 0; // Track when last summary was generated

        // Extract agent ID from URL query parameter
        this.extractAgentIdFromURL();

        // DOM elements
        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeechRecognition();

        console.log('🎯 Ameya App initialized with intent-based approach');
        if (this.agentId) {
            console.log('🤖 Agent ID from URL:', this.agentId);
        } else {
            console.warn('⚠️ No agent ID found in URL query parameters');
        }
    }

    initializeElements() {
        // Welcome screen elements
        this.elements.welcomeScreen = document.getElementById('welcomeScreen');
        this.elements.callButton = document.getElementById('callButton');

        // Modal elements
        this.elements.onboardingModal = document.getElementById('onboardingModal');
        this.elements.onboardingForm = document.getElementById('onboardingForm');
        this.elements.userEmailInput = document.getElementById('userEmail');
        this.elements.microphoneConsent = document.getElementById('microphoneConsent');
        this.elements.proceedButton = document.getElementById('proceedButton');
        this.elements.cancelButton = document.getElementById('cancelButton');

        // Voice interface elements
        this.elements.voiceInterface = document.getElementById('voiceInterface');
        this.elements.connectionIndicator = document.getElementById('connectionIndicator');
        this.elements.connectionText = document.getElementById('connectionText');
        this.elements.sessionId = document.getElementById('sessionId');
        this.elements.endSessionButton = document.getElementById('endSessionButton');
        this.elements.conversation = document.getElementById('conversation');
        this.elements.stopListeningBtn = document.getElementById('stopListeningBtn');

        // Message containers
        this.elements.errorContainer = document.getElementById('errorContainer');
        this.elements.errorText = document.getElementById('errorText');
        this.elements.successContainer = document.getElementById('successContainer');
        this.elements.successText = document.getElementById('successText');
    }

    setupEventListeners() {
        // Call button click
        this.elements.callButton.addEventListener('click', () => {
            this.showOnboardingModal();
        });

        // Modal form events
        this.elements.onboardingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProceed();
        });

        this.elements.cancelButton.addEventListener('click', () => {
            this.hideOnboardingModal();
        });

        // Form validation
        this.elements.userEmailInput.addEventListener('input', () => {
            this.validateForm();
        });

        this.elements.microphoneConsent.addEventListener('change', () => {
            this.validateForm();
        });

        // Voice interface events
        this.elements.endSessionButton.addEventListener('click', () => {
            this.endSession();
        });

        this.elements.stopListeningBtn.addEventListener('click', () => {
            this.endSession();
        });

        // Error close button
        const errorCloseBtn = this.elements.errorContainer.querySelector('.error-close');
        if (errorCloseBtn) {
            errorCloseBtn.addEventListener('click', () => {
                this.hideError();
            });
        }
    }

    validateForm() {
        const email = this.elements.userEmailInput.value.trim();
        const consent = this.elements.microphoneConsent.checked;
        const isValid = email && this.isValidEmail(email) && consent;

        this.elements.proceedButton.disabled = !isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showOnboardingModal() {
        this.elements.onboardingModal.style.display = 'flex';
        this.elements.userEmailInput.focus();
    }

    hideOnboardingModal() {
        this.elements.onboardingModal.style.display = 'none';
        this.elements.onboardingForm.reset();
        this.elements.proceedButton.disabled = true;
    }

    async handleProceed() {
        const email = this.elements.userEmailInput.value.trim();
        const consent = this.elements.microphoneConsent.checked;

        if (!email || !this.isValidEmail(email) || !consent) {
            this.showError('Please provide a valid email and consent to microphone access.');
            return;
        }

        this.userEmail = email;
        this.setLoadingState(true);

        try {
            await this.initializeSession();
        } catch (error) {
            console.error('Session initialization error:', error);
            this.showError('Failed to initialize session. Please try again.');
            this.setLoadingState(false);
        }
    }

    setLoadingState(loading) {
        const btn = this.elements.proceedButton;
        const text = btn.querySelector('.btn-text');
        const loadingSpinner = btn.querySelector('.btn-loading');

        if (loading) {
            btn.classList.add('loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    generateSessionId() {
        return 'ameya_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    extractAgentIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.agentId = urlParams.get('agentId');

        if (!this.agentId) {
            console.warn('⚠️ No agentId query parameter found in URL');
            console.log('💡 Expected URL format: agent.html?agentId=<agent_id>');
        }
    }

    async initializeSession() {
        try {
            // Start ringtone
            this.startRingtone();
            // Close the onboarding modal
            this.hideOnboardingModal();

            this.sessionId = this.generateSessionId();
            this.userId = this.generateUserId();

            console.log('🔗 Initializing session:', this.sessionId);

            // Get WebSocket URL
            const wsUrl = this.getWebSocketUrl();
            console.log('🔗 Connecting to WebSocket:', wsUrl);

            // Connect to WebSocket
            this.websocket = new WebSocket(`${wsUrl}?sessionId=${this.sessionId}&userEmail=${encodeURIComponent(this.userEmail)}`);

            this.websocket.onopen = () => {
                console.log('🔗 WebSocket connected');
                this.updateConnectionStatus('connecting', 'Connecting...');
                setTimeout(() => {
                    this.sendClientReady();
                }, 1000);
            };

            this.websocket.onmessage = (event) => {
                try {
                    this.updateConnectionStatus('connected', 'Connected');
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);

                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showError('Connection error. Please try again.');
                this.updateConnectionStatus('disconnected', 'Connection failed');
            };

            this.websocket.onclose = () => {
                console.log('WebSocket connection closed');
                this.updateConnectionStatus('disconnected', 'Disconnected');
            };

        } catch (error) {
            console.error('Session initialization error:', error);
            throw error;
        }
    }

    getWebSocketUrl() {
        const currentHost = window.location.hostname;
        const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');

        if (!currentHost || currentHost === 'localhost' || currentHost === '127.0.0.1') {
            return 'ws://localhost:3031';
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${currentHost}:${currentPort === '80' ? '3031' : currentPort}/ws`;
        }
    }

    sendRealtimeSessionRequest() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const request = {
                type: 'realtime_session_request',
                sessionId: this.sessionId,
                userId: this.userId,
                userEmail: this.userEmail,
            };

            console.log('📤 Sending realtime session request:', request);
            this.websocket.send(JSON.stringify(request));
        }
    }

    sendClientReady() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const request = {
                type: 'client_ready_request',
                sessionId: this.sessionId,
                data: {
                    agentId: this.agentId, // Include agent ID from URL
                    userEmail: this.userEmail // Include user email
                },
                timestamp: Date.now(),
            };

            console.log('✅ Sending client ready request:', request);
            this.websocket.send(JSON.stringify(request));
            this.showVoiceInterface();
        }
    }

    // Websocket Message Handlers
    handleWebSocketMessage(message) {
        console.log('📡 Received WebSocket message:', message);

        switch (message.type) {
            case 'realtime_session_response':
                this.handleRealtimeSessionResponse(message);
                break;

            case 'client_ready_response':
                this.handleClientReadyResponse(message);
                this.isInCall = true;
                break;

            case 'ai_response':
                this.stopRingtone();
                let data = message.data;
                console.log('🤖 Processing AI response:', data);
                if (data.intentResponse) {
                    this.processIntentResponse(data.intentResponse);
                }
                if (data.audio) {
                    this.playAudio(data.audio);
                }
                break;

            case 'conversation_summary_response':
                this.handleConversationSummaryResponse(message);
                break;

            case 'audio':
                this.handleAudioMessage(message);
                break;

            case 'tts_response':
                this.handleTTSResponse(message);
                break;

            case 'error':
                this.showError(message.data?.message || 'An error occurred');
                break;

            case 'status':
                console.log('📊 Status:', message.data?.message);
                break;

            default:
                console.log('📡 Unknown message type:', message.type);
        }
    }

    handleAudioMessage(message) {
        if (message.data && message.data.audio) {
            console.log('🔊 Received audio data, length:', message.data.audio.length);
            this.playAudio(message.data.audio);
        }
    }

    handleTTSResponse(message) {
        if (message.data && message.data.audio) {
            console.log('🔊 Received TTS audio data, length:', message.data.audio.length);
            this.playAudio(message.data.audio);
        }
    }

    handleConversationSummaryResponse(message) {
        console.log('📊 Processing conversation summary response:', message);

        try {
            if (message.data && message.data.summary) {
                const summary = message.data.summary;
                console.log('📊 Conversation summary received:', summary);

                // Add the summary to conversationSummary array
                this.conversationSummary.push(summary);

                // Remove the conversations that were summarized from conversationHistory
                // Keep only the conversations after the last summary point
                const conversationsToRemove = this.lastSummaryLength;
                if (conversationsToRemove > 0 && this.conversationHistory.length >= conversationsToRemove) {
                    console.log(`📊 Removing ${conversationsToRemove} summarized conversations from history`);
                    this.conversationHistory = this.conversationHistory.slice(conversationsToRemove);
                    console.log(`📊 Conversation history now has ${this.conversationHistory.length} entries`);
                }

            } else {
                console.error('❌ Conversation summary response missing summary data');
            }
        } catch (error) {
            console.error('❌ Error processing conversation summary response:', error);
        }
    }

    handleClientReadyResponse(message) {
        console.log('🤖 Processing client ready response:', message);

        try {
            if (message.data && message.data.agent) {
                // Store agent configuration
                this.agent = message.data.agent;
                console.log('🤖 Agent configuration received:', this.agent);

                // Check user information to determine flow
                this.user = message.data.userInfo;
                const isReturningUser = this.user && this.user.hasInteractedBefore;

                console.log('👤 User info:', this.user);
                console.log('🔄 Is returning user:', isReturningUser);

                this.startConversation();
            } else {
                console.error('❌ Invalid client ready response format');
                this.showError('Invalid client ready response format');
            }
        } catch (error) {
            console.error('❌ Error processing client ready response:', error);
            this.showError('Error processing client ready response: ' + error.message);
        }
    }

    // Starts the conversation
    startConversation() {
        console.log('Starting conversation with agent');
        // Step 1: Set the system prompt
        this.setSystemPrompt(this.agent.about);

        // Step 2: Get the sections
        let sections = this.agent.sections;
        // Remove the first section if the user has interacted before - Assuming first section is the introduction.
        //if (this.user.hasInteractedBefore) {
        //    sections = sections.slice(1);
        //}

        // Store sections for sequential processing
        this.remainingSections = sections.filter(section =>
            section.intents && section.intents.length > 0
        );
        console.log(`🎯 Starting conversation with ${this.remainingSections.length} sections`);

        // Start with the first section
        if (this.remainingSections.length > 0) {
            this.processSection();
        } else {
            console.log('✅ No sections to process');
        }
    }

    processSection() {
        if (!this.remainingSections || this.remainingSections.length === 0) {
            console.log('✅ All sections completed');
            this.completeConversation();
            return;
        }

        const section = this.remainingSections.shift();
        console.log(`🎯 Processing section: ${section.name}`);

        this.startSectionIntents(section);
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
        const prompt = this.formatIntentPrompt(this.currentIntent, nextIntent, this.currentSection?.guidelines);

        console.log('🎯 Prompt:', prompt);

        // Send to LLM
        this.sendIntentToLLM(prompt);
    }

    formatIntentPrompt(currentIntent, nextIntent, guidelines) {
        let prompt = `Intent ID:\n${currentIntent.id}\n\n`;
        prompt += `Current Intent:\n${currentIntent.intent}\n\n`;

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
        else {
            prompt += `No fields to extract\n`;
        }

        // Is mandatory
        if (currentIntent.isMandatory) {
            prompt += `\nIs Mandatory:\n${currentIntent.isMandatory}\n`;
        }

        // Add context
        if (currentIntent?.context) {
            prompt += `\nContext:\n${currentIntent.context}\n`;
        }

        // Add next intent info
        if (nextIntent) {
            prompt += `\nNext Intent:\n${nextIntent.intent}\n`;
        } else {
            prompt += `\nNext Intent:\nNone\n`;
        }

        // Add conversation history
        prompt += `\nConversation so far:\n${this.formatConversationHistory()}\n`;

        // User's latest response
        if (this.userLatestResponse) {
            prompt += `\nUser's latest response:\n${this.userLatestResponse}\n`;
        }

        // Guidelines
        if (guidelines) {
            prompt += `\nGuidelines:\n${guidelines}`
        }

        return prompt;
    }

    getNextIntent() {
        if (!this.currentSection || !this.currentSection.intents) {
            return null;
        }

        let currentIndex = this.currentSection.intents.findIndex(intent => intent.id === this.currentIntent.id);
        if (currentIndex === -1 || currentIndex >= this.currentSection.intents.length - 1) {
            return null;
        }
        return this.currentSection.intents[currentIndex + 1];
    }

    formatConversationHistory() {
        let formattedHistory = [];

        // Add conversation summaries first
        if (this.conversationSummary.length > 0) {
            formattedHistory.push("=== CONVERSATION SUMMARIES ===");
            this.conversationSummary.forEach((summary, index) => {
                formattedHistory.push(`Summary ${index + 1}: ${summary}`);
            });
            formattedHistory.push(this.conversationSummary[0]);
            formattedHistory.push("=== RECENT CONVERSATION ===");
        }

        // Add recent conversation history
        if (this.conversationHistory.length === 0) {
            if (formattedHistory.length === 0) {
                return "None";
            } else {
                return formattedHistory.join('\n');
            }
        }

        const recentConversations = this.conversationHistory.map(entry =>
            `${entry.speaker}: ${entry.text}`
        );

        formattedHistory = formattedHistory.concat(recentConversations);
        return formattedHistory.join('\n');
    }

    checkAndTriggerConversationSummary() {
        const currentLength = this.conversationHistory.length;

        // Check if we've reached the threshold and haven't already summarized this batch
        if (currentLength >= this.conversationSummaryThreshold &&
            currentLength > this.lastSummaryLength) {

            console.log(`📊 Conversation history reached ${currentLength} entries, triggering summary`);
            this.sendConversationSummaryRequest();
            this.lastSummaryLength = currentLength;
        }
    }

    sendConversationSummaryRequest() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const summaryRequest = {
                type: 'conversation_summary_request',
                sessionId: this.sessionId,
                data: {
                    conversationHistory: this.conversationHistory,
                    agentId: this.agent?.id
                },
                timestamp: Date.now()
            };

            console.log('📤 Sending conversation summary request:', summaryRequest);
            this.websocket.send(JSON.stringify(summaryRequest));
        } else {
            console.error('WebSocket not available for sending conversation summary request');
        }
    }

    sendIntentToLLM(text) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'user_message',
                sessionId: this.sessionId,
                data: text,
                timestamp: Date.now(),
            };
            this.websocket.send(JSON.stringify(message));
        } else {
            this.showError('Connection not ready. Please try again.');
        }
    }

    processIntentResponse(intentResponse) {
        console.log('🎯 Processing intent response:', intentResponse);

        try {
            this.currentIntentResponse = intentResponse;
            const { id, isCompleted, fields, nextPrompt } = this.currentIntentResponse;

            // Store completed fields
            if (isCompleted && fields) {
                this.completedFields = { ...this.completedFields, ...fields };
                console.log('✅ Fields completed:', fields);
                console.log('📊 Total completed fields:', this.completedFields);

                // Show updated collected information if we have fields
                if (Object.keys(this.completedFields).length > 0) {
                    this.updateCollectedInformation();
                }
            }


            // Add to conversation history
            if (nextPrompt) {
                this.conversationHistory.push({
                    speaker: 'agent',
                    text: nextPrompt
                });

                // Display the message
                this.addMessage(nextPrompt, 'ai');

                // Check if we need to trigger conversation summary
                this.checkAndTriggerConversationSummary();
            }

        } catch (error) {
            console.error('❌ Error processing intent response:', error);
            this.showError('Error processing intent response: ' + error.message);
        }
    }

    moveToNextIntent() {
        console.log('🎯 Moving to next intent');

        if (!this.currentSection || !this.currentSection.intents) {
            console.log('❌ No current section or intents available');
            this.moveToNextSection();
            return;
        }

        if (!this.currentIntent) {
            console.log('❌ No current intent available');
            this.moveToNextSection();
            return;
        }

        const currentIndex = this.currentSection.intents.findIndex(intent => intent.id === this.currentIntent.id);
        console.log(`🎯 Current intent index: ${currentIndex}, total intents: ${this.currentSection.intents.length}`);

        if (currentIndex === -1) {
            console.log('❌ Current intent not found in section');
            this.moveToNextSection();
            return;
        }

        if (currentIndex >= this.currentSection.intents.length - 1) {
            // No more intents in this section
            console.log('✅ No more intents in current section, moving to next section');
            this.moveToNextSection();
            return;
        }

        // Move to next intent in current section
        this.currentIntent = this.currentSection.intents[currentIndex + 1];
        this.intentRetryCount = 0;

        console.log('🎯 Moving to next intent:', this.currentIntent.intent);
        this.processCurrentIntent();
    }

    moveToNextSection() {
        console.log('🎯 Moving to next section');

        // Clear current section and intent
        this.currentSection = null;
        this.currentIntent = null;
        this.intentRetryCount = 0;

        // Process next section in the queue
        this.processSection();
    }

    completeConversation() {
        console.log('✅ Conversation completed!');
        console.log('📊 Final completed fields:', this.completedFields);

        // Send completed data to server for storage
        this.sendCompletedDataToServer();

        // Show completion message
        const completionMessage = "Great! I've collected all the information I need. Thank you for sharing that with me!";
        this.addMessage(completionMessage, 'ai');
        this.convertTextToSpeech(completionMessage);


        // Show collected information as a structured message
        this.showCollectedInformation();
    }

    showCollectedInformation() {
        if (!this.completedFields || Object.keys(this.completedFields).length === 0) {
            return;
        }

        // Create HTML for collected information
        const collectedInfoHTML = this.createCollectedInfoHTML();

        // Add as a special AI message
        this.addCollectedInfoMessage(collectedInfoHTML);
    }

    createCollectedInfoHTML() {
        const fields = this.completedFields;
        const fieldNames = Object.keys(fields);

        if (fieldNames.length === 0) {
            return '<div class="collected-info-empty">No information collected yet.</div>';
        }

        let html = '<div class="collected-info-summary">';
        html += '<div class="collected-info-title"><i class="fas fa-clipboard-check"></i> Information Collected</div>';
        html += '<div class="collected-info-fields">';

        fieldNames.forEach(fieldName => {
            const value = fields[fieldName];
            if (value && value.toString().trim() !== '') {
                const formattedFieldName = this.formatFieldName(fieldName);
                html += `
                    <div class="collected-info-field">
                        <span class="field-label">${formattedFieldName}:</span>
                        <span class="field-value">${this.formatFieldValue(value)}</span>
                    </div>
                `;
            }
        });

        html += '</div></div>';
        return html;
    }

    formatFieldName(fieldName) {
        // Convert camelCase or snake_case to Title Case
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^\w/, c => c.toUpperCase())
            .trim();
    }

    formatFieldValue(value) {
        if (typeof value === 'string') {
            return value;
        } else if (typeof value === 'number') {
            return value.toString();
        } else if (Array.isArray(value)) {
            return value.join(', ');
        } else if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    addCollectedInfoMessage(htmlContent) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai collected-info-message';

        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-robot"></i>
                <div class="message-text">
                    ${htmlContent}
                </div>
            </div>
            <div class="message-time">Just now</div>
        `;

        this.elements.conversation.appendChild(messageDiv);
        this.scrollToBottom();
    }

    updateCollectedInformation() {
        // Remove any existing collected info message
        const existingMessage = this.elements.conversation.querySelector('.collected-info-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    sendCompletedDataToServer() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const completedData = {
                type: 'conversation_completed',
                sessionId: this.sessionId,
                data: {
                    completedFields: this.completedFields,
                    conversationHistory: this.conversationHistory,
                    conversationSummary: this.conversationSummary,
                    agentId: this.agent?.id
                },
                timestamp: Date.now()
            };

            console.log('📤 Sending completed data to server:', completedData);
            this.websocket.send(JSON.stringify(completedData));
        }
    }

    showVoiceInterface() {
        this.elements.welcomeScreen.style.display = 'none';
        this.elements.voiceInterface.style.display = 'flex';
        this.elements.sessionId.textContent = this.sessionId;
    }

    setSystemPrompt(systemPrompt) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            const enhancedSystemPrompt = ` ${systemPrompt}            
                You are a friendly, human-like assistant designed to collect structured information from users through natural, engaging conversations. You will process one 'currentIntent' at a time using the given context: 'currentIntent', 'nextIntent', and 'conversationHistory'. Your response will be used in both text and voice-based chats.

                Your responsibilities:
                1. Understand and Extract:
                - Analyze 'conversationHistory' and the latest user reply.
                - Extract all fields required by 'currentIntent.expected_output'.                

                2. Assess Completion:
                - Set 'isCompleted' to true only if all mandatory fields are present and valid.
                - Otherwise, set 'isCompleted' to false.
                - If 'isMandatory' is false, and user didn't have answer to provide, then don't wait for the user to respond, just set isCompleted to true and move to the next intent.

                3. Generate nextPrompt:
                - If 'isCompleted' is false, nextPrompt must be a follow-up question focused only on the missing or invalid fields in 'currentIntent'.
                - If 'isCompleted' is true, nextPrompt should be a smooth and warm transition to the next intent using the message in 'nextIntent.intent'.

                Conversational Style Guidelines:
                - Use natural, friendly, and supportive language — like a caring human assistant.
                - Include micro-reactions like "Oh, got it!", "Nice!", "Hmm interesting!", "Okay great!" to make responses feel warm and alive.
                - Speak confidently and empathetically.
                - Avoid robotic phrasing; aim for fluid, human-like conversation.
                - For each intent, generate a natural response using the latest user input and conversation history. Avoid repeating the user's name in every message unless it's necessary for warmth or clarity

                Respond strictly in this JSON format:
                {
                "id": "<currentIntent.id>",
                "isCompleted": true | false,
                "fields": {
                    "<fieldName>": "<extractedValue>"
                },
                "nextPrompt": "<follow-up question or natural transition to next intent>"
                }

                Example:
                User says: "You can call me Johnny."

                currentIntent:
                {
                "id": 3221,
                "field": "name",
                "intent": "Get user's name and preferred way of addressing",
                "expected_output": {
                    "name": { "type": "string" }
                },
                "isMandatory": true
                }

                nextIntent:
                {
                "id": 3222,
                "intent": "Get user's age"
                }

                Expected Output:
                {
                "id": "3221",
                "isCompleted": true,
                "fields": {
                    "name": "Johnny"
                },
                "nextPrompt": "Awesome, Johnny! And how old are you?"
                }

                Remember: Only return JSON when processing intents (prompts with "Current Intent:" and "Fields to Extract:"), otherwise respond naturally.`;

            const systemMessage = {
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: 'system',
                    content: [
                        {
                            type: 'input_text',
                            text: enhancedSystemPrompt
                        }
                    ]
                }
            };

            console.log('📤 Setting system prompt for intent-based approach : ', JSON.stringify(systemMessage));
            this.dataChannel.send(JSON.stringify(systemMessage));
        }
    }

    sendTextToOpenAI(text) {
        try {
            // We're processing an intent, continue with the current prompt
            console.log('🎯 Continuing intent processing with user response:', text);
            this.processCurrentIntent();
        } catch (error) {
            console.error('❌ Error sending text to OpenAI:', error);
            this.showError('Failed to send text to OpenAI: ' + error.message);
        }
    }

    convertTextToSpeech(text) {
        try {
            console.log('🔊 Converting text to speech:', text);

            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'tts_request',
                    data: text,
                    sessionId: this.sessionId,
                }));
            } else {
                throw new Error('WebSocket connection not available');
            }

        } catch (error) {
            console.error('❌ TTS conversion error:', error);
            this.showError('Failed to convert text to speech: ' + error.message);
        }
    }

    playAudio(audioData) {
        // Update status to show audio is playing
        this.addStatusMessage('Playing audio...');

        // Add to queue and process
        this.audioQueue.push(audioData);
        this.processAudioQueue();
    }

    async processAudioQueue() {
        if (this.isPlayingAudio || this.audioQueue.length === 0) {
            return;
        }

        this.isPlayingAudio = true;
        const audioData = this.audioQueue.shift();

        try {
            console.log('🔊 Processing audio data, length:', audioData.length);

            if (!audioData || audioData.length < 100) {
                console.error('❌ Audio data too short or invalid');
                return;
            }

            // Decode base64 audio data
            const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
            console.log('🔊 Decoded audio buffer, size:', audioBuffer.length, 'bytes');

            // Create blob with appropriate MIME type
            let mimeType = 'audio/wav';
            if (audioBuffer.length > 4) {
                const header = new Uint8Array(audioBuffer.slice(0, 4));
                if (header[0] === 0xFF && header[1] === 0xFB) {
                    mimeType = 'audio/mpeg';
                } else if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
                    mimeType = 'audio/mp3';
                } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
                    mimeType = 'audio/wav';
                }
            }

            const blob = new Blob([audioBuffer], { type: mimeType });
            const audioUrl = URL.createObjectURL(blob);

            console.log('🔊 Created audio blob, size:', blob.size, 'bytes, type:', mimeType);

            const audio = new Audio(audioUrl);

            audio.onloadstart = () => console.log('🔊 Audio loading started');
            audio.oncanplay = () => console.log('🔊 Audio can play');
            audio.onplay = () => console.log('🔊 Audio started playing');
            audio.onended = () => {
                console.log('🔊 Audio finished playing');
                URL.revokeObjectURL(audioUrl);
                this.isPlayingAudio = false;

                // Remove status message
                this.removeStatusMessage();

                // Process next audio in queue
                setTimeout(() => this.processAudioQueue(), 100);

                // Ensure speech recognition is running after audio finishes
                setTimeout(() => {
                    if (!this.isPlayingAudio) {
                        console.log('🔊 Audio finished, ensuring speech recognition is running...');
                        this.startListening();
                    }
                }, 100);

                /*
                if(this.hasPromptButCompleted) {
                    console.log('🔊 Audio finished playing, moving to next intent');
                    this.hasPromptButCompleted = false;
                    this.moveToNextIntent();
                }
                    */
            };
            audio.onerror = (error) => {
                console.error('❌ Audio playback error:', error);
                URL.revokeObjectURL(audioUrl);
                this.isPlayingAudio = false;

                // Remove status message
                this.removeStatusMessage();

                setTimeout(() => this.processAudioQueue(), 100);
            };

            await audio.play();

        } catch (error) {
            console.error('❌ Error processing audio:', error);
            this.isPlayingAudio = false;

            // Remove status message
            this.removeStatusMessage();

            setTimeout(() => this.processAudioQueue(), 100);
        }
    }

    initializeSpeechRecognition() {
        // Check if Web Speech API is supported
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('Speech recognition is not supported in this browser.');
            return;
        }

        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.speechRecognition = new SpeechRecognition();

        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = 'en-US';
        this.speechRecognition.maxAlternatives = 1;

        this.speechRecognition.onstart = () => {
            console.log('🎤 Speech recognition started');
            this.isListening = true;
            this.addStatusMessage('Listening...');
        };

        this.speechRecognition.onend = () => {
            console.log('🔇 Speech recognition ended');
            this.isListening = false;
            this.removeStatusMessage();

            // Auto-restart speech recognition if we're still in a call and not playing audio
            if (this.isInCall && !this.isPlayingAudio) {
                console.log('🔄 Auto-restarting speech recognition...');
                setTimeout(() => {
                    if (this.isInCall && !this.isPlayingAudio) {
                        console.log('🔄 Attempting to restart speech recognition...');
                        this.startListening();
                    } else {
                        console.log('🔄 Skipping restart - not in call or audio is playing');
                    }
                }, 200);
            } else {
                console.log('🔄 Not restarting - isInCall:', this.isInCall, 'isPlayingAudio:', this.isPlayingAudio);
            }
        };

        this.speechRecognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            let userResponse = finalTranscript.trim();
            // If we have final results, send them to OpenAI
            if (userResponse) {
                console.log('🎤 Final transcript:', userResponse);
                this.addMessage(userResponse, 'user');
                this.userLatestResponse = userResponse;
                this.conversationHistory.push({
                    speaker: 'user',
                    text: userResponse
                });

                // Check if we need to trigger conversation summary
                this.checkAndTriggerConversationSummary();

                if (this.currentIntentResponse.isCompleted) {
                    this.moveToNextIntent();
                } else {
                    this.processCurrentIntent();
                }
            }
        };

        this.speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);

            // Handle not-allowed error (microphone permission denied)
            if (event.error === 'not-allowed') {
                console.error('❌ Microphone permission denied');
                this.showError('Microphone access is required. Please allow microphone access and refresh the page.');
                return;
            }

            // For no-speech errors, just restart listening without showing error
            if (event.error === 'no-speech') {
                console.log('🔇 No speech detected, continuing to listen...');
                // Restart speech recognition to continue listening
                setTimeout(() => {
                    if (this.isInCall && !this.isPlayingAudio) {
                        this.startListening();
                    }
                }, 100);
                return;
            }

            // Only show user-facing errors for unexpected issues
            if (event.error !== 'aborted') {
                this.showError(`Speech recognition error: ${event.error}`);
            }

            // Auto-restart on other recoverable errors (but not during audio playback)
            if (this.isInCall && !this.isPlayingAudio &&
                (event.error === 'audio-capture' || event.error === 'network')) {
                console.log('🔄 Auto-restarting speech recognition after error...');
                setTimeout(() => {
                    this.startListening();
                }, 1000);
            }
        };
    }

    startListening() {
        console.log('🎤 startListening called - isInCall:', this.isInCall, 'isListening:', this.isListening, 'hasSpeechRecognition:', !!this.speechRecognition);

        try {
            console.log('🎤 Starting speech recognition...');
            this.speechRecognition.start();
        } catch (error) {
            console.error('❌ Error starting speech recognition:', error);
            // Retry after a delay
            setTimeout(() => {
                if (this.isInCall && !this.isListening) {
                    console.log('🔄 Retrying speech recognition start...');
                    this.startListening();
                }
            }, 1000);
        }
    }

    stopListening() {
        if (this.speechRecognition && this.isListening) {
            try {
                console.log('🔇 Stopping speech recognition...');
                this.speechRecognition.stop();
            } catch (error) {
                console.error('❌ Error stopping speech recognition:', error);
            }
        }
    }

    endCall() {
        console.log('📴 Ending call');
        this.isInCall = false;

        // Stop ringtone if playing
        this.stopRingtone();

        // Stop speech recognition if active
        if (this.isListening) {
            this.stopListening();
        }

        // Clean up WebRTC
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.elements.stopListeningBtn.disabled = true;

        this.addMessage('Call ended', 'user');
    }

    endSession() {
        if (this.isInCall) {
            this.endCall();
        }

        // Stop ringtone if playing
        this.stopRingtone();

        // Close WebSocket connection
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }

        // Reset state
        this.sessionId = null;
        this.userId = null;
        this.userEmail = null;
        this.ephemeralKey = null;
        this.isConnected = false;

        // Show welcome screen
        this.elements.voiceInterface.style.display = 'none';
        this.elements.welcomeScreen.style.display = 'flex';

        this.updateConnectionStatus('disconnected', 'Disconnected');

        this.addMessage('Session ended', 'ai');
    }

    updateConnectionStatus(status, text) {
        this.elements.connectionIndicator.className = `status-indicator ${status}`;
        this.elements.connectionText.textContent = text;
    }



    addMessage(content, type = 'ai') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const icon = document.createElement('i');
        icon.className = type === 'user' ? 'fas fa-user' : 'fas fa-robot';
        messageContent.appendChild(icon);

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = content;
        messageContent.appendChild(messageText);

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString();

        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);

        this.elements.conversation.appendChild(messageDiv);

        // Auto-scroll to bottom with smooth animation
        this.scrollToBottom();
    }

    scrollToBottom() {
        const conversationContainer = this.elements.conversation.parentElement;
        conversationContainer.scrollTo({
            top: conversationContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    addStatusMessage(status) {
        // Remove any existing status message first
        this.removeStatusMessage();

        const statusDiv = document.createElement('div');
        statusDiv.className = 'message ai status-message';
        statusDiv.id = 'statusMessage';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const icon = document.createElement('i');
        icon.className = 'fas fa-info-circle';
        messageContent.appendChild(icon);

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = status;
        messageContent.appendChild(messageText);

        statusDiv.appendChild(messageContent);

        this.elements.conversation.appendChild(statusDiv);
        this.scrollToBottom();
    }

    removeStatusMessage() {
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            statusMessage.remove();
        }
    }

    startRingtone() {
        if (this.isPlayingRingtone) return;

        try {
            console.log('🔔 Starting ringtone...');
            this.isPlayingRingtone = true;

            // Create a subtle ringtone using Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Configure ringtone
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.type = 'sine';

            // Fade in/out for subtle effect
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);

            // Repeat ringtone every 2 seconds
            this.ringtoneInterval = setInterval(() => {
                if (!this.isPlayingRingtone) return;

                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);

                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
            }, 1000);

        } catch (error) {
            console.error('❌ Error starting ringtone:', error);
            this.isPlayingRingtone = false;
        }
    }

    stopRingtone() {
        if (!this.isPlayingRingtone) return;

        console.log('🔇 Stopping ringtone...');
        this.isPlayingRingtone = false;

        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    showError(message) {
        this.elements.errorText.textContent = message;
        this.elements.errorContainer.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.elements.errorContainer.style.display = 'none';
    }

    showSuccess(message) {
        this.elements.successText.textContent = message;
        this.elements.successContainer.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.elements.successContainer.style.display = 'none';
        }, 3000);
    }
}

// Initialize the app when the page loads
let ameyaApp;
document.addEventListener('DOMContentLoaded', () => {
    ameyaApp = new AmeyaApp();
    // Make app globally accessible for debugging
    window.ameyaApp = ameyaApp;
}); 