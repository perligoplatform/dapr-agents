/**
 * Dapr LLM integration module
 * 
 * This module provides Dapr-based LLM clients for chat completions
 * using the Dapr conversation API with Alpha2 features.
 */

export { DaprInferenceClientBase, DaprInferenceClientBaseConfig } from './client.js';
export { DaprChatClient, DaprChatClientConfig } from './daprChatClient.js';

// Re-export types
export type {
  DaprConversationTool,
  DaprConversationMessage,
  DaprToolCall,
} from './client.js';