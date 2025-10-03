import { z } from 'zod';
import { WorkflowActivityContext } from '@dapr/dapr';
import { AgentBase } from '../base/agent.js';
import { ChatClientBase } from '../llm/chat.js';
import { BaseMessage, UserMessage, LLMChatResponse } from '../types/message.js';

/**
 * Configuration schema for WorkflowTask
 */
export const WorkflowTaskConfigSchema = z.object({
  func: z.function().optional().describe('The original function to be executed, if provided.'),
  description: z.string().optional().describe('A description template for the task, used with LLM or agent.'),
  agent: z.any().optional().describe('The agent used for task execution, if applicable.'),
  llm: z.any().optional().describe('The LLM client for executing the task, if applicable.'),
  includeChatHistory: z.boolean().optional().default(false).describe('Whether to include past conversation history in the LLM call.'),
  workflowApp: z.any().optional().describe('Reference to the WorkflowApp instance.'),
  structuredMode: z.enum(['json', 'function_call']).default('json').describe('Mode for structured output'),
  timeout: z.number().optional().describe('Task execution timeout in seconds'),
  retryCount: z.number().optional().default(3).describe('Number of retry attempts'),
  returnType: z.any().optional().describe('Expected return type for validation'),
});

export type WorkflowTaskConfig = z.infer<typeof WorkflowTaskConfigSchema>;

/**
 * Encapsulates task logic for execution by an LLM, agent, or TypeScript function.
 * 
 * PYTHON EQUIVALENT: WorkflowTask class from task.py starting at line 56
 * Supports both synchronous and asynchronous tasks, with optional output validation
 * using Zod schemas or specified return types.
 */
export class WorkflowTask {
  public func?: (...args: any[]) => any;
  public description?: string;
  public agent?: AgentBase;
  public llm?: ChatClientBase;
  public includeChatHistory: boolean;
  public workflowApp?: any;
  public structuredMode: 'json' | 'function_call';
  public timeout?: number;
  public retryCount: number;
  public returnType?: any;
  
  private chatHistory: BaseMessage[] = [];

  constructor(config: Partial<WorkflowTaskConfig> = {}) {
    this.func = config.func;
    this.description = config.description;
    this.agent = config.agent;
    this.llm = config.llm;
    this.includeChatHistory = config.includeChatHistory ?? false;
    this.workflowApp = config.workflowApp;
    this.structuredMode = config.structuredMode ?? 'json';
    this.timeout = config.timeout;
    this.retryCount = config.retryCount ?? 3;
    this.returnType = config.returnType;
  }

  /**
   * Execute the task with the given context and input
   * PYTHON EQUIVALENT: WorkflowTask.__call__ method in task.py line 399 and the _choose_executor/_normalize_input/_convert_result methods
   */
  public async execute(context: WorkflowActivityContext, input?: any): Promise<any> {
    console.log(`🔄 Executing task in context: ${context.getWorkflowInstanceId()}`);

    try {
      // Determine execution strategy based on configuration
      if (this.agent) {
        return await this.executeWithAgent(context, input);
      } else if (this.llm || this.description) {
        return await this.executeWithLLM(context, input);
      } else if (this.func) {
        return await this.executeWithFunction(context, input);
      } else {
        throw new Error('Task must have either agent, LLM/description, or function configured');
      }
    } catch (error) {
      console.error(`❌ Task execution failed:`, error);
      throw error;
    }
  }

  /**
   * Execute the task using an agent
   * PYTHON EQUIVALENT: Part of _choose_executor method in task.py line 148 (agent execution path)
   */
  private async executeWithAgent(context: WorkflowActivityContext, input?: any): Promise<any> {
    if (!this.agent) {
      throw new Error('Agent not configured for this task');
    }

    console.log(`🤖 Executing task with agent: ${this.agent.constructor.name}`);

    try {
      // Prepare the input for the agent
      const agentInput = this.prepareAgentInput(input);
      
      // Execute with the agent
      const result = await this.agent.run(agentInput);
      
      // Validate and return result
      return this.validateAndFormatResult(result);
    } catch (error) {
      console.error(`❌ Agent execution failed:`, error);
      throw error;
    }
  }

  /**
   * Execute the task using an LLM
   * PYTHON EQUIVALENT: Part of _choose_executor method in task.py line 148 (llm execution path)
   */
  private async executeWithLLM(context: WorkflowActivityContext, input?: any): Promise<any> {
    const llmClient = this.llm || this.workflowApp?.llm;
    
    if (!llmClient) {
      throw new Error('No LLM client available for task execution');
    }

    if (!this.description) {
      throw new Error('Description is required for LLM-based task execution');
    }

    console.log(`🧠 Executing task with LLM: ${llmClient.provider}`);

    try {
      // Prepare messages for LLM
      const messages = this.prepareLLMMessages(input);
      
      // Execute LLM call with retries
      let lastError: Error | undefined;
      
      for (let attempt = 1; attempt <= this.retryCount; attempt++) {
        try {
          const response = await llmClient.generate(messages);
          const result = this.extractResultFromLLMResponse(response);
          
          // Update chat history if configured
          if (this.includeChatHistory) {
            this.updateChatHistory(messages, response);
          }
          
          return this.validateAndFormatResult(result);
        } catch (error) {
          lastError = error as Error;
          console.warn(`⚠️ LLM execution attempt ${attempt} failed:`, error);
          
          if (attempt < this.retryCount) {
            // Wait before retry with exponential backoff
            await this.wait(Math.pow(2, attempt) * 1000);
          }
        }
      }
      
      throw lastError || new Error('LLM execution failed after all retries');
    } catch (error) {
      console.error(`❌ LLM execution failed:`, error);
      throw error;
    }
  }

  /**
   * Execute the task using a TypeScript function
   * PYTHON EQUIVALENT: Part of _choose_executor method in task.py line 148 (python execution path)
   */
  private async executeWithFunction(context: WorkflowActivityContext, input?: any): Promise<any> {
    if (!this.func) {
      throw new Error('Function not configured for this task');
    }

    console.log(`⚙️ Executing task with function: ${this.func.name || 'anonymous'}`);

    try {
      // Check if function is async
      const isAsync = this.func.constructor.name === 'AsyncFunction';
      
      let result: any;
      if (isAsync) {
        result = await this.func(context, input);
      } else {
        result = this.func(context, input);
      }
      
      return this.validateAndFormatResult(result);
    } catch (error) {
      console.error(`❌ Function execution failed:`, error);
      throw error;
    }
  }

  /**
   * Prepare input for agent execution
   * PYTHON EQUIVALENT: _normalize_input method in task.py line 242 and _format_natural_agent_input in line 345
   */
  private prepareAgentInput(input: any): any {
    if (this.description && input) {
      // Combine description with input
      return {
        task: this.description,
        input: input,
        context: this.includeChatHistory ? this.chatHistory : undefined,
      };
    }
    
    return input || this.description;
  }

  /**
   * Prepare messages for LLM execution
   */
  private prepareLLMMessages(input: any): BaseMessage[] {
    const messages: BaseMessage[] = [];
    
    // Add chat history if configured
    if (this.includeChatHistory && this.chatHistory.length > 0) {
      messages.push(...this.chatHistory);
    }
    
    // Create user message with task description and input
    let userContent = this.description || '';
    
    if (input !== undefined) {
      if (typeof input === 'string') {
        userContent += `\n\nInput: ${input}`;
      } else {
        userContent += `\n\nInput: ${JSON.stringify(input, null, 2)}`;
      }
    }
    
    messages.push({
      role: 'user',
      content: userContent,
    } as UserMessage);
    
    return messages;
  }

  /**
   * Extract result from LLM response
   */
  private extractResultFromLLMResponse(response: LLMChatResponse): any {
    if (!response.results || response.results.length === 0) {
      throw new Error('No results in LLM response');
    }
    
    const firstResult = response.results[0];
    if (!firstResult) {
      throw new Error('No results in LLM response');
    }
    
    const content = firstResult.message.content;
    
    // Try to parse as JSON if structured mode is enabled
    if (this.structuredMode === 'json' && content) {
      try {
        return JSON.parse(content);
      } catch {
        // If JSON parsing fails, return the raw content
        return content;
      }
    }
    
    return content;
  }

  /**
   * Update chat history with the latest exchange
   */
  private updateChatHistory(messages: BaseMessage[], response: LLMChatResponse): void {
    // Add the latest user message if not already in history
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && !this.chatHistory.some(msg => 
      msg.role === lastUserMessage.role && msg.content === lastUserMessage.content
    )) {
      this.chatHistory.push(lastUserMessage);
    }
    
    // Add the assistant response
    if (response.results && response.results.length > 0 && response.results[0]) {
      this.chatHistory.push(response.results[0].message);
    }
    
    // Limit history size to prevent context overflow
    const maxHistorySize = 20;
    if (this.chatHistory.length > maxHistorySize) {
      this.chatHistory = this.chatHistory.slice(-maxHistorySize);
    }
  }

  /**
   * Validate and format the result based on return type
   * PYTHON EQUIVALENT: _convert_result method in task.py line 291
   */
  private validateAndFormatResult(result: any): any {
    if (this.returnType) {
      try {
        // If returnType is a Zod schema, validate with it
        if (this.returnType.parse) {
          return this.returnType.parse(result);
        }
        
        // If returnType is a constructor function, try to create an instance
        if (typeof this.returnType === 'function') {
          return new this.returnType(result);
        }
      } catch (error) {
        console.warn(`⚠️ Result validation failed, returning raw result:`, error);
      }
    }
    
    return result;
  }

  /**
   * Wait for specified milliseconds
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a copy of this task with updated configuration
   */
  public clone(overrides: Partial<WorkflowTaskConfig> = {}): WorkflowTask {
    return new WorkflowTask({
      func: this.func,
      description: this.description,
      agent: this.agent,
      llm: this.llm,
      includeChatHistory: this.includeChatHistory,
      workflowApp: this.workflowApp,
      structuredMode: this.structuredMode,
      timeout: this.timeout,
      retryCount: this.retryCount,
      returnType: this.returnType,
      ...overrides,
    });
  }

  /**
   * Get task metadata for debugging
   */
  public getMetadata(): Record<string, any> {
    return {
      hasFunc: !!this.func,
      hasDescription: !!this.description,
      hasAgent: !!this.agent,
      hasLLM: !!this.llm,
      includeChatHistory: this.includeChatHistory,
      structuredMode: this.structuredMode,
      timeout: this.timeout,
      retryCount: this.retryCount,
      chatHistoryLength: this.chatHistory.length,
    };
  }
}