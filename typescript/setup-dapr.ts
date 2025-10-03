#!/usr/bin/env node

/**
 * Dapr Setup and Verification Script
 * 
 * This script helps set up and verify Dapr connection before running integration tests.
 * It checks if Dapr is running and verifies the connection protocol.
 */

import { DaprClient } from '@dapr/dapr';

async function checkDaprStatus() {
  console.log('🔍 Checking Dapr status...');
  
  // Check default HTTP port (3500)
  try {
    const response = await fetch('http://localhost:3500/v1.0/healthz');
    if (response.ok) {
      console.log('✅ Dapr HTTP endpoint is available on port 3500');
      return { available: true, protocol: 'HTTP', port: 3500 };
    }
  } catch (error) {
    console.log('❌ Dapr HTTP endpoint not available on port 3500');
  }
  
  // Check if gRPC port (50001) is accessible
  try {
    // We can't directly test gRPC from Node without proper client, 
    // but we can try to create a DaprClient and see if it fails
    console.log('🔍 Testing DaprClient connection...');
    const client = new DaprClient();
    
    // Try a simple operation to test connectivity
    await client.state.get('test-store', 'test-key');
    console.log('✅ DaprClient connected successfully');
    return { available: true, protocol: 'gRPC', port: 50001 };
    
  } catch (error) {
    console.log('❌ DaprClient connection failed:', error.message);
    return { available: false, protocol: 'unknown', port: 'unknown' };
  }
}

async function listDaprComponents() {
  console.log('🔍 Checking available Dapr components...');
  
  try {
    const response = await fetch('http://localhost:3500/v1.0/metadata');
    if (response.ok) {
      const metadata = await response.json();
      console.log('📋 Dapr metadata:', JSON.stringify(metadata, null, 2));
      
      if (metadata.components) {
        console.log('🧩 Available components:');
        metadata.components.forEach((component: any) => {
          console.log(`  - ${component.name} (${component.type})`);
        });
      }
      
      return metadata;
    }
  } catch (error) {
    console.log('❌ Could not fetch Dapr metadata:', error.message);
    return null;
  }
}

async function testDaprConversationAPI() {
  console.log('🔍 Testing Dapr conversation API...');
  
  try {
    // Try to call the conversation API directly
    const response = await fetch('http://localhost:3500/v1.0/invoke/gpt-35-turbo/method/converse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [
          {
            role: 'user',
            content: 'Hello, this is a test message.'
          }
        ],
        temperature: 0.7
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Conversation API test successful:', result);
      return { success: true, response: result };
    } else {
      console.log('❌ Conversation API test failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return { success: false, status: response.status, error: errorText };
    }
  } catch (error) {
    console.log('❌ Conversation API test error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Dapr Setup and Verification');
  console.log('================================\n');
  
  // Step 1: Check if Dapr is running
  const daprStatus = await checkDaprStatus();
  console.log(`\n📊 Dapr Status: ${daprStatus.available ? '✅ Available' : '❌ Not Available'}`);
  console.log(`📡 Protocol: ${daprStatus.protocol}`);
  console.log(`🔌 Port: ${daprStatus.port}\n`);
  
  if (!daprStatus.available) {
    console.log('🔧 To start Dapr, run:');
    console.log('   dapr run --app-id dapr-agents-app --app-port 3000 --dapr-http-port 3500 --dapr-grpc-port 50001');
    console.log('\n💡 Make sure you have a component configured for LLM (gpt-35-turbo)');
    return;
  }
  
  // Step 2: List available components
  const metadata = await listDaprComponents();
  
  // Step 3: Test conversation API
  console.log('\n🧪 Testing conversation API...');
  const apiTest = await testDaprConversationAPI();
  
  if (apiTest.success) {
    console.log('\n🎉 All checks passed! Ready for integration testing.');
    console.log('\n🐛 To debug:');
    console.log('   1. Set breakpoints in your test file');
    console.log('   2. Run "Debug Dapr Integration Test" in VS Code');
    console.log('   3. Or run "Debug Dapr Script" to debug this script');
  } else {
    console.log('\n❌ Some checks failed. Please verify your Dapr setup.');
    console.log('\n🔧 Common issues:');
    console.log('   - Dapr components not configured');
    console.log('   - LLM component (gpt-35-turbo) not available');
    console.log('   - API keys not configured');
  }
}

// Run the verification
main().catch(console.error);