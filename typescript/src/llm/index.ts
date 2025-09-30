/**
 * LLM (Large Language Model) integration module
 * 
 * This module provides a unified interface for working with various
 * LLM providers including OpenAI, Azure OpenAI, Hugging Face, NVIDIA,
 * ElevenLabs, and Dapr.
 */

// Core LLM classes
export { ChatClientBase } from './chat.js';

// OpenAI integrations
export { OpenAIChatClient } from './openai/chat.js';
export { OpenAIClientBase } from './openai/client/base.js';

// Dapr integrations
export * from './dapr/index.js';

// Utilities
export * from './utils/index.js';

export const LLM_VERSION = '0.1.0';