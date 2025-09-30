import { z } from 'zod';
import { ChatClientBase, PromptySource } from '../chat.js';
import { OpenAIClientBase } from './client/base.js';
import { RequestHandler, ResponseHandler } from '../utils/index.js';
import { PromptTemplateBase } from '../../base/prompt.js';
import { AgentTool } from '../../base/tools.js';
import { OpenAIModelConfig, AzureOpenAIModelConfig } from '../../types/llm.js';
import { 
  LLMChatResponse, 
  LLMChatCandidateChunk,
  BaseMessage
} from '../../types/message.js';

/**
 * Configuration schema for OpenAI Chat Client
 */
export const OpenAIChatClientConfigSchema = z.object({
  model: z.string().optional().describe('Model name or Azure deployment ID'),
  prompty: z.any().optional().describe('Optional Prompty instance for templating'), // Prompty type TBD
  promptTemplate: z.custom<PromptTemplateBase>().optional().describe('Optional prompt template'),
  // Inherit all OpenAI base config
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  azureEndpoint: z.string().optional(),
  azureDeployment: z.string().optional(),
  apiVersion: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
  azureAdToken: z.string().optional(),
  azureClientId: z.string().optional(),
  timeout: z.union([z.number(), z.record(z.any())]).optional(),
});

export type OpenAIChatClientConfig = z.infer<typeof OpenAIChatClientConfigSchema>;

/**
 * Chat client for OpenAI models, layering in Prompty-driven prompt templates
 * and unified request/response handling.
 * 
 * Inherits:
 * - OpenAIClientBase: manages API key, base_url, retries, etc.
 * - ChatClientBase: provides chat-specific abstractions.
 */
export class OpenAIChatClient extends OpenAIClientBase implements ChatClientBase {
  public readonly model?: string;
  public prompty?: any; // Prompty type to be defined later
  public declare promptTemplate?: PromptTemplateBase;

  public static readonly SUPPORTED_STRUCTURED_MODES = new Set(['json', 'function_call']);

  constructor(config: OpenAIChatClientConfig = {}) {
    const { model, prompty, promptTemplate, ...baseConfig } = config;
    super(baseConfig);
    
    // Set model, falling back to azure_deployment or default
    this.model = model || this.azureDeployment || 'gpt-4o';
    this.prompty = prompty;
    
    // Handle optional assignment with exactOptionalPropertyTypes
    if (promptTemplate !== undefined) {
      this.promptTemplate = promptTemplate;
    }
    
    // Ensure we're in chat API mode
    (this as any)._api = 'chat';
  }

  /**
   * Load a Prompty file (or inline YAML/JSON string), extract its
   * model configuration and prompt template, and return a fully-wired client.
   */
  public static fromPrompty(
    promptySource: PromptySource,
    timeout: number | Record<string, any> = 1500
  ): OpenAIChatClient {
    // This would need the actual Prompty implementation
    throw new Error('Prompty loading not yet implemented');
  }

  /**
   * Generate chat completions with OpenAI
   */
  public async generate<T = any>(
    messages?: string | Record<string, any> | any | Iterable<Record<string, any> | any>,
    options: {
      inputData?: Record<string, any> | null;
      model?: string | null;
      tools?: (AgentTool | Record<string, any>)[] | null;
      responseFormat?: { new (...args: any[]): T } | null;
      structuredMode?: string | null;
      stream?: boolean;
      [key: string]: any;
    } = {}
  ): Promise<
    | AsyncIterableIterator<LLMChatCandidateChunk>
    | LLMChatResponse
    | T
    | T[]
  > {
    const {
      inputData = null,
      model = null,
      tools = null,
      responseFormat = null,
      structuredMode = 'json',
      stream = false,
      ...kwargs
    } = options;

    // 1. Process input into normalized messages
    let processedMessages: Record<string, any>[];
    
    if (this.prompty && inputData) {
      // Use Prompty template
      processedMessages = RequestHandler.processPromptyMessages(this.prompty, inputData);
    } else if (messages !== undefined) {
      // Normalize provided messages
      processedMessages = RequestHandler.normalizeChatMessages(messages);
    } else {
      throw new Error('Either messages or prompty with inputData must be provided');
    }

    // 2. Prepare request parameters
    const requestParams = {
      model: model || this.model,
      messages: processedMessages,
      tools: tools ? this.prepareLLMTools(tools) : undefined,
      response_format: responseFormat ? this.prepareResponseFormat(responseFormat, structuredMode) : undefined,
      stream,
      ...kwargs
    };

    // 3. Make API call
    try {
      const response = await this.makeAPICall(requestParams);
      
      // 4. Process response through ResponseHandler
      return await ResponseHandler.processResponse(
        response,
        'openai',
        responseFormat,
        structuredMode as any,
        stream
      );
    } catch (error) {
      throw new Error(`OpenAI API call failed: ${error}`);
    }
  }

  /**
   * Check if a structured output mode is supported
   */
  public isStructuredModeSupported(mode: string): boolean {
    return OpenAIChatClient.SUPPORTED_STRUCTURED_MODES.has(mode);
  }

  /**
   * Get list of supported structured output modes
   */
  public getSupportedStructuredModes(): string[] {
    return Array.from(OpenAIChatClient.SUPPORTED_STRUCTURED_MODES);
  }

  /**
   * Prepare tools for LLM format
   */
  private prepareLLMTools(tools: (AgentTool | Record<string, any>)[]): any[] {
    // Convert tools to OpenAI format
    return tools.map(tool => {
      if (tool instanceof AgentTool) {
        return tool; // Assume AgentTool has proper format
      }
      return tool; // Pass through raw tool definitions
    });
  }

  /**
   * Prepare response format for structured output
   */
  private prepareResponseFormat(responseFormat: any, mode: string | null): any {
    if (mode === 'json') {
      return { type: 'json_object' };
    } else if (mode === 'function_call') {
      // Would need to convert responseFormat to function schema
      return {
        type: 'function',
        function: this.convertToFunctionSchema(responseFormat)
      };
    }
    return undefined;
  }

  /**
   * Convert response format to OpenAI function schema
   */
  private convertToFunctionSchema(responseFormat: any): any {
    // This would need to introspect the responseFormat type
    // For now, return a basic schema
    return {
      name: 'extract_data',
      description: 'Extract structured data',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    };
  }

  /**
   * Make the actual API call to OpenAI
   */
  private async makeAPICall(params: any): Promise<any> {
    const client = this.client;
    
    // This would use the actual OpenAI client
    // For now, return mock response
    return {
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: Date.now(),
      model: params.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Mock response from OpenAI',
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    };
  }

  /**
   * Validate the client configuration
   */
  public validateClientConfig(): boolean {
    if (!this.model) {
      throw new Error('Model must be specified');
    }
    
    return this.validateConfig();
  }
}