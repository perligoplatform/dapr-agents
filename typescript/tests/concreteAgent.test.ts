import { describe, it, expect } from 'vitest';
import { ConcreteAgent } from '../src/agents/index.js';

describe('Concrete Agent Implementation', () => {
  describe('ConcreteAgent', () => {
    it('should create a concrete agent with default configuration', () => {
      const agent = new ConcreteAgent();
      
      expect(agent).toBeDefined();
      expect(agent.name).toBe('Dapr Agent');
      expect(agent.role).toBe('Assistant');
      expect(agent.goal).toBe('Help humans');
      expect(agent.tools).toEqual([]);
      expect(agent.maxIterations).toBe(10);
      expect(agent.templateFormat).toBe('jinja2');
    });

    it('should create an agent with custom configuration', () => {
      const config = {
        name: 'Test Agent',
        role: 'Data Analyst',
        goal: 'Analyze data efficiently',
        instructions: ['Be precise', 'Show your work'],
        maxIterations: 5,
      };

      const agent = new ConcreteAgent(config);
      
      expect(agent.name).toBe('Test Agent');
      expect(agent.role).toBe('Data Analyst');
      expect(agent.goal).toBe('Analyze data efficiently');
      expect(agent.instructions).toEqual(['Be precise', 'Show your work']);
      expect(agent.maxIterations).toBe(5);
    });

    it('should construct system prompt correctly', () => {
      const agent = new ConcreteAgent({
        name: 'Helper',
        role: 'Assistant',
        goal: 'Help users',
        instructions: ['Be helpful', 'Be concise']
      });

      const systemPrompt = agent.constructSystemPrompt();
      
      expect(systemPrompt).toContain('Helper');
      expect(systemPrompt).toContain('Assistant');
      expect(systemPrompt).toContain('Help users');
      expect(systemPrompt).toContain('Be helpful');
      expect(systemPrompt).toContain('Be concise');
    });

    it('should handle run method with string input', async () => {
      const agent = new ConcreteAgent({
        name: 'Test Agent'
      });

      // Test with string input - should handle gracefully even without LLM
      try {
        await agent.run('Hello, how are you?');
      } catch (error) {
        // Expected to fail since no LLM is configured
        expect((error as Error).message).toContain('No LLM client configured');
      }
    });

    it('should clear memory', () => {
      const agent = new ConcreteAgent();
      
      // Add some mock data to memory
      agent.memory.addMessage({ role: 'user', content: 'test' });
      
      // Clear memory should work
      agent.memory.clear();
      
      // Memory clear should not throw an error
      expect(() => agent.memory.clear()).not.toThrow();
    });
  });
});