import { DaprClient, HttpMethod } from '@dapr/dapr';
import { loadEnvironment, getDaprConfig } from './src/utils/environment.js';

// Load environment variables from .env file
loadEnvironment();

/**
 * Simple test script to validate Dapr connectivity
 * This tests the Dapr HTTP API endpoint without requiring LLM components
 */
async function testDaprConnection() {
  console.log('🔍 Testing Dapr connection...');
  
  try {
    // Get Dapr configuration from environment
    const daprConfig = getDaprConfig();
    console.log(`📡 Testing Dapr HTTP API on port ${daprConfig.httpPort}...`);
    
    // Create Dapr client
    const daprClient = new DaprClient();
    
    // Test if Dapr is running by calling the health endpoint
    const response = await fetch(`http://localhost:${daprConfig.httpPort}/v1.0/healthz`);
    
    if (response.ok) {
      console.log(`✅ Dapr HTTP API is running on port ${daprConfig.httpPort}`);
      
      // Test component listing
      try {
        const componentsResponse = await fetch(`http://localhost:${daprConfig.httpPort}/v1.0/metadata`);
        if (componentsResponse.ok) {
          const metadata = await componentsResponse.json();
          console.log('📊 Dapr Metadata:');
          console.log(`   - App ID: ${metadata.id}`);
          console.log(`   - Runtime Version: ${metadata.runtimeVersion}`);
          console.log(`   - Components: ${metadata.components?.length || 0} found`);
          
          if (metadata.components?.length > 0) {
            metadata.components.forEach((comp: any) => {
              console.log(`     - ${comp.name} (${comp.type})`);
            });
          }
          
          // Check if OpenAI API key is configured
          const openaiKey = process.env.OPENAI_API_KEY;
          if (openaiKey && openaiKey !== 'your-openai-api-key-here') {
            console.log('🔑 OpenAI API key is configured');
          } else {
            console.log('⚠️  OpenAI API key not configured - update .env file for LLM testing');
          }
        }
      } catch (metadataError) {
        console.log('⚠️  Could not fetch component metadata:', metadataError);
      }
      
    } else {
      console.log(`❌ Dapr HTTP API not responding on port ${daprConfig.httpPort}`);
      console.log('   Make sure Dapr sidecar is running with: dapr run --app-id dapr-agents --dapr-http-port 3500');
    }
    
  } catch (error) {
    console.log('❌ Failed to connect to Dapr:', error);
    console.log('');
    console.log('🔧 To fix this:');
    console.log('   1. Make sure Dapr is installed: dapr --version');
    console.log('   2. Start Dapr sidecar: run the VS Code task "daprd-start-agents"');
    console.log('   3. Or run manually: start-dapr-debug.bat');
    console.log('   4. Update .env file with your OpenAI API key for LLM testing');
  }
}

// Run the test
testDaprConnection().catch(console.error);