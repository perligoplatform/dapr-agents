import { ChatClientBase } from '../chat.js';

/**
 * Centralized default LLM factory for the SDK
 */
export function getDefaultLLM(): ChatClientBase {
  try {
    // Lazy import to avoid circular dependencies
    const { DaprChatClient } = require('../dapr/chat.js');
    return new DaprChatClient();
  } catch (error) {
    console.warn(`Failed to create default Dapr client: ${error}. LLM will be null.`);
    throw new Error('Default LLM not available - must provide LLM client');
  }
}

/**
 * Check if default LLM is available
 */
export function isDefaultLLMAvailable(): boolean {
  try {
    getDefaultLLM();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get available LLM providers
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  
  // Check for OpenAI
  try {
    require('../openai/chat.js');
    providers.push('openai');
  } catch {
    // OpenAI not available
  }
  
  // Check for Dapr
  try {
    require('../dapr/chat.js');
    providers.push('dapr');
  } catch {
    // Dapr not available
  }
  
  return providers;
}