import { BaseMessage } from '../types/message.js';

/**
 * Abstract base class for managing message memory
 */
export abstract class MemoryBase {
  /**
   * Add a single message to memory storage
   */
  public abstract addMessage(message: BaseMessage): void;

  /**
   * Add multiple messages to memory storage
   */
  public abstract addMessages(messages: BaseMessage[]): void;

  /**
   * Add a user-assistant interaction to memory storage
   */
  public abstract addInteraction(userMessage: BaseMessage, assistantMessage: BaseMessage): void;

  /**
   * Retrieve all messages from memory storage
   */
  public abstract getMessages(): Record<string, any>[];

  /**
   * Clear all messages from memory storage
   */
  public abstract resetMemory(): void;

  /**
   * Convert a BaseMessage to a dictionary if necessary
   */
  protected static convertToDict(message: Record<string, any> | BaseMessage): Record<string, any> {
    if (typeof message === 'object' && message !== null && 'model_dump' in message) {
      return (message as any).model_dump();
    }
    return message as Record<string, any>;
  }
}