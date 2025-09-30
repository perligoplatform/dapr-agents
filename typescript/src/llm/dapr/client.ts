import { z } from 'zod';
import { LLMClientBase } from '../../base/llm.js';
import { DaprInferenceClientConfig } from '../../types/llm.js';

/**
 * Configuration schema for Dapr Inference Client
 */
export const DaprInferenceClientConfigSchema = z.object({
  componentName: z.string().optional().describe('Dapr LLM component name'),
  contextId: z.string().optional().describe('Context ID for conversation tracking'),
  scrubPii: z.boolean().optional().describe('Whether to scrub PII from messages'),
  temperature: z.number().optional().describe('Temperature for generation'),
  parameters: z.record(z.any()).optional().describe('Additional parameters'),
});

export type DaprInferenceClientBaseConfig = z.infer<typeof DaprInferenceClientConfigSchema>;

/**
 * Dapr conversation tool definition
 */
export interface DaprConversationTool {
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

/**
 * Dapr conversation message
 */
export interface DaprConversationMessage {
  role: string;
  content?: string;
  toolCalls?: DaprToolCall[];
}

/**
 * Dapr tool call definition
 */
export interface DaprToolCall {
  id?: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Base class for Dapr Inference clients
 */
export abstract class DaprInferenceClientBase extends LLMClientBase {
  public readonly componentName?: string;
  public readonly contextId?: string;
  public readonly scrubPii?: boolean;
  public readonly temperature?: number;
  public readonly parameters?: Record<string, any>;

  // Protected members for subclasses
  protected _llmComponent: string | undefined;
  protected _daprClient?: any; // DaprClient type to be defined

  constructor(config: DaprInferenceClientBaseConfig = {}) {
    super();
    const validated = DaprInferenceClientConfigSchema.parse(config) as any;
    
    this.componentName = validated.componentName;
    this.contextId = validated.contextId;
    this.scrubPii = validated.scrubPii;
    this.temperature = validated.temperature;
    this.parameters = validated.parameters;

    this._postInit();
  }

  private _postInit(): void {
    this._llmComponent = this.componentName || process.env.DAPR_LLM_COMPONENT_DEFAULT;
    if (!this._llmComponent) {
      throw new Error(
        'You must provide a componentName or set DAPR_LLM_COMPONENT_DEFAULT in the environment.'
      );
    }
    
    // Initialize Dapr client
    this._daprClient = this.createDaprClient();
  }

  public get provider(): string {
    return 'dapr';
  }

  public get api(): string {
    return 'chat';
  }

  public get config(): DaprInferenceClientConfig {
    return {
      componentName: this.componentName,
      contextId: this.contextId,
      scrubPii: this.scrubPii,
      temperature: this.temperature,
      parameters: this.parameters,
    } as DaprInferenceClientConfig;
  }

  public get client(): any {
    if (!this._daprClient) {
      throw new Error('Dapr client not initialized');
    }
    return this._daprClient;
  }

  public getConfig(): DaprInferenceClientConfig {
    return this.config;
  }

  public getClient(): any {
    return this.client;
  }

  /**
   * Create Dapr client instance
   */
  protected createDaprClient(): any {
    const { DaprClient } = require('@dapr/dapr');
    return new DaprClient();
  }

  /**
   * Convert OpenAI-style tools to Dapr conversation tools
   */
  protected convertOpenAIToolsToConversationTools(
    tools?: Record<string, any>[]
  ): DaprConversationTool[] | undefined {
    if (!tools) {
      return undefined;
    }

    return tools.map(tool => {
      const fn = tool.function || {};
      return {
        function: {
          name: fn.name || '',
          description: fn.description || '',
          parameters: fn.parameters || {},
        },
      };
    });
  }

  /**
   * Chat completion using Dapr Alpha2 API
   */
  public async chatCompletionAlpha2(options: {
    llm: string;
    inputs: DaprConversationMessage[];
    scrubPii?: boolean;
    temperature?: number;
    tools?: Record<string, any>[];
    toolChoice?: string;
    contextId?: string;
    parameters?: Record<string, any>;
  }): Promise<Record<string, any>> {
    const {
      llm,
      inputs,
      scrubPii,
      temperature = 1,
      tools,
      toolChoice,
      contextId,
      parameters,
    } = options;

    const convTools = this.convertOpenAIToolsToConversationTools(tools);

    try {
      // This would use the actual Dapr conversation API
      const response = await this.callDaprConversationAPI({
        name: llm,
        inputs,
        ...(contextId && { contextId }),
        ...(parameters && { parameters }),
        ...(scrubPii !== undefined && { scrubPii }),
        temperature,
        ...(convTools && { tools: convTools }),
        ...(toolChoice && { toolChoice }),
      });

      return this.convertDaprResponseToOpenAIFormat(response);
    } catch (error) {
      throw new Error(`Dapr conversation API call failed: ${error}`);
    }
  }

  /**
   * Call Dapr conversation API via HTTP invoker
   */
  protected async callDaprConversationAPI(params: {
    name: string;
    inputs: DaprConversationMessage[];
    contextId?: string;
    parameters?: Record<string, any>;
    scrubPii?: boolean;
    temperature?: number;
    tools?: DaprConversationTool[];
    toolChoice?: string;
  }): Promise<any> {
    if (!this._daprClient) {
      throw new Error('Dapr client not initialized');
    }

    try {
      // Use Dapr invoker to call the conversation API
      // This calls the Dapr conversation API endpoint directly via HTTP
      const response = await this._daprClient.invoker.invoke(
        this._llmComponent!, // Component name
        'converse', // Method name for conversation API
        'POST',
        {
          inputs: params.inputs,
          contextId: params.contextId,
          parameters: params.parameters,
          scrubPii: params.scrubPii,
          temperature: params.temperature,
          tools: params.tools,
          toolChoice: params.toolChoice,
        }
      );

      return response;
    } catch (error) {
      throw new Error(`Dapr conversation API call failed: ${error}`);
    }
  }

  /**
   * Convert Dapr response to OpenAI-like format
   */
  protected convertDaprResponseToOpenAIFormat(response: any): Record<string, any> {
    const outputs: Record<string, any>[] = [];
    
    for (const output of response.outputs || []) {
      const choicesList: Record<string, any>[] = [];
      
      for (const choice of output.choices || []) {
        const msg = choice.message;
        const content = msg?.content;

        // Convert tool calls if present
        let toolCallsJson: Record<string, any>[] | undefined;
        if (msg?.toolCalls?.length > 0) {
          toolCallsJson = msg.toolCalls.map((tc: any) => {
            const fn = tc.function;
            let args = fn?.arguments;
            
            if (typeof args === 'object') {
              args = JSON.stringify(args);
            } else if (args === null || args === undefined) {
              args = '';
            }

            return {
              id: tc.id || `call_${Date.now()}`,
              type: 'function',
              function: {
                name: fn?.name || '',
                arguments: args,
              },
            };
          });
        }

        choicesList.push({
          index: choice.index || 0,
          message: {
            role: 'assistant',
            content: content || '',
            tool_calls: toolCallsJson,
          },
          finish_reason: choice.finishReason || 'stop',
        });
      }

      outputs.push({
        id: `chatcmpl-dapr-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'dapr-model',
        choices: choicesList,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      });
    }

    return outputs[0] || {};
  }

  /**
   * Check if Dapr runtime version is supported
   */
  protected checkDaprRuntimeVersion(): boolean {
    // This would check the actual Dapr runtime version
    // For now, assume it's supported
    return true;
  }

  /**
   * Validate Dapr client configuration
   */
  public validateDaprConfig(): boolean {
    if (!this._llmComponent) {
      throw new Error('LLM component name is required');
    }
    
    return this.checkDaprRuntimeVersion();
  }
}