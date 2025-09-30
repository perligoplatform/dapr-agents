import { z } from 'zod';
import { ExecutionRequest, ExecutionResult, CodeSnippet } from '../types/executor.js';

/**
 * Supported programming languages for code execution
 */
export const SUPPORTED_LANGUAGES = new Set(['python', 'sh', 'bash'] as const);

/**
 * Abstract base class for executing code in different environments
 */
export abstract class CodeExecutorBase {
  /**
   * Supported programming languages
   */
  public static readonly SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;

  /**
   * Execute the provided code snippets and return results
   * 
   * @param request - The execution request containing code snippets
   * @returns Promise resolving to list of execution results
   */
  public abstract execute(request: ExecutionRequest): Promise<ExecutionResult[]>;

  /**
   * Validate that all code snippets are supported before execution
   * 
   * @param snippets - List of code snippets to validate
   * @returns true if all snippets are valid
   * @throws Error if any snippet has unsupported language
   */
  public validateSnippets(snippets: CodeSnippet[]): boolean {
    for (const snippet of snippets) {
      if (!SUPPORTED_LANGUAGES.has(snippet.language as any)) {
        throw new Error(`Unsupported language: ${snippet.language}`);
      }
    }
    return true;
  }

  /**
   * Check if a language is supported
   * 
   * @param language - Programming language to check
   * @returns true if language is supported
   */
  public isLanguageSupported(language: string): boolean {
    return SUPPORTED_LANGUAGES.has(language as any);
  }

  /**
   * Get list of supported languages
   * 
   * @returns Array of supported language names
   */
  public getSupportedLanguages(): string[] {
    return Array.from(SUPPORTED_LANGUAGES);
  }
}