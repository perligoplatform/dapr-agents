import { z } from 'zod';

/**
 * Zod schema for ExecutionResult
 */
export const ExecutionResultSchema = z.object({
  /** The execution status, either 'success' or 'error' */
  status: z.string(),
  /** The standard output or error message resulting from execution */
  output: z.string(),
  /** The exit code returned by the executed process (0 indicates success, non-zero indicates an error) */
  exitCode: z.number(),
});

/**
 * TypeScript interface for ExecutionResult
 */
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

/**
 * Zod schema for CodeSnippet
 */
export const CodeSnippetSchema = z.object({
  /** The programming language of the code snippet (e.g., 'python', 'javascript') */
  language: z.string(),
  /** The actual source code to be executed */
  code: z.string(),
  /** Per-snippet timeout (seconds). Executor falls back to the request-level timeout if omitted */
  timeout: z.number().default(5),
});

/**
 * TypeScript interface for CodeSnippet
 */
export type CodeSnippet = z.infer<typeof CodeSnippetSchema>;

/**
 * Zod schema for ExecutionRequest
 */
export const ExecutionRequestSchema = z.object({
  /** A list of code snippets to be executed sequentially or in parallel */
  snippets: z.array(CodeSnippetSchema),
  /** The maximum time (in seconds) allowed for execution before timing out (default is 5 seconds) */
  timeout: z.number().default(5),
});

/**
 * TypeScript interface for ExecutionRequest
 */
export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

/**
 * Helper functions for creating execution-related objects
 */

export function createExecutionResult(
  status: 'success' | 'error',
  output: string,
  exitCode: number
): ExecutionResult {
  return ExecutionResultSchema.parse({
    status,
    output,
    exitCode,
  });
}

export function createCodeSnippet(
  language: string,
  code: string,
  timeout: number = 5
): CodeSnippet {
  return CodeSnippetSchema.parse({
    language,
    code,
    timeout,
  });
}

export function createExecutionRequest(
  snippets: CodeSnippet[],
  timeout: number = 5
): ExecutionRequest {
  return ExecutionRequestSchema.parse({
    snippets,
    timeout,
  });
}