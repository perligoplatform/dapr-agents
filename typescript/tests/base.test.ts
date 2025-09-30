import { describe, it, expect } from 'vitest';
import {
  AgentBase,
  AgentBaseConfigSchema,
  CodeExecutorBase,
  LLMClientBase,
  MemoryBase,
  PromptTemplateBase,
  VectorStoreBase,
  GraphStoreBase,
  SUPPORTED_LANGUAGES
} from '../src/base/index.js';
import { BaseMessage, createUserMessage } from '../src/types/message.js';
import { ExecutionRequest, ExecutionResult, CodeSnippet } from '../src/types/executor.js';

// Mock implementations for testing
class MockLLMClient extends LLMClientBase {
  public readonly provider = 'mock';
  public readonly api = 'mock-api';
  public readonly config = {};
  public readonly client = {};

  public getClient() {
    return this.client;
  }

  public getConfig() {
    return this.config;
  }
}

class MockMemory extends MemoryBase {
  private messages: Record<string, any>[] = [];

  public addMessage(message: BaseMessage): void {
    this.messages.push(message);
  }

  public addMessages(messages: BaseMessage[]): void {
    this.messages.push(...messages);
  }

  public addInteraction(userMessage: BaseMessage, assistantMessage: BaseMessage): void {
    this.messages.push(userMessage, assistantMessage);
  }

  public getMessages(): Record<string, any>[] {
    return this.messages;
  }

  public resetMemory(): void {
    this.messages = [];
  }
}

class MockPromptTemplate extends PromptTemplateBase {
  public inputVariables: string[] = ['test'];

  public formatPrompt(variables: Record<string, any>): string {
    return 'formatted prompt';
  }

  public preFillVariables(variables: Record<string, string | (() => string)>): PromptTemplateBase {
    return this;
  }
}

class MockAgent extends AgentBase {
  public async run(inputData: string | Record<string, any>): Promise<any> {
    return 'mock response';
  }

  public constructPromptTemplate(): PromptTemplateBase {
    return new MockPromptTemplate();
  }
}

class MockCodeExecutor extends CodeExecutorBase {
  public async execute(request: ExecutionRequest): Promise<ExecutionResult[]> {
    return [];
  }
}

class MockVectorStore extends VectorStoreBase {
  public readonly client = {};
  public readonly embeddingFunction = undefined;

  public async add(
    documents: Iterable<string>,
    embeddings?: number[][] | null,
    metadatas?: Record<string, any>[] | null
  ): Promise<number[]> {
    return [1, 2, 3];
  }

  public async delete(ids: number[]): Promise<boolean | null> {
    return true;
  }

  public async get(ids?: string[]): Promise<Record<string, any>[]> {
    return [];
  }

  public async reset(): Promise<void> {
    // Reset implementation
  }

  public async searchSimilar(
    queryTexts?: string | string[] | null,
    k?: number
  ): Promise<Record<string, any>[]> {
    return [];
  }
}

class MockGraphStore extends GraphStoreBase {
  public readonly client = {};

  public async addNode(label: string, properties: Record<string, any>): Promise<void> {
    // Add node implementation
  }

  public async addRelationship(
    startNodeProps: Record<string, any>,
    endNodeProps: Record<string, any>,
    relationshipType: string,
    relationshipProps?: Record<string, any>
  ): Promise<void> {
    // Add relationship implementation
  }

  public async query(query: string, params?: Record<string, any>): Promise<Record<string, any>[]> {
    return [];
  }

  public async reset(): Promise<void> {
    // Reset implementation
  }
}

describe('Base Classes', () => {
  describe('AgentBase', () => {
    it('should create an agent with default configuration', () => {
      const memory = new MockMemory();
      const llm = new MockLLMClient();
      const agent = new MockAgent({
        name: 'Test Agent',
        memory,
        llm
      });

      expect(agent.name).toBe('Test Agent');
      expect(agent.role).toBe('Assistant');
      expect(agent.goal).toBe('Help humans');
      expect(agent.maxIterations).toBe(10);
      expect(agent.templateFormat).toBe('jinja2');
    });

    it('should validate configuration schema', () => {
      const memory = new MockMemory();
      const config = {
        name: 'Test Agent',
        role: 'Helper',
        goal: 'Assist users',
        memory
      };

      const result = AgentBaseConfigSchema.parse(config);
      expect(result.name).toBe('Test Agent');
      expect(result.role).toBe('Helper');
      expect(result.goal).toBe('Assist users');
    });

    it('should set name from role if name not provided', () => {
      const memory = new MockMemory();
      const llm = new MockLLMClient();
      const agent = new MockAgent({
        role: 'Custom Role',
        memory,
        llm
        // Note: not providing name, so it should default to role
      });

      expect(agent.name).toBe('Custom Role');
    });

    it('should construct system prompt correctly', () => {
      const memory = new MockMemory();
      const llm = new MockLLMClient();
      const agent = new MockAgent({
        name: 'Test Agent',
        role: 'Helper',
        goal: 'Test goal',
        memory,
        llm
      });

      const systemPrompt = agent.constructSystemPrompt();
      expect(systemPrompt).toContain('{name}');
      expect(systemPrompt).toContain('{role}');
      expect(systemPrompt).toContain('{goal}');
    });

    it('should handle tool choice correctly', () => {
      const memory = new MockMemory();
      const llm = new MockLLMClient();
      const agent = new MockAgent({
        name: 'Test Agent',
        tools: [() => 'tool'],
        memory,
        llm
      });

      expect(agent.toolChoice).toBe('auto');
    });

    it('should reset memory', () => {
      const memory = new MockMemory();
      const llm = new MockLLMClient();
      const agent = new MockAgent({
        name: 'Test Agent',
        memory,
        llm
      });

      memory.addMessage(createUserMessage('test'));
      expect(memory.getMessages()).toHaveLength(1);

      agent.resetMemory();
      expect(memory.getMessages()).toHaveLength(0);
    });
  });

  describe('CodeExecutorBase', () => {
    it('should validate supported languages', () => {
      const executor = new MockCodeExecutor();
      
      const validSnippets: CodeSnippet[] = [
        { language: 'python', code: 'print("hello")', timeout: 30 },
        { language: 'bash', code: 'echo "hello"', timeout: 30 }
      ];

      expect(() => executor.validateSnippets(validSnippets)).not.toThrow();
    });

    it('should reject unsupported languages', () => {
      const executor = new MockCodeExecutor();
      
      const invalidSnippets: CodeSnippet[] = [
        { language: 'java', code: 'System.out.println("hello");', timeout: 30 }
      ];

      expect(() => executor.validateSnippets(invalidSnippets)).toThrow('Unsupported language: java');
    });

    it('should check if language is supported', () => {
      const executor = new MockCodeExecutor();
      
      expect(executor.isLanguageSupported('python')).toBe(true);
      expect(executor.isLanguageSupported('javascript')).toBe(false);
    });

    it('should return supported languages', () => {
      const executor = new MockCodeExecutor();
      const supported = executor.getSupportedLanguages();
      
      expect(supported).toContain('python');
      expect(supported).toContain('bash');
      expect(supported).toContain('sh');
    });
  });

  describe('LLMClientBase', () => {
    it('should create LLM client with abstract properties', () => {
      const client = new MockLLMClient();
      
      expect(client.provider).toBe('mock');
      expect(client.api).toBe('mock-api');
      expect(client.config).toEqual({});
      expect(client.client).toEqual({});
    });

    it('should refresh client', () => {
      const client = new MockLLMClient();
      
      expect(() => client.refreshClient()).not.toThrow();
    });

    it('should handle prompt template', () => {
      const client = new MockLLMClient();
      const template = new MockPromptTemplate();
      
      client.promptTemplate = template;
      expect(client.promptTemplate).toBe(template);
    });
  });

  describe('MemoryBase', () => {
    it('should add and retrieve messages', () => {
      const memory = new MockMemory();
      const message = createUserMessage('test message');
      
      memory.addMessage(message);
      const messages = memory.getMessages();
      
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should add multiple messages', () => {
      const memory = new MockMemory();
      const messages = [
        createUserMessage('message 1'),
        createUserMessage('message 2')
      ];
      
      memory.addMessages(messages);
      const stored = memory.getMessages();
      
      expect(stored).toHaveLength(2);
    });

    it('should add interactions', () => {
      const memory = new MockMemory();
      const userMsg = createUserMessage('user message');
      const assistantMsg = createUserMessage('assistant message'); // Using user message for simplicity
      
      memory.addInteraction(userMsg, assistantMsg);
      const messages = memory.getMessages();
      
      expect(messages).toHaveLength(2);
    });

    it('should reset memory', () => {
      const memory = new MockMemory();
      memory.addMessage(createUserMessage('test'));
      
      expect(memory.getMessages()).toHaveLength(1);
      
      memory.resetMemory();
      expect(memory.getMessages()).toHaveLength(0);
    });
  });

  describe('VectorStoreBase', () => {
    it('should add documents and return IDs', async () => {
      const store = new MockVectorStore();
      const documents = ['doc1', 'doc2', 'doc3'];
      
      const ids = await store.add(documents);
      expect(ids).toEqual([1, 2, 3]);
    });

    it('should delete documents', async () => {
      const store = new MockVectorStore();
      
      const result = await store.delete([1, 2, 3]);
      expect(result).toBe(true);
    });

    it('should search similar documents', async () => {
      const store = new MockVectorStore();
      
      const results = await store.searchSimilar('query text', 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should reset store', async () => {
      const store = new MockVectorStore();
      
      await expect(store.reset()).resolves.toBeUndefined();
    });
  });

  describe('GraphStoreBase', () => {
    it('should add nodes', async () => {
      const store = new MockGraphStore();
      
      await expect(store.addNode('Person', { name: 'John' })).resolves.toBeUndefined();
    });

    it('should add relationships', async () => {
      const store = new MockGraphStore();
      
      await expect(store.addRelationship(
        { name: 'John' },
        { name: 'Jane' },
        'KNOWS'
      )).resolves.toBeUndefined();
    });

    it('should execute queries', async () => {
      const store = new MockGraphStore();
      
      const results = await store.query('MATCH (n) RETURN n');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should reset store', async () => {
      const store = new MockGraphStore();
      
      await expect(store.reset()).resolves.toBeUndefined();
    });
  });

  describe('Constants', () => {
    it('should export supported languages', () => {
      expect(SUPPORTED_LANGUAGES.has('python' as any)).toBe(true);
      expect(SUPPORTED_LANGUAGES.has('bash' as any)).toBe(true);
      expect(SUPPORTED_LANGUAGES.has('sh' as any)).toBe(true);
      expect(SUPPORTED_LANGUAGES.has('java' as any)).toBe(false);
    });
  });
});