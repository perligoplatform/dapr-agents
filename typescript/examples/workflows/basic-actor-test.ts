/**
 * Simple Dapr Actor Example - Testing basic actor functionality
 * 
 * This example creates a simple actor to test if the Dapr actor runtime is working correctly.
 * Actors are the foundation for workflows, so we need to get this working first.
 */

import { 
  DaprClient,
  HttpMethod,
  CommunicationProtocolEnum
} from '@dapr/dapr';

// Simple actor interface
interface CounterActor {
  increment(): Promise<number>;
  decrement(): Promise<number>;
  getValue(): Promise<number>;
}

async function testActorBasics() {
  console.log('🎭 Testing Basic Dapr Actor Functionality');
  
  // Create Dapr client
  const daprClient = new DaprClient({
    daprHost: '127.0.0.1',
    daprPort: '3500',
    communicationProtocol: CommunicationProtocolEnum.HTTP
  });
  
  try {
    // Test 1: Basic health check using direct HTTP call
    console.log('🏥 Testing Dapr health...');
    const healthResponse = await daprClient.invoker.invoke(
      'dapr-agents',
      'v1.0/healthz',
      HttpMethod.GET
    );
    console.log('✅ Dapr health response:', healthResponse);
    
    // Test 2: Actor invocation using HTTP API
    console.log('🎭 Testing actor invocation...');
    const actorType = 'CounterActor';
    const actorId = 'counter-1';
    
    // Try to invoke actor method via HTTP
    console.log(`📞 Calling increment on ${actorType}/${actorId}`);
    
    try {
      const result = await daprClient.invoker.invoke(
        'dapr-agents',
        `v1.0/actors/${actorType}/${actorId}/method/increment`,
        HttpMethod.POST,
        {}
      );
      console.log('✅ Actor invocation result:', result);
    } catch (actorError) {
      console.log('⚠️  Actor invocation failed (expected if no actor app):', actorError);
    }
    
    // Test 3: Try to get actor state via HTTP
    console.log('📦 Testing actor state...');
    const stateKey = 'count';
    
    try {
      const state = await daprClient.invoker.invoke(
        'dapr-agents',
        `v1.0/actors/${actorType}/${actorId}/state/${stateKey}`,
        HttpMethod.GET
      );
      console.log('📖 Actor state:', state);
    } catch (stateError) {
      console.log('⚠️  Actor state read failed (expected if no actor app):', stateError);
    }
    
  } catch (error) {
    console.error('❌ Actor test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n') // Truncate stack trace
      });
    }
    
    // Check specific error types
    const errorStr = String(error);
    if (errorStr.includes('ECONNREFUSED')) {
      console.error('🔌 Connection refused - is Dapr running on the correct ports?');
    }
    
    if (errorStr.includes('404') || errorStr.includes('Not Found')) {
      console.error('🎭 Actor not found - this is expected if no actor app is running');
    }
  }
}

async function testActorRegistration() {
  console.log('📋 Testing if actors are properly registered...');
  
  const daprClient = new DaprClient({
    daprHost: '127.0.0.1',
    daprPort: '3500',
    communicationProtocol: CommunicationProtocolEnum.HTTP
  });
  
  try {
    // Test metadata endpoint to see registered actors
    const response = await daprClient.invoker.invoke(
      'dapr-agents',  // app-id
      'dapr/metadata',
      HttpMethod.GET
    );
    
    console.log('📊 Dapr metadata:', response);
    
  } catch (error) {
    console.error('❌ Metadata test failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting Actor Tests');
  console.log('='.repeat(50));
  
  await testActorBasics();
  
  console.log('\n' + '='.repeat(50));
  
  await testActorRegistration();
  
  console.log('\n✅ Actor tests completed');
}

// Run the tests
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}