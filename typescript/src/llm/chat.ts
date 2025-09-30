import { z } from 'zod';
import { PromptTemplateBase } from '../base/prompt.js';
import { AgentTool } from '../base/tools.js';
import { LLMChatResponse, LLMChatCandidateChunk } from '../types/message.js';

/**
 * Type for Prompty source - can be a file path or inline content
 */
export type PromptySource = string;

/**
 * Response format type for structured output
 */
export type ResponseFormat<T = any> = {
  new (...args: any[]): T;
} | null;

/**
 * Overload for non-streaming without response format
 */
export interface ChatGenerateOverload1 {
  <T = any>(
    messages?: string | Record<string, any> | any | Iterable<Record<string, any> | any>,
    options?: {
      inputData?: Record<string, any> | null;
      model?: string | null;
      tools?: (AgentTool | Record<string, any>)[] | null;
      responseFormat?: null;
      structuredMode?: string | null;
      stream?: false;
      [key: string]: any;
    }
  ): Promise<LLMChatResponse>;
}

/**
 * Overload for non-streaming with response format
 */
export interface ChatGenerateOverload2 {
  <T = any>(
    messages?: string | Record<string, any> | any | Iterable<Record<string, any> | any>,
    options?: {
      inputData?: Record<string, any> | null;
      model?: string | null;
      tools?: (AgentTool | Record<string, any>)[] | null;
      responseFormat: ResponseFormat<T>;
      structuredMode?: string | null;
      stream?: false;
      [key: string]: any;
    }
  ): Promise<T | T[]>;
}

/**
 * Overload for streaming
 */
export interface ChatGenerateOverload3 {
  <T = any>(
    messages?: string | Record<string, any> | any | Iterable<Record<string, any> | any>,
    options?: {
      inputData?: Record<string, any> | null;
      model?: string | null;
      tools?: (AgentTool | Record<string, any>)[] | null;
      responseFormat?: ResponseFormat<T> | null;
      structuredMode?: string | null;
      stream: true;
      [key: string]: any;
    }
  ): Promise<AsyncIterableIterator<LLMChatCandidateChunk>>;
}

/**
 * Union of all generate method overloads
 */
export type ChatGenerateMethod = ChatGenerateOverload1 & ChatGenerateOverload2 & ChatGenerateOverload3;

/**
 * Abstract base class for chat-specific functionality.
 * Handles Prompty integration and provides abstract methods for chat client configuration.
 */
export abstract class ChatClientBase {
  /**
   * Optional Prompty spec used to render input_data into messages
   */
  public prompty?: any; // Prompty type to be defined later

  /**
   * Optional prompt template object for rendering
   */
  public promptTemplate?: PromptTemplateBase;

  /**
   * Load a Prompty spec (path or inline), extract its model config and
   * prompt template, and return a configured chat client.
   */
  public static fromPrompty(
    promptySource: PromptySource,
    timeout: number | Record<string, any> = 1500
  ): ChatClientBase {
    throw new Error('fromPrompty must be implemented by subclasses');
  }

  /**
   * Generate chat completions with support for multiple return types based on parameters.
   * 
   * @param messages - Input messages (string, object, or iterable)
   * @param options - Generation options
   * @returns Different types based on streaming and response format
   */
  public abstract generate<T = any>(
    messages?: string | Record<string, any> | any | Iterable<Record<string, any> | any>,
    options?: {
      inputData?: Record<string, any> | null;
      model?: string | null;
      tools?: (AgentTool | Record<string, any>)[] | null;
      responseFormat?: ResponseFormat<T> | null;
      structuredMode?: string | null;
      stream?: boolean;
      [key: string]: any;
    }
  ): Promise<
    | AsyncIterableIterator<LLMChatCandidateChunk>
    | LLMChatResponse
    | T
    | T[]
  >;

  /**
   * Check if a structured output mode is supported
   */
  public abstract isStructuredModeSupported(mode: string): boolean;

  /**
   * Get list of supported structured output modes
   */
  public abstract getSupportedStructuredModes(): string[];
}