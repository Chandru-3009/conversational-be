#!/usr/bin/env node

/**
 * Test script for OpenAI Realtime API implementation
 * This script tests the server endpoints and basic functionality
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function testRealtimeEndpoints() {
    console.log('🧪 Testing OpenAI Realtime API Implementation\n');

    // Test 1: Check if server is running
    console.log('1️⃣ Testing server health...');
    try {
        const healthResponse = await fetch(`${BASE_URL}/health`);
        if (healthResponse.ok) {
            console.log('✅ Server is running');
        } else {
            console.log('❌ Server health check failed');
            return;
        }
    } catch (error) {
        console.log('❌ Cannot connect to server:', error.message);
        console.log('   Make sure the server is running on', BASE_URL);
        return;
    }

    // Test 2: Test ephemeral key generation
    console.log('\n2️⃣ Testing ephemeral key generation...');
    try {
        const sessionData = {
            sessionId: 'test_session_' + Date.now(),
            userId: 'test_user_' + Date.now(),
            userEmail: 'test@example.com'
        };

        const keyResponse = await fetch(`${BASE_URL}/api/realtime/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData),
        });

        if (keyResponse.ok) {
            const keyData = await keyResponse.json();
            console.log('✅ Ephemeral key generated successfully');
            console.log('   Session ID:', sessionData.sessionId);
            console.log('   Key expires at:', new Date(keyData.client_secret.expires_at * 1000).toISOString());
        } else {
            const errorData = await keyResponse.json();
            console.log('❌ Ephemeral key generation failed:', errorData.error);
            console.log('   Make sure OPENAI_REALTIME_ENABLED=true and OPENAI_API_KEY is set');
            console.log('   Note: The correct endpoint is https://api.openai.com/v1/realtime/sessions');
            console.log('   This requires special access to OpenAI Realtime API');
            return;
        }
    } catch (error) {
        console.log('❌ Ephemeral key test failed:', error.message);
        return;
    }

    // Test 3: Test text-to-speech endpoint
    console.log('\n3️⃣ Testing text-to-speech endpoint...');
    try {
        const ttsData = {
            text: 'Hello, this is a test of the text-to-speech service.',
            sessionId: 'test_session_' + Date.now()
        };

        const ttsResponse = await fetch(`${BASE_URL}/api/realtime/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ttsData),
        });

        if (ttsResponse.ok) {
            const ttsResult = await ttsResponse.json();
            console.log('✅ Text-to-speech conversion successful');
            console.log('   Text length:', ttsResult.text.length, 'characters');
            console.log('   Audio duration:', ttsResult.duration, 'seconds');
            console.log('   Audio data size:', ttsResult.audio.length, 'characters (base64)');
        } else {
            const errorData = await ttsResponse.json();
            console.log('❌ Text-to-speech conversion failed:', errorData.error);
        }
    } catch (error) {
        console.log('❌ Text-to-speech test failed:', error.message);
    }

    // Test 4: Test server stats
    console.log('\n4️⃣ Testing server stats endpoint...');
    try {
        const statsResponse = await fetch(`${BASE_URL}/api/stats`);
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('✅ Server stats retrieved');
            console.log('   WebSocket connections:', stats.activeConnections || 'N/A');
            console.log('   Total sessions:', stats.totalSessions || 'N/A');
        } else {
            console.log('❌ Server stats failed');
        }
    } catch (error) {
        console.log('❌ Server stats test failed:', error.message);
    }

    console.log('\n🎉 Realtime API tests completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Open http://localhost:3000/realtime.html in your browser');
    console.log('   2. Enter your email and click "Connect"');
    console.log('   3. Click "Start Call" to test the WebRTC connection');
    console.log('   4. Speak into your microphone to test the full flow');
}

// Run the tests
testRealtimeEndpoints().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
}); 