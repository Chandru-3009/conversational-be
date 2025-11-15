class AmeyaApp {
    constructor() {
        this.sessionId = null;
        this.userId = null;
        this.userEmail = null;
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

        // DOM elements
        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeechRecognition();
        
        console.log('🎯 Ameya App initialized');
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
            return `${protocol}//${currentHost}:${currentPort === '80' ? '3031' : currentPort}`;
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
                type: 'client_ready',
                sessionId: this.sessionId,
                data: {},
                timestamp: Date.now(),
            };
            
            console.log('✅ Sending client ready message:', request);
            this.websocket.send(JSON.stringify(request));
            
            // Start ringtone after sending client ready
            this.startRingtone();
        }
    }

    handleWebSocketMessage(message) {
        console.log('📡 Received WebSocket message:', message);

        switch (message.type) {
            case 'realtime_session_response':
                this.handleRealtimeSessionResponse(message);
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
                console.log('📡 Received data channel message:', data);
                this.handleRealtimeEvent(data);
            } catch (error) {
                console.error('Error parsing data channel message:', error);
            }
        };
    }

    handleRealtimeEvent(event) {
        switch (event.type) {
            case 'conversation.item.delta':
                if (event.delta && event.delta.content) {
                    event.delta.content.forEach(contentItem => {
                        if (contentItem.type === 'text' && contentItem.text) {
                            console.log('🤖 AI response text:', contentItem.text);
                            this.addMessage(contentItem.text, 'ai');
                            this.convertTextToSpeech(contentItem.text);
                        }
                    });
                }
                break;

            case 'response.delta':
                if (event.delta && event.delta.content) {
                    event.delta.content.forEach(contentItem => {
                        if (contentItem.type === 'text' && contentItem.text) {
                            console.log('🤖 AI response text:', contentItem.text);
                            this.addMessage(contentItem.text, 'ai');
                            this.convertTextToSpeech(contentItem.text);
                        }
                    });
                }
                break;

            case 'response.text.done':
                if (event.text) {
                    console.log('🤖 AI response text:', event.text);
                    this.addMessage(event.text, 'ai');
                    this.convertTextToSpeech(event.text);
                    
                    // Send to backend for meal completion tracking
                    this.sendRealtimeMessageToBackend('response.text.done', { text: event.text });
                }
                break;

            case 'response.create':
                console.log('🎤 AI started responding');
                this.sendRealtimeMessageToBackend('response.create', {});
                break;

            case 'response.done':
                console.log('🔇 AI finished responding');
                this.sendRealtimeMessageToBackend('response.done', {});
                break;

            case 'error':
                console.error('❌ OpenAI Realtime error:', event.error);
                this.showError(`OpenAI error: ${event.error.message || event.error}`);
                break;

            default:
                console.log('📡 Unknown event type:', event.type);
        }
    }

    sendRealtimeMessageToBackend(messageType, messageData) {
        try {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                const realtimeMessage = {
                    type: 'realtime_message',
                    messageType: messageType,
                    messageData: messageData,
                    sessionId: this.sessionId,
                    timestamp: Date.now()
                };
                
                console.log('📤 Sending realtime message to backend:', messageType);
                this.websocket.send(JSON.stringify(realtimeMessage));
            }
        } catch (error) {
            console.error('❌ Error sending realtime message to backend:', error);
        }
    }

    setSystemPrompt() {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            const systemPrompt = `You are Ameya, a warm, caring, and friendly voice-powered diet tracking assistant. You are speaking directly to the user and helping them track their meals naturally and effortlessly. Your responses will be spoken aloud using text-to-speech, so they must sound like a real, confident, empathetic human.

✅ TONE & STYLE GUIDELINES:
- Be warm, natural, and supportive — like a caring companion
- Speak confidently — avoid sounding hesitant or overly scripted
- Use natural, conversational language with micro reactions and emotions
- Add light humor and encouragement with subtle personality quirks
- Occasionally add a surprise or delight factor, such as a fun food fact or hydration tip

🎭 MICRO REACTIONS & EMOTIONS:
- Use natural micro reactions like: "Ooh", "Great!", "Nice", "Wow", "Mmm", "Ah", "Oh", "Hmm"
- Express micro emotions: "That sounds delicious", "How lovely", "That's wonderful", "Interesting", "Perfect"
- Use these naturally in conversation, not forced or overdone

🌟 LIGHT HUMOR & ENCOURAGEMENT:
- Add playful, encouraging remarks and subtle personality quirks
- Examples:
  * "That's a strong breakfast! Are we conquering the world today?"
  * "Wow, you're consistent with those smoothies! Gold star for you 🥇"
  * "You're on a roll! If you keep this up, you'll need a trophy shelf."

🎁 OCCASIONAL SURPRISES (DELIGHT FACTOR):
- Occasionally share a fun food fact or hydration tip, especially when it fits the context
- Examples:
  * "Did you know? Bananas are technically berries, but strawberries aren't!"
  * "You've logged three salty meals this week — don't forget to drink water!"
  * "Fun fact: Carrots were originally purple!"

FOOD & QUANTITY COLLECTION GUIDELINES:
- Focus on getting the food item and its quantity in a friendly, conversational way
- Use natural, human measurements instead of precise grams:
  * "a small bowl of", "a medium bowl of", "a large bowl of"
  * "one cup of", "half a cup of", "a coffee cup size of"
  * "one tablespoon of", "two tablespoons of", "a spoonful of"
  * "one slice of", "two slices of", "a few slices of"
  * "one piece of", "a small piece of", "a large piece of"
  * "one serving of", "a small serving of", "a generous serving of"
  * "one glass of", "half a glass of", "a small glass of"
  * "one plate of", "a small plate of", "a full plate of"
- Ask follow-up questions naturally: Example: "And how much rice did you have with that?" or "What about the portion size?"
- Don't ask for exact grams or precise measurements — stick to everyday language
- Don't suggest recipes, meal plans, or alternative foods — just focus on what they actually ate

SPEECH-TO-TEXT HANDLING:
- The user's response comes from speech-to-text conversion and may contain inaccuracies
- Make educated guesses based on context when words are unclear or misspelled
- If you're unsure about a food item, ask for clarification in a friendly way
- Common speech-to-text errors to watch for:
  * "rice" might be "rise", "ice", or "price"
  * "bread" might be "bred", "red", or "read"
  * "chicken" might be "kitchen", "chick in", or "chicken"
  * "soup" might be "soap", "soup", or "sue"
  * Numbers might be misheard: "two" vs "to", "one" vs "won"
- Use conversation context to interpret unclear responses
- If completely unclear, ask the user to repeat.

✅ NATURAL EXAMPLES:
"Ooh, that sounds delicious! A small bowl of sambar. Got it. And how much rice did you have with that?"
"Great! A medium bowl of rice. That's a nice portion. And what about the vegetables?"
"You've logged three salty meals this week — don't forget to drink water!"

❌ DO NOT:
- Ask for exact grams or precise measurements
- Suggest recipes or alternative meal options
- Sound scripted or robotic — keep it conversational and human
- Overuse micro reactions — use them naturally and sparingly
- Use formal or clinical language

PRIMARY OBJECTIVE: Get the food item and its quantity using natural, everyday language in a friendly, conversational manner with natural micro reactions, emotions, light humor, encouragement, and occasional surprises. Based on the time of interaction, get the Breakfast, Lunch, Dinner, Snack, or Drink. Focus on what they actually ate, not what they should eat.

ONLY return natural, conversational text that will be spoken by a TTS engine. Do not use SSML tags or explain your answer — just output natural speech ready for text-to-speech.`;

            const systemMessage = {
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: 'system',
                    content: [
                        {
                            type: 'input_text',
                            text: systemPrompt
                        }
                    ]
                }
            };
            
            console.log('📤 Setting system prompt');
            this.dataChannel.send(JSON.stringify(systemMessage));
        }
    }

    sendTextToOpenAI(text) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
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

            // Send user message to backend for tracking
            this.sendRealtimeMessageToBackend('conversation.item.create', {
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
            });

            // Then, trigger a response
            setTimeout(() => {
                const responseMessage = {
                    type: 'response.create'
                };
                console.log('📤 Triggering response creation');
                this.dataChannel.send(JSON.stringify(responseMessage));
            }, 100);
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
        
        if (this.speechRecognition && !this.isListening && this.isInCall) {
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
        } else {
            console.log('🎤 Cannot start speech recognition - conditions not met');
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
            }, 2000);
            
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