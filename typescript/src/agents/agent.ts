import { z } from 'zod';
import { EventEmitter } from 'events';
// import { MemoryBase, ConversationListMemory } from '../memory/index.js';
import { ChatClientBase } from '../llm/chat.js';
import { AgentTool } from '../base/tools.js';
import { PromptTemplateBase } from '../base/prompt.js';
import { 
  BaseMessage, 
  UserMessage, 
  AssistantMessage, 
  ToolMessage,
  ToolExecutionRecord,
  LLMChatResponse 
} from '../types/index.js';
// import { AgentToolExecutor } from '../tool/executor.js';
// import { getDefaultLLM } from '../llm/utils/defaults.js';

// Temporary interfaces until we implement the missing modules
interface MemoryBase {
  clear(): void;
  addMessage(message: any): void;
}

class ConversationListMemory implements MemoryBase {
  private messages: any[] = [];
  
  clear(): void {
    this.messages = [];
  }
  
  addMessage(message: any): void {
    this.messages.push(message);
  }
}

class AgentToolExecutor {
  constructor(tools: AgentTool[]) {
    // Temporary implementation
  }
}

function getDefaultLLM(): ChatClientBase | undefined {
  // Temporary implementation
  return undefined;
}

class ChatPromptTemplate extends PromptTemplateBase {
  public systemMessage: string;
  public templateFormat: string;
  public inputVariables: string[] = [];
  
  constructor(config: { systemMessage: string; templateFormat: string }) {
    super();
    this.systemMessage = config.systemMessage;
    this.templateFormat = config.templateFormat;
  }
  
  formatPrompt(variables: Record<string, any>): string {
    return this.systemMessage;
  }
  
  preFillVariables(variables: Record<string, string | (() => string)>): PromptTemplateBase {
    return this;
  }
  
  partial(values: Record<string, string>): void {
    // Temporary implementation
  }
}

/**
 * Agent configuration schema
 */
export const AgentConfigSchema = z.object({
  name: z.string().optional().describe('Agent name, defaulting to role if not provided'),
  role: z.string().optional().describe('Agent role in interaction'),
  goal: z.string().optional().describe('Agent main objective'),
  instructions: z.array(z.string()).optional().describe('Instructions guiding agent tasks'),
  systemPrompt: z.string().optional().describe('Custom system prompt overriding other fields'),
  llm: z.any().optional().describe('Language model client for generating responses'),
  promptTemplate: z.any().optional().describe('Prompt template for the agent'),
  tools: z.array(z.any()).optional().default([]).describe('Tools available for the agent'),
  toolChoice: z.string().optional().describe('Strategy for selecting tools'),
  maxIterations: z.number().optional().default(10).describe('Max iterations for conversation cycles'),
  memory: z.any().optional().describe('Memory instance for conversation history'),
  templateFormat: z.enum(['f-string', 'jinja2']).optional().default('jinja2').describe('Template format'),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Template attributes interface
 */
interface TemplateAttributes {
  valid: Record<string, string>;
  unused: string[];
}

/**
 * Base class for agents that interact with language models and manage tools for task execution.
 */
export abstract class Agent extends EventEmitter {
  public readonly name: string;
  public readonly role: string;
  public readonly goal: string;
  public readonly instructions?: string[];
  public systemPrompt?: string;
  public llm?: ChatClientBase;
  public promptTemplate?: PromptTemplateBase;
  public readonly tools: AgentTool[];
  public toolChoice?: string;
  public readonly toolHistory: ToolExecutionRecord[];
  public readonly maxIterations: number;
  public readonly memory: MemoryBase;
  public readonly templateFormat: 'f-string' | 'jinja2';

  // Private attributes
  protected _toolExecutor?: AgentToolExecutor;
  protected _shutdownEvent: Promise<void>;
  protected _shutdownResolver?: () => void;

  // Default system prompt template
  public static readonly DEFAULT_SYSTEM_PROMPT = 
    "# Today's date is: {date}\n\n" +
    "## Name\n" +
    "Your name is {name}.\n\n" +
    "## Role\n" +
    "Your role is {role}.\n\n" +
    "## Goal\n" +
    "{goal}.\n\n" +
    "## Instructions\n" +
    "{instructions}.";

  constructor(config: Partial<AgentConfig> = {}) {
    super();
    
    const validated = AgentConfigSchema.parse(config);
    
    this.name = validated.name || 'Dapr Agent';
    this.role = validated.role || 'Assistant';
    this.goal = validated.goal || 'Help humans';
    
    // Handle optional assignments properly
    if (validated.instructions !== undefined) {
      this.instructions = validated.instructions;
    }
    if (validated.systemPrompt !== undefined) {
      this.systemPrompt = validated.systemPrompt;
    }
    if (validated.llm !== undefined) {
      this.llm = validated.llm;
    }
    if (validated.promptTemplate !== undefined) {
      this.promptTemplate = validated.promptTemplate;
    }
    
    this.tools = validated.tools! as AgentTool[];
    this.toolHistory = [];
    this.maxIterations = validated.maxIterations!;
    this.memory = validated.memory || new ConversationListMemory();
    this.templateFormat = validated.templateFormat!;
    
    // Set name from role if not provided
    if (!config.name && config.role) {
      (this as any).name = config.role;
    }
    
    // Initialize shutdown mechanism
    this._shutdownEvent = new Promise<void>((resolve) => {
      this._shutdownResolver = resolve;
    });
    
    this._postInit();
  }

  /**
   * Post-initialization setup
   */
  private _postInit(): void {
    // Initialize tool executor
    this._toolExecutor = new AgentToolExecutor(this.tools);
    
    // Set tool_choice to 'auto' if tools are provided, otherwise leave undefined
    if (this.toolChoice === undefined && this.tools.length > 0) {
      (this as any).toolChoice = 'auto';
    }
    
    // Initialize LLM if not provided
    if (!this.llm) {
      const defaultLLM = getDefaultLLM();
      if (defaultLLM) {
        (this as any).llm = defaultLLM;
      }
    }
    
    // Initialize prompt template
    this.promptTemplate = this._initializePromptTemplate();
    
    // Ensure LLM client and agent both reference the same template
    if (this.llm) {
      this.llm.promptTemplate = this.promptTemplate;
    }
    
    this._validatePromptTemplate();
    this.prefillAgentAttributes();
    
    // Setup signal handlers for graceful shutdown
    this._setupSignalHandlers();
  }

  /**
   * Initialize prompt template logic
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
   * Construct system prompt from agent attributes
   */
  public constructSystemPrompt(): string {
    const today = new Date().toISOString().split('T')[0]!;
    const instructionsText = this.instructions?.join('\n') || '';
    
    // Use a guaranteed string template
    const baseTemplate = "# Today's date is: {date}\n\n" +
      "## Name\nYour name is {name}.\n\n" +
      "## Role\nYour role is {role}.\n\n" +
      "## Goal\n{goal}.\n\n" +
      "## Instructions\n{instructions}.";
    
    // Replace placeholders
    const prompt = baseTemplate
      .replace('{date}', today)
      .replace('{name}', this.name)
      .replace('{role}', this.role)
      .replace('{goal}', this.goal)
      .replace('{instructions}', instructionsText);
    
    return prompt;
  }

  /**
   * Construct prompt template from system prompt
   */
  public constructPromptTemplate(): PromptTemplateBase {
    if (!this.systemPrompt) {
      throw new Error('System prompt must be set to construct template');
    }
    
    return new ChatPromptTemplate({
      systemMessage: this.systemPrompt,
      templateFormat: this.templateFormat,
    });
  }

  /**
   * Validate prompt template
   */
  private _validatePromptTemplate(): void {
    if (!this.promptTemplate) {
      throw new Error('Prompt template is required');
    }
    
    try {
      // Test template validation if available
      if ('validate' in this.promptTemplate && typeof this.promptTemplate.validate === 'function') {
        this.promptTemplate.validate();
      }
    } catch (error) {
      console.error(`Prompt template validation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Collect template attributes for pre-filling
   */
  private _collectTemplateAttrs(): TemplateAttributes {
    const attrs = ['name', 'role', 'goal', 'instructions'];
    const valid: Record<string, string> = {};
    const unused: string[] = [];
    
    if (!this.promptTemplate || !('inputVariables' in this.promptTemplate)) {
      return { valid, unused: attrs };
    }
    
    const inputVariables = (this.promptTemplate as any).inputVariables || [];
    const originalVars = new Set(inputVariables);
    
    for (const attr of attrs) {
      const val = (this as any)[attr];
      if (val === undefined || val === null) {
        continue;
      }
      
      if (originalVars.has(attr)) {
        if (attr === 'instructions' && Array.isArray(val)) {
          valid[attr] = val.join('\n');
        } else {
          valid[attr] = String(val);
        }
      } else {
        unused.push(attr);
      }
    }
    
    return { valid, unused };
  }

  /**
   * Pre-fill agent attributes in prompt template
   */
  public prefillAgentAttributes(): void {
    if (!this.promptTemplate || !('partial' in this.promptTemplate)) {
      console.debug('No promptTemplate variables needed pre-filling.');
      return;
    }
    
    const { valid, unused } = this._collectTemplateAttrs();
    
    if (Object.keys(valid).length === 0) {
      console.debug('No promptTemplate variables needed pre-filling.');
      return;
    }
    
    // Pre-fill template with valid attributes
    try {
      (this.promptTemplate as any).partial(valid);
      console.debug(`✅ Pre-filled promptTemplate with: ${Object.keys(valid).join(', ')}`);
    } catch (error) {
      console.error(`Failed to pre-fill template: ${error}`);
    }
    
    if (unused.length > 0) {
      console.warn(`⚠️ Agent attributes not used in template: ${unused.join(', ')}`);
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private _setupSignalHandlers(): void {
    // Handle process signals for graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    
    for (const signal of signals) {
      process.on(signal, () => {
        console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
        this.shutdown();
      });
    }
  }

  /**
   * Initiate graceful shutdown
   */
  public shutdown(): void {
    console.log('🔄 Agent shutting down gracefully...');
    
    // Emit shutdown event
    this.emit('shutdown');
    
    // Resolve shutdown promise
    if (this._shutdownResolver) {
      this._shutdownResolver();
    }
  }

  /**
   * Reset memory and tool history
   */
  public resetMemory(): void {
    this.memory.clear();
    this.toolHistory.length = 0;
    console.log('🔄 Agent memory and tool history reset.');
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  public abstract run(inputData?: string | Record<string, any>): Promise<any>;

  /**
   * Get text formatter for output
   */
  public get textFormatter(): any {
    // This would be implemented with actual text formatting logic
    return {
      printMessage: (message: Record<string, any>) => {
        console.log('📝', JSON.stringify(message, null, 2));
      }
    };
  }
}