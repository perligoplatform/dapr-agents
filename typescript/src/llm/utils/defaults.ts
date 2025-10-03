import { ChatClientBase } from '../chat.js';
import { DaprChatClient } from '../dapr/chat.js';

/**
 * Centralized default LLM factory for the SDK
 */
export function getDefaultLLM(): ChatClientBase {
  try {
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
    // Use static import check - if we can import the module, it's available
    import('../openai/chat.js');
    providers.push('openai');
  } catch {
    // OpenAI not available
  }
  
  // Dapr is always available since we import it
  providers.push('dapr');
  
  return providers;
}