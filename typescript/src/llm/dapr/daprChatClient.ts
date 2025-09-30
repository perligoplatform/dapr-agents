import { z } from 'zod';
import { DaprInferenceClientBase, DaprInferenceClientBaseConfig } from './client.js';
import { ChatClientBase } from '../chat.js';
import { LLMChatResponse } from '../../types/message.js';
import { BaseMessage, AssistantMessage, ToolMessage, UserMessage } from '../../types/message.js';

/**
 * Configuration schema for Dapr Chat Client
 */
export const DaprChatClientConfigSchema = z.object({
  componentName: z.string().describe('Dapr LLM component name'),
  contextId: z.string().optional().describe('Context ID for conversation tracking'),
  scrubPii: z.boolean().optional().describe('Whether to scrub PII from messages'),
  temperature: z.number().optional().describe('Temperature for generation'),
  parameters: z.record(z.any()).optional().describe('Additional parameters'),
});

export type DaprChatClientConfig = z.infer<typeof DaprChatClientConfigSchema>;

/**
 * Dapr Chat Client that implements conversation via Dapr conversation API
 * 
 * This client wraps the Dapr conversation API and provides a standardized 
 * interface for chat completion using Dapr LLM components.
 */
export class DaprChatClient extends DaprInferenceClientBase implements ChatClientBase {
  // Override getters to provide proper values
  public get provider(): string {
    return 'dapr';
  }

  public get api(): string {
    return 'chat';
  }

  /**
   * Check if a structured output mode is supported
   */
  public isStructuredModeSupported(mode: string): boolean {
    // Dapr currently doesn't support structured output modes
    return false;
  }

  /**
   * Get list of supported structured output modes
   */
  public getSupportedStructuredModes(): string[] {
    // Dapr currently doesn't support structured output modes
    return [];
  }

  constructor(config: DaprChatClientConfig) {
    super(config);
    
    if (!config.componentName) {
      throw new Error('componentName is required for DaprChatClient');
    }
  }

  /**
   * Generate chat completion using Dapr conversation API
   */
  public async generate(
    messages: BaseMessage[],
    tools?: any[],
    toolChoice?: string,
    options?: Record<string, any>
  ): Promise<LLMChatResponse> {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }
    
    try {
      // Convert BaseMessage[] to Dapr conversation format
      const daprMessages = this.convertMessagesToDaprFormat(messages);
      
      // Call Dapr conversation API
      const apiParams: any = {
        llm: this.componentName!,
        inputs: daprMessages,
        temperature: this.temperature || 1.0,
        parameters: { ...this.parameters, ...options },
      };

      // Only add optional properties if they have defined values
      if (this.scrubPii !== undefined) {
        apiParams.scrubPii = this.scrubPii;
      }
      if (tools !== undefined) {
        apiParams.tools = tools;
      }
      if (toolChoice !== undefined) {
        apiParams.toolChoice = toolChoice;
      }
      if (this.contextId !== undefined) {
        apiParams.contextId = this.contextId;
      }

      const response = await this.chatCompletionAlpha2(apiParams);

      // Convert response to our standard format
      return this.convertResponseToLLMChatResponse(response);
    } catch (error) {
      console.error('❌ Dapr chat completion failed:', error);
      throw new Error(`Dapr chat completion failed: ${error}`);
    }
  }

  /**
   * Convert BaseMessage array to Dapr conversation message format
   */
  private convertMessagesToDaprFormat(messages: BaseMessage[]): any[] {
    return messages.map(message => {
      const daprMessage: any = {
        role: message.role,
        content: message.content,
      };

      // Handle tool calls for assistant messages
      if (message.role === 'assistant' && 'toolCalls' in message && message.toolCalls) {
        // Check if toolCalls is actually an array
        if (Array.isArray(message.toolCalls)) {
          daprMessage.toolCalls = message.toolCalls.map((toolCall: any) => ({
            id: toolCall.id,
            function: {
              name: toolCall.function.name,
              arguments: toolCall.function.arguments,
            },
          }));
        }
      }

      // Handle tool call responses
      if (message.role === 'tool' && 'toolCallId' in message) {
        daprMessage.tool_call_id = (message as any).toolCallId;
      }

      return daprMessage;
    });
  }

  /**
   * Convert Dapr response to our standard LLMChatResponse format
   */
  private convertResponseToLLMChatResponse(response: any): LLMChatResponse {
    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error('No choices returned from Dapr conversation API');
    }

    const message = choice.message;
    if (!message) {
      throw new Error('No message in choice from Dapr conversation API');
    }

    // Create assistant message
    const assistantMessage: AssistantMessage = {
      role: 'assistant',
      content: message.content || '',
    };

    // Add tool calls if present
    if (message.tool_calls && message.tool_calls.length > 0) {
      (assistantMessage as any).tool_calls = message.tool_calls;
    }

    // Create chat candidate
    const candidate = {
      message: assistantMessage,
      finishReason: choice.finish_reason || 'stop',
    };

    // Return proper LLMChatResponse structure
    return {
      results: [candidate],
      metadata: {
        componentName: this.config.componentName,
        contextId: this.config.contextId,
        usage: response.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        raw: response,
      },
    };
  }

  /**
   * Stream chat completion (not implemented for Dapr yet)
   */
  public async *generateStream(
    messages: BaseMessage[],
    tools?: any[],
    toolChoice?: string,
    options?: Record<string, any>
  ): AsyncGenerator<string, void, unknown> {
    // For now, fall back to non-streaming
    const response = await this.generate(messages, tools, toolChoice, options);
    // Extract content from the first result
    const firstResult = response.results[0];
    if (firstResult?.message?.content) {
      yield firstResult.message.content;
    }
  }

  /**
   * Get the Dapr client configuration
   */
  public getConfig(): DaprChatClientConfig {
    return {
      componentName: this.componentName!,
      contextId: this.contextId,
      scrubPii: this.scrubPii,
      temperature: this.temperature,
      parameters: this.parameters,
    };
  }

  /**
   * Validate that the Dapr component is properly configured
   */
  public async validateComponent(): Promise<boolean> {
    try {
      // Test with a simple message
      const testMessages: BaseMessage[] = [
        {
          role: 'user',
          content: 'Hello, this is a test message.',
        }
      ];

      await this.generate(testMessages);
      return true;
    } catch (error) {
      console.error('❌ Dapr component validation failed:', error);
      return false;
    }
  }
}