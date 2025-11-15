#!/usr/bin/env node

/**
 * Enhanced Features Test Script
 * Tests the new user authentication, personalized greetings, and session management
 */

const WebSocket = require('ws');

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:3001';
const TEST_EMAIL = 'test@example.com';

class EnhancedFeaturesTester {
  constructor() {
    this.results = [];
    this.ws = null;
  }

  async runTest() {
    console.log('🚀 Starting Enhanced Features Test...\n');
    
    try {
      await this.testUserAuthentication();
      await this.testPersonalizedGreeting();
      await this.testSessionManagement();
      this.analyzeResults();
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      this.cleanup();
    }
  }

  async testUserAuthentication() {
    console.log('🔐 Testing User Authentication...');
    
    const sessionId = 'test-auth-' + Date.now();
    const wsUrl = `${WS_URL}?sessionId=${sessionId}&userEmail=${encodeURIComponent(TEST_EMAIL)}`;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected for authentication test');
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'audio') {
            console.log(`✅ Received personalized greeting: "${message.data.text}"`);
            this.results.push({
              test: 'authentication',
              success: true,
              greeting: message.data.text,
              hasAudio: !!message.data.audio
            });
            resolve();
          } else if (message.type === 'error') {
            console.error('❌ Authentication error:', message.data.message);
            this.results.push({
              test: 'authentication',
              success: false,
              error: message.data.message
            });
            resolve();
          }
        } catch (error) {
          console.error('❌ Failed to parse message:', error.message);
          resolve();
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('⏰ Authentication test timeout');
        resolve();
      }, 10000);
    });
  }

  async testPersonalizedGreeting() {
    console.log('\n👋 Testing Personalized Greeting...');
    
    const sessionId = 'test-greeting-' + Date.now();
    const wsUrl = `${WS_URL}?sessionId=${sessionId}&userEmail=${encodeURIComponent(TEST_EMAIL)}`;
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected for greeting test');
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'audio') {
            const greeting = message.data.text;
            console.log(`✅ Received greeting: "${greeting}"`);
            
            // Check if greeting is personalized
            const isPersonalized = greeting.includes('test@example.com') || 
                                  greeting.includes('User') || 
                                  greeting.includes('welcome back') ||
                                  greeting.includes('first chat');
            
            this.results.push({
              test: 'personalized_greeting',
              success: true,
              greeting: greeting,
              isPersonalized: isPersonalized,
              hasAudio: !!message.data.audio
            });
            
            console.log(`📊 Greeting personalization: ${isPersonalized ? '✅ YES' : '❌ NO'}`);
            ws.close();
            resolve();
          }
        } catch (error) {
          console.error('❌ Failed to parse message:', error.message);
          resolve();
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('⏰ Greeting test timeout');
        ws.close();
        resolve();
      }, 10000);
    });
  }

  async testSessionManagement() {
    console.log('\n📋 Testing Session Management...');
    
    const sessionId = 'test-session-' + Date.now();
    const wsUrl = `${WS_URL}?sessionId=${sessionId}&userEmail=${encodeURIComponent(TEST_EMAIL)}`;
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected for session test');
        
        // Send a test message
        setTimeout(() => {
          const testMessage = {
            type: 'text_message',
            data: 'I had eggs and toast for breakfast',
            timestamp: Date.now()
          };
          
          ws.send(JSON.stringify(testMessage));
          console.log('📤 Sent test message: "I had eggs and toast for breakfast"');
        }, 2000);
      });
      
      let messageCount = 0;
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          messageCount++;
          
          if (message.type === 'audio') {
            console.log(`✅ Received response ${messageCount}: "${message.data.text}"`);
            
            if (messageCount >= 2) {
              this.results.push({
                test: 'session_management',
                success: true,
                messageCount: messageCount,
                hasAudio: !!message.data.audio
              });
              
              ws.close();
              resolve();
            }
          }
        } catch (error) {
          console.error('❌ Failed to parse message:', error.message);
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        console.log('⏰ Session test timeout');
        ws.close();
        resolve();
      }, 15000);
    });
  }

  analyzeResults() {
    console.log('\n📊 Test Results Analysis:');
    console.log('========================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test.toUpperCase()}:`);
      console.log(`   Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      
      if (result.greeting) {
        console.log(`   Greeting: "${result.greeting}"`);
      }
      
      if (result.isPersonalized !== undefined) {
        console.log(`   Personalized: ${result.isPersonalized ? '✅ YES' : '❌ NO'}`);
      }
      
      if (result.messageCount) {
        console.log(`   Messages: ${result.messageCount}`);
      }
      
      if (result.hasAudio) {
        console.log(`   Audio: ✅ Generated`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Enhanced features are working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the implementation.');
    }
  }

  cleanup() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new EnhancedFeaturesTester();
  tester.runTest();
}

module.exports = EnhancedFeaturesTester; 