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
        this.isProcessingIntent = false;
        this.hasPromptButCompleted = false;
        this.intentRetryCount = 0;
        this.maxIntentRetries = 3;

        // Conversation summarization
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
                this.sendRealtimeSessionRequest();
            };

            this.websocket.onmessage = (event) => {
                try {
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
                    agentId: this.agentId // Include agent ID from URL
                },
                timestamp: Date.now(),
            };

            console.log('✅ Sending client ready request:', request);
            this.websocket.send(JSON.stringify(request));

            // Start ringtone after sending client ready request
            this.startRingtone();
        }
    }

    handleWebSocketMessage(message) {
        console.log('📡 Received WebSocket message:', message);

        switch (message.type) {
            case 'realtime_session_response':
                this.handleRealtimeSessionResponse(message);
                break;

            case 'client_ready_response':
                this.handleClientReadyResponse(message);
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

    handleRealtimeSessionResponse(message) {
        console.log('🔑 Processing realtime session response:', message);

        try {
            if (message.data && message.data.client_secret) {
                this.ephemeralKey = message.data.client_secret.value;
                console.log('🔑 Received ephemeral key for OpenAI Realtime API');

                this.updateConnectionStatus('connected', 'Connected');
                this.hideOnboardingModal();
                this.showVoiceInterface();
                this.showSuccess('Connected successfully! Ready to start your voice conversation.');

                // Auto-start the call
                setTimeout(() => {
                    this.startCall();
                }, 1000);

            } else {
                console.error('❌ Realtime session response missing client_secret');
                this.showError('Failed to receive ephemeral key from server');
            }
        } catch (error) {
            console.error('❌ Error processing realtime session response:', error);
            this.showError('Error processing session response: ' + error.message);
        }
    }

    handleAudioMessage(message) {
        if (message.data && message.data.audio) {
            console.log('🔊 Received audio data, length:', message.data.audio.length);
            this.stopRingtone();
            this.playAudio(message.data.audio);
        }
    }

    handleTTSResponse(message) {
        if (message.data && message.data.audio) {
            console.log('🔊 Received TTS audio data, length:', message.data.audio.length);
            this.stopRingtone();
            this.playAudio(message.data.audio);
        }
    }

    handleConversationSummaryResponse(message) {
        console.log('📊 Processing conversation summary response:', message);

        try {
            if (message.data && message.data.summary) {
                const summary = message.data.summary;
                console.log('📊 Conversation summary received:', summary);

                // Display the summary to the user
                this.addMessage(`📊 **Conversation Summary:**\n${summary}`, 'ai');

                // Optionally convert summary to speech
                this.convertTextToSpeech(`Here's a summary of our conversation so far: ${summary}`);
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

        prompt += `\nGenerate human-like chat conversation based on the current intent, context, user's latest response in chat conversation and provie the output in expected JSON.
        Add a remark or mild joke or a comment about the user's response in the nextPrompt followed by response to next Intent.
        If there are no follow-up questions, set isCompleted to true and provide empty string in nextPrompt.
        Respond strictly in this JSON format (OUTPUT JSON):
                {
                "id": "Intent ID",
                "isCompleted": true | false,
                "fields": {
                    "<fieldName>": "<extractedValue>"
                },
                "nextPrompt": "<follow-up question or response to user's latest response or empty string if current intent is completed>"
                }
         See the latest conversation and add anything about that if required in current intent.\n`;

        if (guidelines) {
            prompt += `\n${guidelines}`;
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
        if (this.conversationHistory.length === 0) {
            return "None";
        }

        return this.conversationHistory.map(entry =>
            `${entry.speaker}: ${entry.text}`
        ).join('\n');
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

    sendIntentToLLM(intent) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            console.log('📤 Sending intent to LLM:', intent);

            // Create the conversation item with the intent prompt
            const createMessage = {
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: intent
                        }
                    ]
                }
            };

            this.dataChannel.send(JSON.stringify(createMessage));

            // Trigger response
            setTimeout(() => {
                const responseMessage = {
                    type: 'response.create'
                };
                this.dataChannel.send(JSON.stringify(responseMessage));
            }, 100);
        } else {
            console.error('Data channel not available for sending intent');
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
            }

            if (isCompleted && nextPrompt) {
                this.hasPromptButCompleted = true;
            }

            // Add to conversation history
            if (nextPrompt) {
                this.conversationHistory.push({
                    speaker: 'agent',
                    text: nextPrompt
                });

                // Display the message
                this.addMessage(nextPrompt, 'ai');

                // Convert to speech
                this.convertTextToSpeech(nextPrompt);

                // Check if we should trigger conversation summary
                this.checkAndTriggerConversationSummary();
            }
            else if (isCompleted) {
                console.log('✅ Intent completed:', id);
                this.moveToNextIntent();
            }
            else {
                console.log('🔄 Intent incomplete, waiting for user response');
            }
            /*
            // Check if current intent is completed
            if (isCompleted) {
                console.log('✅ Intent completed:', id);
                this.moveToNextIntent();
            } else {
                console.log('🔄 Intent incomplete, waiting for user response');
                this.intentRetryCount++;

                if (this.intentRetryCount >= this.maxIntentRetries) {
                    console.log('⚠️ Max retries reached for intent:', id);
                    this.moveToNextIntent();
                }
            }
                 */

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
    }

    sendCompletedDataToServer() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const completedData = {
                type: 'conversation_completed',
                sessionId: this.sessionId,
                data: {
                    completedFields: this.completedFields,
                    conversationHistory: this.conversationHistory,
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

    async startCall() {
        try {
            if (!this.ephemeralKey) {
                this.showError('No ephemeral key available.');
                return;
            }

            this.isInCall = true;

            await this.initializeWebRTC();

        } catch (error) {
            console.error('Error starting call:', error);
            this.showError('Failed to start call: ' + error.message);
            this.endCall();
        }
    }

    async initializeWebRTC() {
        try {
            console.log('🔗 Initializing WebRTC connection...');

            // Create peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // Create data channel for text communication
            this.dataChannel = this.peerConnection.createDataChannel('oai-events');
            this.setupDataChannelHandlers();

            // Add audio transceiver for OpenAI Realtime API
            this.peerConnection.addTransceiver('audio', {
                direction: 'sendrecv',
                streams: []
            });

            // Connection state changes
            this.peerConnection.onconnectionstatechange = () => {
                console.log('WebRTC connection state:', this.peerConnection.connectionState);

                if (this.peerConnection.connectionState === 'connected') {
                    this.elements.stopListeningBtn.disabled = false;

                    // Send client ready message to trigger greeting
                    this.sendClientReady();

                    // Set system prompt for the session
                    setTimeout(() => {
                        this.setSystemPrompt();
                    }, 1000);

                    // Auto-start speech recognition
                    setTimeout(() => {
                        this.startListening();
                    }, 1500);

                } else if (this.peerConnection.connectionState === 'failed') {
                    this.showError('WebRTC connection failed');
                    this.endCall();
                }
            };

            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            console.log('📤 Sending SDP offer to OpenAI...');

            // Send offer to OpenAI Realtime API
            const baseUrl = 'https://api.openai.com/v1/realtime';
            const model = 'gpt-4o-realtime-preview-2025-06-03';

            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    'Authorization': `Bearer ${this.ephemeralKey}`,
                    'Content-Type': 'application/sdp'
                },
            });

            if (!sdpResponse.ok) {
                throw new Error(`OpenAI Realtime API error: ${sdpResponse.status} ${sdpResponse.statusText}`);
            }

            const answerSdp = await sdpResponse.text();
            const answer = {
                type: 'answer',
                sdp: answerSdp,
            };

            await this.peerConnection.setRemoteDescription(answer);
            console.log('✅ WebRTC connection established with OpenAI');

        } catch (error) {
            console.error('❌ WebRTC initialization error:', error);
            throw error;
        }
    }

    setupDataChannelHandlers() {
        this.dataChannel.onopen = () => {
            console.log('📡 Data channel opened');
        };

        this.dataChannel.onclose = () => {
            console.log('📡 Data channel closed');
        };

        this.dataChannel.onerror = (error) => {
            console.error('📡 Data channel error:', error);
        };

        this.dataChannel.onmessage = (event) => {
            try {

                const data = JSON.parse(event.data);
                this.handleRealtimeEvent(data);
            }
            catch (error) {
                console.error('Error parsing data channel message:', error);
            }
        };
    }

    async establishWebRTCConnectionWithOpenAI() {
        // Create offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        console.log('📤 Sending SDP offer to OpenAI...');
        // Send offer to OpenAI Realtime API
        const baseUrl = 'https://api.openai.com/v1/realtime';
        const model = 'gpt-4o-realtime-preview-2025-06-03';

        const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
            method: 'POST',
            body: offer.sdp,
            headers: {
                'Authorization': `Bearer ${this.ephemeralKey}`,
                'Content-Type': 'application/sdp'
            },
        });

        if (!sdpResponse.ok) {
            throw new Error(`OpenAI Realtime API error: ${sdpResponse.status} ${sdpResponse.statusText}`);
        }

        const answerSdp = await sdpResponse.text();
        const answer = {
            type: 'answer',
            sdp: answerSdp,
        };

        await this.peerConnection.setRemoteDescription(answer);
        console.log('✅ WebRTC connection established with OpenAI');


    }

    handleRealtimeEvent(event) {
        console.log('🎯 Handling realtime event:', event);
        switch (event.type) {

            case 'response.text.done':
                if (event.text) {
                    console.log('🤖 AI response text:', event.text);
                    this.processLLMResponse(event.text);
                }
                break;

            case 'response.create':
                console.log('🎤 AI started responding');
                break;

            case 'response.done':
                let responseText = event.response.output[0].content[0].transcript;
                if (responseText) {
                    this.processLLMResponse(responseText);
                }
                console.log('🔇 AI finished responding');
                break;

            case 'error':
                console.error('❌ OpenAI Realtime error:', event.error);
                this.showError(`OpenAI error: ${event.error.message || event.error}`);
                break;

            default:
            //console.log('📡 Unknown event type:', event.type);
        }
    }

    processLLMResponse(text) {
        // Check if this is an intent-based response (JSON format)
        try {
            const parsedResponse = JSON.parse(text);
            if (parsedResponse.id && typeof parsedResponse.isCompleted !== 'undefined') {
                console.log('🎯 Detected intent response:', parsedResponse);
                this.processIntentResponse(parsedResponse);
                return;
            }
        } catch (error) {
            // Not JSON, treat as regular conversation
        }
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
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            // Add user response to conversation history
            this.conversationHistory.push({
                speaker: 'user',
                text: text
            });

            // Check if we should trigger conversation summary
            this.checkAndTriggerConversationSummary();

            // Check if we're in intent-based mode
            if (this.currentIntent) {
                // We're processing an intent, continue with the current prompt
                console.log('🎯 Continuing intent processing with user response:', text);
                this.processCurrentIntent();
            } else {
                // Regular conversation mode
                console.log('💬 Regular conversation mode:', text);

                // First, create the conversation item
                const createMessage = {
                    type: 'conversation.item.create',
                    item: {
                        type: 'message',
                        role: 'user',
                        content: [
                            {
                                type: 'input_text',
                                text: text
                            }
                        ]
                    }
                };
                console.log('📤 Creating conversation item:', text);
                this.dataChannel.send(JSON.stringify(createMessage));

                // Then, trigger a response
                setTimeout(() => {
                    const responseMessage = {
                        type: 'response.create'
                    };
                    console.log('📤 Triggering response creation');
                    this.dataChannel.send(JSON.stringify(responseMessage));
                }, 100);
            }
        } else {
            console.error('Data channel not available for sending text');
            this.showError('Connection not ready. Please try again.');
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
                    if (this.isInCall && !this.isListening && !this.isPlayingAudio) {
                        console.log('🔊 Audio finished, ensuring speech recognition is running...');
                        this.startListening();
                    }
                }, 300);

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

            // If we have final results, send them to OpenAI
            if (finalTranscript.trim()) {
                console.log('🎤 Final transcript:', finalTranscript);
                this.addMessage(finalTranscript, 'user');
                this.sendTextToOpenAI(finalTranscript.trim());
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