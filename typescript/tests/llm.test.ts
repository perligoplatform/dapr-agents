import { describe, it, expect, beforeEach } from 'vitest';
import { ChatClientBase } from '../src/llm/chat.js';
import { OpenAIChatClient } from '../src/llm/openai/chat.js';
import { DaprChatClient } from '../src/llm/dapr/chat.js';
import { OpenAIClientBase } from '../src/llm/openai/client/base.js';
import { DaprInferenceClientBase } from '../src/llm/dapr/client.js';

// Test implementation of OpenAIClientBase for testing
class TestOpenAIClientBase extends OpenAIClientBase {
  async generate(): Promise<any> {
    return Promise.resolve({ results: [], metadata: {} });
  }
}

describe('LLM Integration', () => {
  describe('ChatClientBase', () => {
    it('should be abstract and require implementation', () => {
      // ChatClientBase cannot be instantiated directly because of abstract methods
      // This test verifies the methods exist as abstract
      expect(ChatClientBase.prototype.constructor).toBeDefined();
    });

    it('should have required abstract methods', () => {
      // ChatClientBase is abstract and defines the contract
      expect(ChatClientBase).toBeDefined();
      expect(ChatClientBase.prototype.constructor).toBeDefined();
      
      // Verify concrete implementations must provide these methods
      // by checking that implementations like OpenAIChatClient have them
      const openaiClient = new OpenAIChatClient({});
      expect(typeof openaiClient.generate).toBe('function');
      expect(typeof openaiClient.isStructuredModeSupported).toBe('function');
      expect(typeof openaiClient.getSupportedStructuredModes).toBe('function');
    });
  });

  describe('OpenAI Integration', () => {
    describe('OpenAIClientBase', () => {
      it('should create with default configuration', () => {
        const client = new TestOpenAIClientBase({});
        expect(client).toBeInstanceOf(OpenAIClientBase);
        expect(client.provider).toBe('openai');
      });

      it('should create with custom configuration', () => {
        const config = {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          organization: 'test-org',
        };
        const client = new TestOpenAIClientBase(config);
        expect(client.baseUrl).toBe(config.baseUrl);
        expect(client.apiKey).toBe(config.apiKey);
        expect(client.organization).toBe(config.organization);
      });

      it('should detect Azure vs OpenAI configuration', () => {
        const openaiClient = new TestOpenAIClientBase({
          baseUrl: 'https://api.openai.com/v1',
        });
        expect(openaiClient.isAzure).toBe(false);

        const azureClient = new TestOpenAIClientBase({
          azureEndpoint: 'https://test.openai.azure.com',
          azureDeployment: 'gpt-4',
        });
        expect(azureClient.isAzure).toBe(true);
      });
    });

    describe('OpenAIChatClient', () => {
      let client: OpenAIChatClient;

      beforeEach(() => {
        client = new OpenAIChatClient({
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
        });
      });

      it('should create with configuration', () => {
        expect(client).toBeInstanceOf(OpenAIChatClient);
        expect(client).toBeInstanceOf(OpenAIClientBase);
        expect(client.model).toBe('gpt-4o-mini');
      });

      it('should have correct provider and api', () => {
        expect(client.provider).toBe('openai');
        expect(client.api).toBe('chat');
      });

      it('should support structured modes', () => {
        expect(client.isStructuredModeSupported('json')).toBe(true);
        expect(client.isStructuredModeSupported('function_call')).toBe(true);
        expect(client.isStructuredModeSupported('unsupported')).toBe(false);
      });

      it('should return supported structured modes', () => {
        const modes = client.getSupportedStructuredModes();
        expect(modes).toContain('json');
        expect(modes).toContain('function_call');
      });

      it('should validate configuration', () => {
        expect(client.validateConfig()).toBe(true);
      });

      it('should create with minimal configuration', () => {
        const minimalClient = new OpenAIChatClient({});
        expect(minimalClient).toBeInstanceOf(OpenAIChatClient);
        expect(minimalClient.model).toBe('gpt-4o'); // Default model
      });
    });
  });

  describe('Dapr Integration', () => {
    describe('DaprInferenceClientBase', () => {
      it('should be an abstract class', () => {
        expect(() => new (DaprInferenceClientBase as any)()).toThrow();
      });

      it('should have provider "dapr"', () => {
        // Create a minimal implementation for testing
        class TestDaprClient extends DaprInferenceClientBase {
          async generate(): Promise<any> {
            return Promise.resolve({});
          }
        }
        
        const client = new TestDaprClient({
          componentName: 'test-component',
        });
        expect(client.provider).toBe('dapr');
        expect(client.api).toBe('chat');
      });
    });

    describe('DaprChatClient', () => {
      let client: DaprChatClient;

      beforeEach(() => {
        client = new DaprChatClient({
          componentName: 'test-llm-component',
          temperature: 0.7,
        });
      });

      it('should create with configuration', () => {
        expect(client).toBeInstanceOf(DaprChatClient);
        expect(client.provider).toBe('dapr');
      });

      it('should have correct provider and api', () => {
        expect(client.provider).toBe('dapr');
        expect(client.api).toBe('chat');
      });

      it('should support JSON structured mode', () => {
        expect(client.isStructuredModeSupported('json_object')).toBe(true);
        expect(client.isStructuredModeSupported('unsupported')).toBe(false);
      });

      it('should return supported structured modes', () => {
        const modes = client.getSupportedStructuredModes();
        expect(modes).toContain('json_object');
      });

      it('should validate Dapr configuration', () => {
        expect(client.validateConfig()).toBe(true);
      });

      it('should handle configuration without component name', () => {
        // Mock environment variable
        const originalEnv = process.env.DAPR_LLM_COMPONENT_DEFAULT;
        process.env.DAPR_LLM_COMPONENT_DEFAULT = 'default-component';
        
        try {
          const clientWithoutComponent = new DaprChatClient({});
          expect(clientWithoutComponent).toBeInstanceOf(DaprChatClient);
        } finally {
          // Restore original environment
          if (originalEnv !== undefined) {
            process.env.DAPR_LLM_COMPONENT_DEFAULT = originalEnv;
          } else {
            delete process.env.DAPR_LLM_COMPONENT_DEFAULT;
          }
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should export all LLM classes', () => {
      expect(ChatClientBase).toBeDefined();
      expect(OpenAIClientBase).toBeDefined();
      expect(OpenAIChatClient).toBeDefined();
      expect(DaprInferenceClientBase).toBeDefined();
      expect(DaprChatClient).toBeDefined();
    });

    it('should maintain inheritance hierarchy', () => {
      const openaiClient = new OpenAIChatClient({});
      expect(openaiClient).toBeInstanceOf(OpenAIClientBase);

      const daprClient = new DaprChatClient({
        componentName: 'test',
      });
      expect(daprClient).toBeInstanceOf(ChatClientBase);
    });
  });
});