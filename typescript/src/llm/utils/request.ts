import { BaseMessage } from '../../types/message.js';

/**
 * Interface for input variables
 */
export interface PromptyInputs {
  [key: string]: any;
}

/**
 * Request handler for processing LLM requests
 */
export class RequestHandler {
  /**
   * Process and format messages based on Prompty template and provided inputs
   */
  public static processPromptyMessages(
    prompty: any, // Prompty type to be defined later
    inputs: Record<string, any> = {}
  ): Record<string, any>[] {
    // This would need the actual Prompty implementation
    throw new Error('Prompty processing not yet implemented');
  }

  /**
   * Normalize chat messages from various input formats to standard message format
   */
  public static normalizeChatMessages(
    messages: string | Record<string, any> | BaseMessage | Iterable<Record<string, any> | BaseMessage>,
    defaultRole: string = 'user'
  ): Record<string, any>[] {
    // Handle string input
    if (typeof messages === 'string') {
      return [{ role: defaultRole, content: messages }];
    }

    // Handle single message object
    if (!Array.isArray(messages) && !this.isIterable(messages)) {
      const msg = this.messageToDict(messages as Record<string, any> | BaseMessage);
      return [msg];
    }

    // Handle iterable of messages
    const result: Record<string, any>[] = [];
    for (const msg of messages as Iterable<Record<string, any> | BaseMessage>) {
      result.push(this.messageToDict(msg));
    }
    return result;
  }

  /**
   * Check if an object is iterable
   */
  private static isIterable(obj: any): obj is Iterable<any> {
    return obj != null && typeof obj[Symbol.iterator] === 'function';
  }

  /**
   * Convert message to dictionary format
   */
  private static messageToDict(message: Record<string, any> | BaseMessage): Record<string, any> {
    if (typeof message === 'object' && message !== null && 'model_dump' in message) {
      return (message as any).model_dump();
    }
    return message as Record<string, any>;
  }

  /**
   * Validate and process input data
   */
  public static validateInputData(inputData: Record<string, any> | null): Record<string, any> {
    if (!inputData) {
      return {};
    }
    
    // Basic validation - ensure it's an object
    if (typeof inputData !== 'object') {
      throw new Error('Input data must be an object');
    }
    
    return inputData;
  }

  /**
   * Merge default parameters with user-provided ones
   */
  public static mergeParameters(
    defaults: Record<string, any>,
    userParams: Record<string, any>
  ): Record<string, any> {
    return { ...defaults, ...userParams };
  }
}