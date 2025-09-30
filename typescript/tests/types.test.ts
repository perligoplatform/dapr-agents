import { describe, it, expect } from 'vitest';
import {
  AgentStatus,
  AgentTaskStatus,
  createAgentTaskEntry,
  parseAgentTaskEntry,
} from '../src/types/agent';
import {
  createSystemMessage,
  createUserMessage,
  createAssistantMessage,
  createToolMessage,
  createFunctionCall,
  getFunctionCallArguments,
  hasToolCalls,
} from '../src/types/message';
import {
  createOAIFunctionDefinition,
  createOAIToolDefinition,
  createToolExecutionRecord,
} from '../src/types/tools';
import {
  createExecutionResult,
  createCodeSnippet,
  createExecutionRequest,
} from '../src/types/executor';
import {
  DaprWorkflowStatus,
  parseWorkflowStatus,
  isWorkflowActive,
  isWorkflowComplete,
} from '../src/types/workflow';
import {
  createNode,
  createRelationship,
  hasEmbedding,
  getEmbeddingDimension,
} from '../src/types/graph';
import {
  createDocument,
  hasMetadata,
  getMetadata,
  setMetadata,
} from '../src/types/document';
import {
  AgentError,
  ToolError,
  NotSupportedError,
  isErrorOfType,
  wrapError,
} from '../src/types/exceptions';
import {
  createOAIJSONSchema,
  createOAIResponseFormatSchema,
  isValidSchemaName,
} from '../src/types/schemas';
import {
  createOpenAIConfig,
  createNVIDIAConfig,
  OpenAIChatCompletionParamsSchema,
  AudioSpeechRequestSchema,
} from '../src/types/llm';

describe('Agent Types', () => {
  it('should create an agent task entry with defaults', () => {
    const task = createAgentTaskEntry('Test task');
    
    expect(task.input).toBe('Test task');
    expect(task.status).toBe(AgentTaskStatus.PENDING);
    expect(task.taskId).toBeDefined();
    expect(task.timestamp).toBeInstanceOf(Date);
    expect(task.output).toBeUndefined();
  });

  it('should parse agent task entry from object', () => {
    const data = {
      input: 'Test task',
      status: AgentTaskStatus.COMPLETE,
      output: 'Task completed',
    };
    
    const task = parseAgentTaskEntry(data);
    expect(task.input).toBe('Test task');
    expect(task.status).toBe(AgentTaskStatus.COMPLETE);
    expect(task.output).toBe('Task completed');
  });

  it('should validate agent status enum', () => {
    expect(AgentStatus.ACTIVE).toBe('active');
    expect(AgentStatus.IDLE).toBe('idle');
    expect(AgentStatus.ERROR).toBe('error');
  });
});

describe('Message Types', () => {
  it('should create system message', () => {
    const message = createSystemMessage('System prompt');
    
    expect(message.role).toBe('system');
    expect(message.content).toBe('System prompt');
  });

  it('should create user message', () => {
    const message = createUserMessage('User input', 'TestUser');
    
    expect(message.role).toBe('user');
    expect(message.content).toBe('User input');
    expect(message.name).toBe('TestUser');
  });

  it('should create assistant message with tool calls', () => {
    const functionCall = createFunctionCall('test_function', { param: 'value' });
    const toolCall = {
      id: 'tool_123',
      type: 'function',
      function: functionCall,
    };
    
    const message = createAssistantMessage('Assistant response', {
      toolCalls: [toolCall],
    });
    
    expect(message.role).toBe('assistant');
    expect(message.content).toBe('Assistant response');
    expect(hasToolCalls(message)).toBe(true);
    expect(message.toolCalls).toHaveLength(1);
    expect(message.toolCalls?.[0]?.id).toBe('tool_123');
  });

  it('should create tool message', () => {
    const message = createToolMessage('Tool result', 'tool_123');
    
    expect(message.role).toBe('tool');
    expect(message.content).toBe('Tool result');
    expect(message.toolCallId).toBe('tool_123');
  });

  it('should handle function call arguments', () => {
    const functionCall = createFunctionCall('test_function', { 
      param1: 'value1', 
      param2: 42 
    });
    
    expect(functionCall.name).toBe('test_function');
    expect(JSON.parse(functionCall.arguments)).toEqual({
      param1: 'value1',
      param2: 42,
    });
    
    const args = getFunctionCallArguments(functionCall);
    expect(args).toEqual({ param1: 'value1', param2: 42 });
  });
});

describe('Tool Types', () => {
  it('should create OAI function definition', () => {
    const funcDef = createOAIFunctionDefinition(
      'get_weather',
      'Get weather information',
      {
        type: 'object',
        properties: {
          location: { type: 'string' },
        },
      }
    );
    
    expect(funcDef.name).toBe('get_weather');
    expect(funcDef.description).toBe('Get weather information');
    expect(funcDef.parameters).toBeDefined();
  });

  it('should create OAI tool definition', () => {
    const funcDef = createOAIFunctionDefinition(
      'get_weather',
      'Get weather information',
      { type: 'object' }
    );
    
    const toolDef = createOAIToolDefinition('function', funcDef);
    
    expect(toolDef.type).toBe('function');
    expect(toolDef.function).toBeDefined();
    expect(toolDef.function?.name).toBe('get_weather');
  });

  it('should create tool execution record', () => {
    const record = createToolExecutionRecord(
      'tool_123',
      'get_weather',
      { location: 'New York' },
      'Sunny, 75°F'
    );
    
    expect(record.toolCallId).toBe('tool_123');
    expect(record.toolName).toBe('get_weather');
    expect(record.toolArgs).toEqual({ location: 'New York' });
    expect(record.executionResult).toBe('Sunny, 75°F');
    expect(record.id).toBeDefined();
    expect(record.timestamp).toBeInstanceOf(Date);
  });
});

describe('Executor Types', () => {
  it('should create execution result', () => {
    const result = createExecutionResult('success', 'Hello World', 0);
    
    expect(result.status).toBe('success');
    expect(result.output).toBe('Hello World');
    expect(result.exitCode).toBe(0);
  });

  it('should create code snippet', () => {
    const snippet = createCodeSnippet('python', 'print("hello")', 10);
    
    expect(snippet.language).toBe('python');
    expect(snippet.code).toBe('print("hello")');
    expect(snippet.timeout).toBe(10);
  });

  it('should create execution request', () => {
    const snippet = createCodeSnippet('python', 'print("hello")');
    const request = createExecutionRequest([snippet], 30);
    
    expect(request.snippets).toHaveLength(1);
    expect(request.timeout).toBe(30);
    expect(request.snippets[0]?.language).toBe('python');
  });
});

describe('Workflow Types', () => {
  it('should validate workflow status', () => {
    const status = parseWorkflowStatus('running');
    expect(status).toBe(DaprWorkflowStatus.RUNNING);
  });

  it('should check if workflow is active', () => {
    expect(isWorkflowActive(DaprWorkflowStatus.RUNNING)).toBe(true);
    expect(isWorkflowActive(DaprWorkflowStatus.PENDING)).toBe(true);
    expect(isWorkflowActive(DaprWorkflowStatus.COMPLETED)).toBe(false);
  });

  it('should check if workflow is complete', () => {
    expect(isWorkflowComplete(DaprWorkflowStatus.COMPLETED)).toBe(true);
    expect(isWorkflowComplete(DaprWorkflowStatus.FAILED)).toBe(true);
    expect(isWorkflowComplete(DaprWorkflowStatus.RUNNING)).toBe(false);
  });
});

describe('Graph Types', () => {
  it('should create node with embedding', () => {
    const node = createNode(
      '1',
      'Person',
      { name: 'Alice', age: 30 },
      { 
        additionalLabels: ['Employee'], 
        embedding: [0.1, 0.2, 0.3] 
      }
    );
    
    expect(node.id).toBe('1');
    expect(node.label).toBe('Person');
    expect(node.properties).toEqual({ name: 'Alice', age: 30 });
    expect(hasEmbedding(node)).toBe(true);
    expect(getEmbeddingDimension(node)).toBe(3);
  });

  it('should create relationship', () => {
    const rel = createRelationship('1', '2', 'FRIEND', { since: 2020 });
    
    expect(rel.sourceNodeId).toBe('1');
    expect(rel.targetNodeId).toBe('2');
    expect(rel.type).toBe('FRIEND');
    expect(rel.properties).toEqual({ since: 2020 });
  });
});

describe('Document Types', () => {
  it('should create document with metadata', () => {
    const doc = createDocument('Hello world', { source: 'test', page: 1 });
    
    expect(doc.text).toBe('Hello world');
    expect(hasMetadata(doc)).toBe(true);
    expect(getMetadata(doc, 'source')).toBe('test');
  });

  it('should set metadata', () => {
    const doc = createDocument('Hello world');
    const updatedDoc = setMetadata(doc, 'author', 'John');
    
    expect(getMetadata(updatedDoc, 'author')).toBe('John');
  });
});

describe('Exception Types', () => {
  it('should create and identify error types', () => {
    const error = new AgentError('Test error');
    
    expect(isErrorOfType(error, AgentError)).toBe(true);
    expect(isErrorOfType(error, ToolError)).toBe(false);
  });

  it('should wrap errors', () => {
    const originalError = new Error('Original');
    const wrappedError = wrapError(ToolError, 'Tool failed', originalError);
    
    expect(wrappedError).toBeInstanceOf(ToolError);
    expect(wrappedError.message).toBe('Tool failed');
    expect(wrappedError.cause).toBe(originalError);
  });
});

describe('Schema Types', () => {
  it('should create OAI JSON schema', () => {
    const schema = createOAIJSONSchema('test_schema', {
      description: 'Test schema',
      schema: { type: 'object' },
      strict: true,
    });
    
    expect(schema.name).toBe('test_schema');
    expect(schema.description).toBe('Test schema');
    expect(schema.strict).toBe(true);
  });

  it('should validate schema name format', () => {
    expect(isValidSchemaName('valid_name')).toBe(true);
    expect(isValidSchemaName('invalid name')).toBe(false);
    expect(isValidSchemaName('a'.repeat(65))).toBe(false);
  });

  it('should create response format schema', () => {
    const jsonSchema = createOAIJSONSchema('test');
    const responseFormat = createOAIResponseFormatSchema(jsonSchema);
    
    expect(responseFormat.type).toBe('json_schema');
    expect(responseFormat.jsonSchema.name).toBe('test');
  });
});

describe('LLM Types', () => {
  it('should create OpenAI config', () => {
    const config = createOpenAIConfig('test-key', {
      baseUrl: 'https://api.openai.com',
      organization: 'test-org',
    });
    
    expect(config.apiKey).toBe('test-key');
    expect(config.baseUrl).toBe('https://api.openai.com');
    expect(config.organization).toBe('test-org');
  });

  it('should create NVIDIA config', () => {
    const config = createNVIDIAConfig('nvidia-key');
    
    expect(config.apiKey).toBe('nvidia-key');
    expect(config.baseUrl).toBe('https://integrate.api.nvidia.com/v1');
  });

  it('should validate chat completion params', () => {
    const params = OpenAIChatCompletionParamsSchema.parse({
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 100,
    });
    
    expect(params.model).toBe('gpt-4');
    expect(params.temperature).toBe(0.7);
    expect(params.maxTokens).toBe(100);
  });

  it('should validate audio speech request', () => {
    const request = AudioSpeechRequestSchema.parse({
      input: 'Hello world',
      voice: 'alloy',
      model: 'tts-1',
    });
    
    expect(request.input).toBe('Hello world');
    expect(request.voice).toBe('alloy');
    expect(request.model).toBe('tts-1');
  });
});