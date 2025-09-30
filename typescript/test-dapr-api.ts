import { DaprClient } from '@dapr/dapr';

// Test what's available in the Dapr client
const client = new DaprClient();
console.log('DaprClient methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
console.log('DaprClient properties:', Object.keys(client));

// Check if conversation API is available
const hasConversation = 'conversation' in client;
console.log('Has conversation API:', hasConversation);

if (hasConversation) {
  console.log('Conversation methods:', Object.getOwnPropertyNames(client.conversation));
}

export {};