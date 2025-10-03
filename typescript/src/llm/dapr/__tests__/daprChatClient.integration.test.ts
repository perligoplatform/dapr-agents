import { describe, test, expect, beforeAll } from 'vitest';
import { DaprChatClient } from '../daprChatClient.js';
import { BaseMessage, AssistantMessage, ToolMessage, ToolCall } from '../../../types/message.js';
import { loadEnvironment } from '../../../utils/environment.js';

// Load environment variables from .env file
loadEnvironment();

describe('DaprChatClient Integration Tests', () => {
  let client: DaprChatClient;
  
  beforeAll(async () => {
    // Initialize DaprChatClient with test configuration
    client = new DaprChatClient({
      componentName: 'gpt-35-turbo',
      contextId: 'test-context',
      scrubPii: false,
      temperature: 0.7,
      parameters: {}
    });
  });

  test('should be properly initialized', () => {
    expect(client).toBeDefined();
    expect(client.provider).toBe('dapr');
    expect(client.api).toBe('chat');
  });

  test('should implement required ChatClientBase methods', () => {
    expect(client.isStructuredModeSupported).toBeDefined();
    expect(client.getSupportedStructuredModes).toBeDefined();
    expect(client.generate).toBeDefined();
    expect(client.generateStream).toBeDefined();
  });

  test('should return correct structured mode support', () => {
    expect(client.isStructuredModeSupported('json')).toBe(false);
    expect(client.getSupportedStructuredModes()).toEqual([]);
  });

  test('should have correct configuration', () => {
    const config = client.getConfig();
    expect(config.componentName).toBe('gpt-35-turbo');
    expect(config.contextId).toBe('test-context');
    expect(config.scrubPii).toBe(false);
    expect(config.temperature).toBe(0.7);
  });

  // Note: Actual Dapr integration tests require a running Dapr sidecar
  // These would be run separately with proper Dapr infrastructure
  describe('Dapr Integration (requires running Dapr sidecar)', () => {
    test('should generate chat completion via Dapr', async () => {
      const messages: BaseMessage[] = [
        {
          role: 'user',
          content: 'Hello, can you respond with a simple greeting?'
        }
      ];

      // Set breakpoint here to inspect variables
      const config = client.getConfig();
      
      try {
        // Set breakpoint here to step into the call
        const response = await client.generate(messages);
        
        // Set breakpoint here to inspect response
        expect(response).toBeDefined();
        expect(response.results).toBeDefined();
        expect(response.results.length).toBeGreaterThan(0);
        expect(response.results[0]?.message.role).toBe('assistant');
        expect(response.results[0]?.message.content).toBeDefined();
        expect(response.metadata).toBeDefined();
        expect(response.metadata.componentName).toBe('gpt-35-turbo');
        
      } catch (error) {
        // Set breakpoint here to inspect error details
        const errorDetails = {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack
        };
        
        // Re-throw to fail the test and see the error
        throw error;
      }
    }, 30000); // 30 second timeout for Dapr calls

    test.skip('should validate Dapr component configuration', async () => {
      try {
        const isValid = await client.validateComponent();
        expect(isValid).toBe(true);
      } catch (error) {
        // Expected if Dapr is not running
        console.log('Dapr component validation skipped - requires running Dapr sidecar');
        expect(error).toBeDefined();
      }
    });

    test.skip('should handle streaming responses', async () => {
      const messages: BaseMessage[] = [
        {
          role: 'user',
          content: 'Tell me a short story.'
        }
      ];

      try {
        const streamGenerator = client.generateStream(messages);
        const chunks: string[] = [];
        
        for await (const chunk of streamGenerator) {
          chunks.push(chunk);
        }
        
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.join('')).toBeTruthy();
      } catch (error) {
        // Expected if Dapr is not running
        console.log('Dapr streaming test skipped - requires running Dapr sidecar');
        expect(error).toBeDefined();
      }
    });
  });

  describe('Message Format Conversion', () => {
    test('should convert BaseMessage to Dapr format correctly', () => {
      const messages: BaseMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Hello!'
        }
      ];

      // Access the private method via type assertion for testing
      const daprMessages = (client as any).convertMessagesToDaprFormat(messages);
      
      expect(daprMessages).toHaveLength(2);
      expect(daprMessages[0].role).toBe('system');
      expect(daprMessages[0].content).toBe('You are a helpful assistant.');
      expect(daprMessages[1].role).toBe('user');
      expect(daprMessages[1].content).toBe('Hello!');
    });

    test('should handle assistant messages with tool calls', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        type: 'function',
        function: {
          name: 'test_function',
          arguments: '{"param": "value"}'
        }
      };

      const messages: BaseMessage[] = [
        {
          role: 'assistant',
          content: 'I need to call a function.',
          toolCalls: [toolCall]
        } as AssistantMessage
      ];

      const daprMessages = (client as any).convertMessagesToDaprFormat(messages);
      
      expect(daprMessages).toHaveLength(1);
      expect(daprMessages[0].role).toBe('assistant');
      expect(daprMessages[0].toolCalls).toBeDefined();
      expect(daprMessages[0].toolCalls).toHaveLength(1);
      expect(daprMessages[0].toolCalls[0].id).toBe('call_123');
      expect(daprMessages[0].toolCalls[0].function.name).toBe('test_function');
    });

    test('should handle tool messages', () => {
      const messages: BaseMessage[] = [
        {
          role: 'tool',
          content: 'Function result',
          toolCallId: 'call_123'
        } as ToolMessage
      ];

      const daprMessages = (client as any).convertMessagesToDaprFormat(messages);
      
      expect(daprMessages).toHaveLength(1);
      expect(daprMessages[0].role).toBe('tool');
      expect(daprMessages[0].content).toBe('Function result');
      expect(daprMessages[0].tool_call_id).toBe('call_123');
    });
  });

  describe('Response Conversion', () => {
    test('should convert Dapr response to LLMChatResponse format', () => {
      const mockDaprResponse = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you today?'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          promptTokens: 10,
          completionTokens: 8,
          totalTokens: 18
        }
      };

      const response = (client as any).convertResponseToLLMChatResponse(mockDaprResponse);
      
      expect(response.results).toHaveLength(1);
      expect(response.results[0].message.role).toBe('assistant');
      expect(response.results[0].message.content).toBe('Hello! How can I help you today?');
      expect(response.results[0].finishReason).toBe('stop');
      expect(response.metadata.componentName).toBe('gpt-35-turbo');
      expect(response.metadata.usage).toBeDefined();
    });

    test('should handle Dapr response with tool calls', () => {
      const mockDaprResponse = {
        choices: [
          {
            message: {
              content: 'I need to call a function.',
              tool_calls: [
                {
                  id: 'call_456',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "San Francisco"}'
                  }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }
        ]
      };

      const response = (client as any).convertResponseToLLMChatResponse(mockDaprResponse);
      
      expect(response.results[0].message.role).toBe('assistant');
      expect(response.results[0].message.content).toBe('I need to call a function.');
      expect((response.results[0].message as any).tool_calls).toBeDefined();
      expect((response.results[0].message as any).tool_calls).toHaveLength(1);
      expect(response.results[0].finishReason).toBe('tool_calls');
    });

    test('should throw error for response without choices', () => {
      const mockDaprResponse = {
        usage: { promptTokens: 10, completionTokens: 0, totalTokens: 10 }
      };

      expect(() => {
        (client as any).convertResponseToLLMChatResponse(mockDaprResponse);
      }).toThrow('No choices returned from Dapr conversation API');
    });
  });
});