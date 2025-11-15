#!/usr/bin/env node

/**
 * Performance Test Script
 * Tests the optimized audio processing pipeline
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:3001';
const TEST_AUDIO_PATH = path.join(__dirname, '../test-audio.webm');

class PerformanceTester {
  constructor() {
    this.results = [];
    this.ws = null;
  }

  async runTest() {
    console.log('🚀 Starting Performance Test...\n');
    
    try {
      await this.connectWebSocket();
      await this.sendTestAudio();
      await this.waitForResponse();
      this.analyzeResults();
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      this.cleanup();
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });
      
      this.ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
      });
    });
  }

  async sendTestAudio() {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(TEST_AUDIO_PATH)) {
        console.log('⚠️  Test audio file not found, using mock data');
        // Send mock audio data
        const mockAudio = Buffer.alloc(10000, 1); // 10KB mock audio
        this.sendAudioChunk(mockAudio);
        resolve();
        return;
      }

      const audioBuffer = fs.readFileSync(TEST_AUDIO_PATH);
      console.log(`📁 Sending test audio: ${audioBuffer.length} bytes`);
      
      this.sendAudioChunk(audioBuffer);
      resolve();
    });
  }

  sendAudioChunk(audioBuffer) {
    const message = {
      type: 'audio',
      sessionId: 'test-session-' + Date.now(),
      data: {
        audio: audioBuffer.toString('base64'),
        mimeType: 'audio/webm',
        size: audioBuffer.length
      },
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(message));
    console.log('📤 Audio chunk sent');
  }

  async waitForResponse() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'audio') {
            const totalTime = Date.now() - startTime;
            this.results.push({
              totalTime,
              timestamp: new Date().toISOString(),
              responseText: message.data.text,
              hasAudio: !!message.data.audio
            });
            
            console.log(`✅ Response received in ${totalTime}ms`);
            console.log(`📝 Response: "${message.data.text}"`);
            resolve();
          } else if (message.type === 'error') {
            console.error('❌ Error response:', message.data.message);
            resolve();
          }
        } catch (error) {
          console.error('❌ Failed to parse message:', error.message);
          resolve();
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('⏰ Test timeout after 10 seconds');
        resolve();
      }, 10000);
    });
  }

  analyzeResults() {
    if (this.results.length === 0) {
      console.log('❌ No results to analyze');
      return;
    }

    const result = this.results[0];
    console.log('\n📊 Performance Analysis:');
    console.log('========================');
    console.log(`Total Time: ${result.totalTime}ms`);
    console.log(`Target: <4000ms`);
    console.log(`Status: ${result.totalTime < 4000 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Response: "${result.responseText}"`);
    console.log(`Audio Generated: ${result.hasAudio ? '✅ Yes' : '❌ No'}`);

    if (result.totalTime > 4000) {
      console.log('\n💡 Optimization Suggestions:');
      console.log('- Enable AI caching: ENABLE_AI_CACHING=true');
      console.log('- Enable parallel processing: ENABLE_PARALLEL_PROCESSING=true');
      console.log('- Reduce AI tokens: AI_MAX_TOKENS=60');
      console.log('- Lower AI temperature: AI_TEMPERATURE=0.2');
    } else {
      console.log('\n🎉 Performance target achieved!');
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
  const tester = new PerformanceTester();
  tester.runTest();
}

module.exports = PerformanceTester; 