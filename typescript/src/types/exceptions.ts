/**
 * Custom exception classes for Dapr Agents TypeScript
 * 
 * These mirror the Python exception hierarchy for consistency
 */

/**
 * Custom exception for AgentToolExecutor specific errors
 */
export class AgentToolExecutorError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'AgentToolExecutorError';
    this.cause = cause;
  }
}

/**
 * Custom exception for Agent specific errors, used to handle errors specific to agent operations
 */
export class AgentError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'AgentError';
    this.cause = cause;
  }
}

/**
 * Custom exception for tool-related errors
 */
export class ToolError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ToolError';
    this.cause = cause;
  }
}

/**
 * Custom exception for errors related to structured handling
 */
export class StructureError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'StructureError';
    this.cause = cause;
  }
}

/**
 * Custom exception for errors related to function call building
 */
export class FunCallBuilderError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'FunCallBuilderError';
    this.cause = cause;
  }
}

/**
 * Custom exception for errors related to not supported features or versions
 */
export class NotSupportedError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NotSupportedError';
    this.cause = cause;
  }
}

/**
 * Custom exception for errors related to not supported Dapr runtime versions
 */
export class DaprRuntimeVersionNotSupportedError extends NotSupportedError {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'DaprRuntimeVersionNotSupportedError';
    this.cause = cause;
  }
}

/**
 * Helper function to check if an error is of a specific type
 */
export function isErrorOfType<T extends Error>(
  error: unknown,
  ErrorClass: new (...args: any[]) => T
): error is T {
  return error instanceof ErrorClass;
}

/**
 * Helper function to wrap errors in a specific error type
 */
export function wrapError<T extends Error>(
  ErrorClass: new (message: string, cause?: Error) => T,
  message: string,
  cause?: unknown
): T {
  const causeError = cause instanceof Error ? cause : undefined;
  return new ErrorClass(message, causeError);
}