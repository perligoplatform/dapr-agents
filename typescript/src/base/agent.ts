import { z } from 'zod';
import { BaseMessage } from '../types/message.js';
import { ToolExecutionRecord } from '../types/tools.js';
import { LLMClientBase } from './llm.js';
import { PromptTemplateBase } from './prompt.js';
import { MemoryBase } from './memory.js';
import { AgentTool, AgentToolExecutor, ColorTextFormatter } from './tools.js';

/**
 * Template format for rendering prompt templates
 */
export type TemplateFormat = 'f-string' | 'jinja2';

/**
 * Tool choice strategy for selecting tools
 */
export type ToolChoice = 'auto' | 'required' | 'none';

/**
 * Configuration schema for AgentBase
 */
export const AgentBaseConfigSchema = z.object({
  name: z.string().optional().describe("The agent's name"),
  role: z.string().optional().default('Assistant').describe("The agent's role"),
  goal: z.string().optional().default('Help humans').describe("The agent's main objective"),
  instructions: z.array(z.string()).optional().describe('Instructions guiding the agent\'s tasks'),
  systemPrompt: z.string().optional().describe('Custom system prompt overriding other fields'),
  llm: z.custom<LLMClientBase>().optional().describe('Language model client'),
  promptTemplate: z.custom<PromptTemplateBase>().optional().describe('Prompt template for the agent'),
  tools: z.array(z.union([
    z.custom<AgentTool>(),
    z.function()
  ])).default([]).describe('Tools available for the agent'),
  toolChoice: z.enum(['auto', 'required', 'none']).optional().describe('Tool selection strategy'),
  toolHistory: z.array(z.custom<ToolExecutionRecord>()).default([]).describe('Executed tool calls'),
  maxIterations: z.number().int().positive().default(10).describe('Max conversation iterations'),
  memory: z.custom<MemoryBase>().describe('Conversation history and context storage'),
  templateFormat: z.enum(['f-string', 'jinja2']).default('jinja2').describe('Template format'),
});

export type AgentBaseConfig = z.infer<typeof AgentBaseConfigSchema>;

/**
 * Abstract base class for agents that interact with language models and manage tools for task execution.
 * 
 * This class provides the foundational structure for creating intelligent agents that can:
 * - Communicate with language models
 * - Execute tools and functions
 * - Manage conversation memory
 * - Handle prompt templates and formatting
 * - Process user inputs and generate responses
 */
export abstract class AgentBase {
  /** Default system prompt template */
  public static readonly DEFAULT_SYSTEM_PROMPT = `
# Today's date is: {date}

## Name
Your name is {name}.

## Role
Your role is {role}.

## Goal
{goal}.

## Instructions
{instructions}.
`.trim();

  // Core configuration
  public readonly name: string;
  public readonly role?: string;
  public readonly goal?: string;
  public readonly instructions?: string[];
  public systemPrompt?: string;
  public llm?: LLMClientBase;
  public promptTemplate?: PromptTemplateBase;
  
  // Tool management
  public readonly tools: (AgentTool | Function)[];
  public toolChoice?: ToolChoice;
  public readonly toolHistory: ToolExecutionRecord[];
  public readonly maxIterations: number;
  
  // Memory and formatting
  public readonly memory: MemoryBase;
  public readonly templateFormat: TemplateFormat;
  
  // Private properties
  private readonly _toolExecutor: AgentToolExecutor;
  private readonly _textFormatter: ColorTextFormatter;
  private _shutdownEvent?: AbortController;

  constructor(config: AgentBaseConfig) {
    const validated = AgentBaseConfigSchema.parse(config) as any;
    
    // Set name from role if name not provided
    this.name = validated.name || validated.role || 'Dapr Agent';
    this.role = validated.role;
    this.goal = validated.goal;
    this.instructions = validated.instructions;
    this.systemPrompt = validated.systemPrompt;
    this.llm = validated.llm;
    this.promptTemplate = validated.promptTemplate;
    
    this.tools = validated.tools;
    this.toolChoice = validated.toolChoice;
    this.toolHistory = validated.toolHistory;
    this.maxIterations = validated.maxIterations;
    
    this.memory = validated.memory;
    this.templateFormat = validated.templateFormat;
    
    // Initialize private properties
    this._toolExecutor = new AgentToolExecutor({ tools: this.tools });
    this._textFormatter = new ColorTextFormatter();
    
    // Post-initialization setup
    this._postInit();
  }

  /**
   * Post-initialization setup
   */
  private _postInit(): void {
    // Set tool_choice to 'auto' if tools are provided, otherwise undefined
    if (this.toolChoice === undefined) {
      this.toolChoice = this.tools.length > 0 ? 'auto' : 'none';
    }

    // Initialize LLM if not provided
    if (!this.llm) {
      this.llm = this._getDefaultLLM();
    }

    // Initialize prompt template
    this.promptTemplate = this._initializePromptTemplate();
    
    // Ensure LLM client and agent both reference the same template
    if (this.llm && this.promptTemplate) {
      this.llm.promptTemplate = this.promptTemplate;
    }

    this._validatePromptTemplate();
    this.prefillAgentAttributes();

    // Set up graceful shutdown
    this._setupSignalHandlers();
  }

  /**
   * Get default LLM client
   */
  private _getDefaultLLM(): LLMClientBase {
    // This would be implemented based on the specific LLM clients available
    throw new Error('Default LLM not implemented - must provide LLM client');
  }

  /**
   * Initialize prompt template using centralized logic
   */
  private _initializePromptTemplate(): PromptTemplateBase {
    // 1) User provided one?
    if (this.promptTemplate) {
      console.debug('🛠️ Using provided agent.promptTemplate');
      return this.promptTemplate;
    }

    // 2) LLM client has one?
    if (this.llm?.promptTemplate) {
      console.debug('🔄 Syncing from llm.promptTemplate');
      return this.llm.promptTemplate;
    }

    // 3) Build from system_prompt or attributes
    if (!this.systemPrompt) {
      console.debug('⚙️ Constructing systemPrompt from attributes');
      this.systemPrompt = this.constructSystemPrompt();
    }

    console.debug('⚙️ Building ChatPromptTemplate from systemPrompt');
    return this.constructPromptTemplate();
  }

  /**
   * Validate prompt template and warn about unused attributes
   */
  private _validatePromptTemplate(): void {
    if (!this.promptTemplate) {
      return;
    }

    // Always make chat_history available
    const varsSet = new Set([...this.promptTemplate.inputVariables, 'chat_history']);

    // Inject any attributes the template declares
    const { validAttrs, unusedAttrs } = this._collectTemplateAttrs();
    for (const attr of Object.keys(validAttrs)) {
      varsSet.add(attr);
    }
    
    this.promptTemplate.inputVariables = Array.from(varsSet);

    if (unusedAttrs.length > 0) {
      console.warn(
        `Agent attributes set but not referenced in promptTemplate: ${unusedAttrs.join(', ')}. ` +
        'Consider adding them to inputVariables.'
      );
    }
  }

  /**
   * Collect template attributes for pre-filling and validation
   */
  private _collectTemplateAttrs(): { validAttrs: Record<string, string>; unusedAttrs: string[] } {
    const attrs = ['name', 'role', 'goal', 'instructions'];
    const validAttrs: Record<string, string> = {};
    const unusedAttrs: string[] = [];
    
    if (!this.promptTemplate?.inputVariables) {
      return { validAttrs, unusedAttrs: attrs };
    }

    const templateVars = new Set(this.promptTemplate.inputVariables);

    for (const attr of attrs) {
      const val = (this as any)[attr];
      if (val === undefined || val === null) {
        continue;
      }
      
      if (templateVars.has(attr)) {
        if (attr === 'instructions' && Array.isArray(val)) {
          validAttrs[attr] = val.join('\n');
        } else {
          validAttrs[attr] = String(val);
        }
      } else {
        unusedAttrs.push(attr);
      }
    }

    return { validAttrs, unusedAttrs };
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  private _setupSignalHandlers(): void {
    this._shutdownEvent = new AbortController();
    
    // Handle process termination signals
    const handleShutdown = () => {
      console.log('\nReceived shutdown signal. Shutting down gracefully...');
      this._shutdownEvent?.abort();
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
  }

  /**
   * Get the tool executor (read-only access)
   */
  public get toolExecutor(): AgentToolExecutor {
    return this._toolExecutor;
  }

  /**
   * Get the text formatter
   */
  public get textFormatter(): ColorTextFormatter {
    return this._textFormatter;
  }

  /**
   * Get chat history from memory
   */
  public getChatHistory(task?: string): Record<string, any>[] {
    // This would need to be implemented based on memory type
    // For now, return basic implementation
    return this.memory.getMessages();
  }

  /**
   * Get the full chat history as a list of dictionaries
   */
  public get chatHistory(): Record<string, any>[] {
    return this.getChatHistory();
  }

  /**
   * Abstract method that must be implemented by subclasses
   * Executes the agent's main logic based on provided inputs
   */
  public abstract run(inputData: string | Record<string, any>): Promise<any>;

  /**
   * Pre-fill prompt template with agent attributes
   */
  public prefillAgentAttributes(): void {
    if (!this.promptTemplate) {
      return;
    }

    const { validAttrs, unusedAttrs } = this._collectTemplateAttrs();

    if (unusedAttrs.length > 0) {
      console.warn(
        `Agent attributes set but not used in promptTemplate: ${unusedAttrs.join(', ')}. ` +
        'Consider adding them to inputVariables.'
      );
    }

    if (Object.keys(validAttrs).length > 0) {
      this.promptTemplate = this.promptTemplate.preFillVariables(validAttrs);
      console.debug(`Pre-filled template with: ${Object.keys(validAttrs).join(', ')}`);
    } else {
      console.debug('No promptTemplate variables needed pre-filling.');
    }
  }

  /**
   * Construct system prompt from agent attributes
   */
  public constructSystemPrompt(): string {
    // Fill in the current date, leave other placeholders as variables
    const instructionsPlaceholder = this.instructions ? '{instructions}' : '';
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let filled = AgentBase.DEFAULT_SYSTEM_PROMPT
      .replace('{date}', currentDate)
      .replace('{name}', '{name}')
      .replace('{role}', '{role}')
      .replace('{goal}', '{goal}')
      .replace('{instructions}', instructionsPlaceholder);

    // Convert to Jinja2 format if needed
    if (this.templateFormat === 'jinja2') {
      filled = filled.replace(/\{(\w+)\}/g, '{{$1}}');
    }

    return filled;
  }

  /**
   * Construct a ChatPromptTemplate that includes system prompt and chat history placeholder
   */
  public constructPromptTemplate(): PromptTemplateBase {
    // This would need to be implemented based on the specific ChatPromptTemplate class
    throw new Error('constructPromptTemplate must be implemented by concrete prompt template classes');
  }

  /**
   * Construct messages based on input type
   */
  public constructMessages(inputData: string | Record<string, any>): Record<string, any>[] {
    if (!this.promptTemplate) {
      throw new Error('Prompt template must be initialized before constructing messages.');
    }

    const chatHistory = this.getChatHistory();

    if (typeof inputData === 'string') {
      const formattedMessages = this.promptTemplate.formatPrompt({ chat_history: chatHistory });
      const userMessage = { role: 'user', content: inputData };
      
      if (Array.isArray(formattedMessages)) {
        return [...formattedMessages, userMessage];
      } else {
        return [
          { role: 'system', content: formattedMessages },
          userMessage
        ];
      }
    } else if (typeof inputData === 'object' && inputData !== null) {
      const inputVars = { ...inputData };
      if (!inputVars.chat_history) {
        inputVars.chat_history = chatHistory;
      }
      
      const formattedMessages = this.promptTemplate.formatPrompt(inputVars);
      
      if (Array.isArray(formattedMessages)) {
        return formattedMessages;
      } else {
        return [{ role: 'system', content: formattedMessages }];
      }
    } else {
      throw new Error('Input data must be either a string or object.');
    }
  }

  /**
   * Reset conversation memory
   */
  public resetMemory(): void {
    this.memory.resetMemory();
  }

  /**
   * Get the last message from chat history
   */
  public getLastMessage(): Record<string, any> | null {
    const chatHistory = this.getChatHistory();
    if (chatHistory.length > 0) {
      const lastMsg = chatHistory[chatHistory.length - 1];
      return lastMsg || null;
    }
    return null;
  }

  /**
   * Get the last user message from a list of messages
   */
  public getLastUserMessage(messages: Record<string, any>[]): Record<string, any> | null {
    // Iterate in reverse to find the most recent 'user' role message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message && message.role === 'user') {
        return {
          ...message,
          content: message.content?.trim() || ''
        };
      }
    }
    return null;
  }

  /**
   * Return the last message only if it is a user message
   */
  public getLastMessageIfUser(messages: Record<string, any>[]): Record<string, any> | null {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        return {
          ...lastMsg,
          content: lastMsg.content?.trim() || ''
        };
      }
    }
    return null;
  }

  /**
   * Convert tools to LLM-compatible format
   */
  public getLLMTools(): (AgentTool | Record<string, any>)[] {
    const llmTools: (AgentTool | Record<string, any>)[] = [];
    
    for (const tool of this.tools) {
      if (tool instanceof AgentTool) {
        llmTools.push(tool);
      } else if (typeof tool === 'function') {
        try {
          const agentTool = AgentTool.fromFunc(tool);
          llmTools.push(agentTool);
        } catch (error) {
          console.warn(`Failed to convert callable to AgentTool: ${error}`);
          continue;
        }
      }
    }
    
    return llmTools;
  }

  /**
   * Pre-fill prompt template with specified variables
   */
  public preFillPromptTemplate(variables: Record<string, string | (() => string)>): void {
    if (!this.promptTemplate) {
      throw new Error('Prompt template must be initialized before pre-filling variables.');
    }

    this.promptTemplate = this.promptTemplate.preFillVariables(variables);
    console.debug(`Pre-filled prompt template with variables: ${Object.keys(variables).join(', ')}`);
  }
}