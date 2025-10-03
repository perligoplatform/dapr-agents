import { z } from 'zod';
import { ChatClientBase } from '../chat.js';
import { DaprInferenceClientBase, DaprInferenceClientBaseConfig } from './client.js';
import { RequestHandler } from '../utils/request.js';
import { ResponseHandler } from '../utils/response.js';
import { 
  LLMChatResponse, 
  Message, 
  ToolCall,
  LLMChatCandidateChunk,
  AssistantMessage 
} from '../../types/index.js';

/**
 * Configuration schema for Dapr Chat Client
 */
export const DaprChatClientConfigSchema = z.object({
  /** Model name to use for chat completions */
  model: z.string().optional(),
  /** Dapr LLM component name */
  componentName: z.string().optional(),
  /** Context ID for conversation tracking */
  contextId: z.string().optional(),
  /** Whether to scrub PII from messages */
  scrubPii: z.boolean().optional(),
  /** Temperature for generation */
  temperature: z.number().optional(),
  /** Additional parameters */
  parameters: z.record(z.any()).optional(),
}).transform((data) => {
  // Validate and set LLM component with fallback logic (matches Python behavior)
  let componentName = data.componentName;
  if (!componentName) {
    componentName = process.env.DAPR_LLM_COMPONENT_DEFAULT;
  }
  if (!componentName) {
    throw new Error(
      'You must provide a componentName or set DAPR_LLM_COMPONENT_DEFAULT in the environment.'
    );
  }
  
  return {
    ...data,
    componentName, // This will now always be defined
  };
});

export type DaprChatClientConfig = z.infer<typeof DaprChatClientConfigSchema>;

// Input type for the constructor (before Zod transformation)
export type DaprChatClientInputConfig = z.input<typeof DaprChatClientConfigSchema>;

/**
 * Dapr chat client implementation
 */
export class DaprChatClient extends ChatClientBase {
  private readonly daprClient: DaprInferenceClientBase;
  private readonly requestHandler: RequestHandler;
  private readonly responseHandler: ResponseHandler;


  constructor(config: DaprChatClientInputConfig = {}) {
    super();
    
    const validated = DaprChatClientConfigSchema.parse(config);

    // Initialize Dapr client with configuration
    this.daprClient = new DaprInferenceClientBaseImpl({
      componentName: validated.componentName,
      contextId: validated.contextId,
      scrubPii: validated.scrubPii,
      temperature: validated.temperature,
      parameters: validated.parameters,
    });
    
    this.requestHandler = new RequestHandler();
    this.responseHandler = new ResponseHandler();
  }

  public get provider(): string {
    return 'dapr';
  }

  public get api(): string {
    return 'chat';
  }

  public get config(): Record<string, any> {
    return this.daprClient.getConfig();
  }

  public get client(): any {
    return this.daprClient.getClient();
  }

  public getConfig(): Record<string, any> {
    return this.config;
  }

  public getClient(): any {
    return this.client;
  }


  /**
   * Public generate method implementation
   */
  public async generate(
    messages: any,
    options: any = {}
  ): Promise<LLMChatResponse> {
    const request = this.prepareRequest(messages, options);
    return this._generate(request, options.model);
  }

  /**
   * Check if structured mode is supported
   */
  public isStructuredModeSupported(mode: string): boolean {
    // Dapr supports JSON mode via conversation API
    return mode === 'json_object';
  }

  /**
   * Get supported structured modes
   */
  public getSupportedStructuredModes(): string[] {
    return ['json_object'];
  }

  /**
   * Prepare request from various input formats
   */
  private prepareRequest(messages: any, options: any): any {
    let normalizedMessages: Message[];
    
    if (typeof messages === 'string') {
      normalizedMessages = [{ role: 'user', content: messages }] as Message[];
    } else if (Array.isArray(messages)) {
      normalizedMessages = messages as Message[];
    } else {
      normalizedMessages = [messages] as Message[];
    }

    return {
      messages: normalizedMessages,
      model: options.model,
      temperature: options.temperature,
      tools: options.tools,
      toolChoice: options.toolChoice,
      extraParams: options.extraParams || {},
    };
  }

  /**
   * Generate chat completion using Dapr
   */
  protected async _generate(
    request: any,
    model?: string
  ): Promise<LLMChatResponse> {
    try {
      // Normalize messages to Dapr format
      const normalizedMessages = RequestHandler.normalizeChatMessages(
        request.messages,
        'dapr'
      ) as Message[];

      // Convert to Dapr conversation messages
      const daprMessages = this.convertMessagesToDaprFormat(normalizedMessages);

      // Prepare request options
      const llmName = model || request.model || 'default';
      
      const options = {
        llm: llmName,
        inputs: daprMessages,
        ...(this.daprClient.scrubPii !== undefined && { scrubPii: this.daprClient.scrubPii }),
        temperature: request.temperature ?? this.daprClient.temperature ?? 1,
        tools: request.tools,
        toolChoice: request.toolChoice,
        ...(this.daprClient.contextId !== undefined && { contextId: this.daprClient.contextId }),
        parameters: {
          ...this.daprClient.parameters,
          ...(request.extraParams || {}),
        },
      };

      // Call Dapr conversation API
      const response = await this.daprClient.chatCompletionAlpha2(options);

      // Process response
      const processedResponse = await ResponseHandler.processResponse(response, 'dapr');
      return processedResponse as unknown as LLMChatResponse;
    } catch (error) {
      throw new Error(`Dapr chat completion failed: ${error}`);
    }
  }

  /**
   * Convert normalized messages to Dapr conversation format
   */
  private convertMessagesToDaprFormat(messages: Message[]): any[] {
    return messages.map(msg => {
      const daprMessage: any = {
        role: msg.role,
      };

      // Handle text content
      if (typeof msg.content === 'string') {
        daprMessage.content = msg.content;
      } else if (msg.content && Array.isArray(msg.content)) {
        // Handle multi-part content (text + images)
        const content = msg.content as any[];
        const textParts = content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('\n');
        
        if (textParts) {
          daprMessage.content = textParts;
        }
      }

      // Handle tool calls (for assistant messages)
      if ('toolCalls' in msg && msg.toolCalls && msg.toolCalls.length > 0) {
        daprMessage.toolCalls = msg.toolCalls.map((toolCall: any) => ({
          id: toolCall.id,
          function: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          },
        }));
      }

      return daprMessage;
    });
  }

  /**
   * Stream chat completion (not supported in Dapr Alpha2)
   */
  protected async *_generateStream(
    request: any,
    model?: string
  ): AsyncGenerator<any, void, unknown> {
    // Dapr conversation API doesn't support streaming in Alpha2
    // Fall back to regular generation
    const response = await this._generate(request, model);
    yield response;
  }

  /**
   * Validate Dapr client configuration
   */
  public validateConfig(): boolean {
    return this.daprClient.validateDaprConfig();
  }
}

/**
 * Concrete implementation of DaprInferenceClientBase for chat
 */
class DaprInferenceClientBaseImpl extends DaprInferenceClientBase {
  constructor(config: DaprInferenceClientBaseConfig) {
    super(config);
  }

  public async generate(): Promise<any> {
    throw new Error('Use chatCompletionAlpha2 for chat generation');
  }
}