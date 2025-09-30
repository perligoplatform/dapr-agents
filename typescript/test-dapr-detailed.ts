import { DaprClient } from '@dapr/dapr';

async function testDaprClient() {
  const client = new DaprClient();
  
  // Check what's in each property
  console.log('=== state ===');
  console.log('State methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.state)));
  
  console.log('=== pubsub ===');
  console.log('PubSub methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.pubsub)));
  
  console.log('=== workflow ===');
  console.log('Workflow methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.workflow)));
  
  console.log('=== invoker ===');
  console.log('Invoker methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.invoker)));
  
  console.log('=== proxy ===');
  console.log('Proxy methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.proxy)));
}

testDaprClient();

export {};