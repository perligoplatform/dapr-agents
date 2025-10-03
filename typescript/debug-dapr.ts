#!/usr/bin/env node

/**
 * Debug script for testing DaprChatClient integration
 * 
 * This script can be run directly to test Dapr integration:
 * - Set breakpoints in this file
 * - Run with VS Code debugger
 * - Step through the actual Dapr calls
 */

import { DaprChatClient } from './src/llm/dapr/daprChatClient.js';
import { BaseMessage } from './src/types/message.js';
import { loadEnvironment } from './src/utils/environment.js';

// Load environment variables from .env file
loadEnvironment();

async function debugDaprIntegration() {
  console.log('🚀 Starting Dapr integration debug session...');
  
  // Check if OpenAI API key is configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    console.error('❌ OpenAI API key not configured in .env file');
    console.log('Please edit .env and set: OPENAI_API_KEY=sk-your-key-here');
    process.exit(1);
  }
  
  console.log('✅ Environment loaded, starting client...');
  
  // Initialize client
  const client = new DaprChatClient({
    componentName: 'gpt-35-turbo',
    contextId: 'debug-session',
    scrubPii: false,
    temperature: 0.7,
    parameters: {}
  });
  
  // Set breakpoint here to inspect client initialization
  const config = client.getConfig();
  console.log('Client config:', config);
  
  // Test messages
  const messages: BaseMessage[] = [
    {
      role: 'user',
      content: 'Hello, can you respond with a simple greeting?'
    }
  ];
  
  try {
    // Set breakpoint here to step into the generate call
    console.log('Calling client.generate()...');
    const response = await client.generate(messages);
    
    // Set breakpoint here to inspect the response
    console.log('Response received:', response);
    console.log('Success! Integration test passed.');
    
  } catch (error) {
    // Set breakpoint here to inspect error details
    console.error('Error occurred:', error);
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Analyze error type
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('❌ Connection refused - Dapr sidecar may not be running');
      } else if (error.message.includes('ENOTFOUND')) {
        console.log('❌ Host not found - Dapr configuration issue');
      } else if (error.message.includes('Dapr client not initialized')) {
        console.log('❌ Dapr client initialization failed');
      } else {
        console.log('❌ Unknown error type');
      }
    }
  }
}

// Run the debug session
debugDaprIntegration().catch(console.error);