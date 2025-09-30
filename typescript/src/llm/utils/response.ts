import { 
  LLMChatResponse, 
  LLMChatCandidateChunk,
  AssistantMessage 
} from '../../types/message.js';

/**
 * Type for structure handler modes
 */
export type StructuredMode = 'json' | 'function_call';

/**
 * Type for response format
 */
export type ResponseFormat<T = any> = {
  new (...args: any[]): T;
} | null;

/**
 * Response handler for processing LLM responses
 */
export class ResponseHandler {
  /**
   * Process a chat completion response
   * 
   * @param response - Raw API response
   * @param llmProvider - Provider name (e.g., "openai", "dapr")
   * @param responseFormat - Optional Pydantic-like model for structured output
   * @param structuredMode - "json" or "function_call"
   * @param stream - Whether this is a streaming response
   * @param onChunk - Callback for streaming chunks
   * @returns Processed response in various formats
   */
  public static async processResponse<T = any>(
    response: any,
    llmProvider: string,
    responseFormat?: ResponseFormat<T>,
    structuredMode: StructuredMode = 'json',
    stream: boolean = false,
    onChunk?: (chunk: LLMChatCandidateChunk) => void
  ): Promise<
    | AsyncIterableIterator<LLMChatCandidateChunk>  // when streaming
    | LLMChatResponse                               // non-stream + no format
    | T                                             // non-stream + single structured format
    | T[]                                           // non-stream + list structured format
  > {
    const provider = llmProvider.toLowerCase();

    // Streaming response
    if (stream) {
      return this.processStreamingResponse(response, provider, onChunk);
    }

    // Non-streaming response
    // 1) Normalize provider response to LLMChatResponse
    let llmResponse: LLMChatResponse;
    
    switch (provider) {
      case 'openai':
      case 'nvidia':
        llmResponse = await this.processOpenAIChatResponse(response);
        break;
      case 'dapr':
        llmResponse = await this.processDaprChatResponse(response);
        break;
      default:
        llmResponse = response as LLMChatResponse;
    }

    // 2) If no structured format requested, return the full response
    if (!responseFormat) {
      return llmResponse;
    }

    // 3) Extract and validate structured output
    return this.extractStructuredOutput(llmResponse, responseFormat, structuredMode);
  }

  /**
   * Process streaming response
   */
  private static async processStreamingResponse(
    stream: any,
    provider: string,
    onChunk?: (chunk: LLMChatCandidateChunk) => void
  ): Promise<AsyncIterableIterator<LLMChatCandidateChunk>> {
    // StreamHandler implementation would go here
    throw new Error('Streaming response processing not yet implemented');
  }

  /**
   * Process OpenAI-format chat response
   */
  private static async processOpenAIChatResponse(response: any): Promise<LLMChatResponse> {
    // This would handle OpenAI-specific response format conversion
    // For now, return a basic structure
    return {
      results: response.choices?.map((choice: any, index: number) => ({
        message: {
          role: 'assistant' as const,
          content: choice.message?.content || '',
          functionCall: choice.message?.function_call,
          toolCalls: choice.message?.tool_calls,
        },
        finishReason: choice.finish_reason,
        index,
        logprobs: choice.logprobs,
      })) || [],
      metadata: {
        id: response.id || 'unknown',
        model: response.model,
        created: response.created,
        system_fingerprint: response.system_fingerprint,
        usage: response.usage,
      },
    };
  }

  /**
   * Process Dapr-format chat response
   */
  private static async processDaprChatResponse(response: any): Promise<LLMChatResponse> {
    // This would handle Dapr-specific response format conversion
    throw new Error('Dapr response processing not yet implemented');
  }

  /**
   * Extract structured output from LLM response
   */
  private static extractStructuredOutput<T>(
    response: LLMChatResponse,
    responseFormat: ResponseFormat<T>,
    mode: StructuredMode
  ): T | T[] {
    if (!response.results || response.results.length === 0) {
      throw new Error('No results in LLM response');
    }

    const firstResult = response.results[0];
    if (!firstResult) {
      throw new Error('No first result in LLM response');
    }

    const firstMessage = firstResult.message;
    if (!firstMessage) {
      throw new Error('No message in first result');
    }

    // Extract content based on structured mode
    let contentToValidate: string;
    
    if (mode === 'function_call' && firstMessage.functionCall) {
      contentToValidate = firstMessage.functionCall.arguments || '{}';
    } else if (mode === 'json') {
      contentToValidate = firstMessage.content || '{}';
    } else {
      throw new Error(`Unsupported structured mode: ${mode}`);
    }

    try {
      const parsed = JSON.parse(contentToValidate);
      
      // If responseFormat is provided, validate against it
      if (responseFormat) {
        // This would need proper runtime validation
        // For now, just return the parsed content
        return parsed as T;
      }
      
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse structured output: ${error}`);
    }
  }

  /**
   * Get the first assistant message from a response
   */
  public static getFirstMessage(response: LLMChatResponse): AssistantMessage | undefined {
    if (!response.results || response.results.length === 0) {
      return undefined;
    }

    const firstResult = response.results[0];
    if (!firstResult) {
      return undefined;
    }
    
    const message = firstResult.message;
    
    if (message && message.role === 'assistant') {
      return message as AssistantMessage;
    }
    
    return undefined;
  }

  /**
   * Validate response format
   */
  public static validateResponseFormat<T>(
    format: ResponseFormat<T>
  ): boolean {
    // Basic validation - check if it's a constructor function
    return typeof format === 'function';
  }
}