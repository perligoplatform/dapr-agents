import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DurableAgent } from '../src/agents/index.js';
import { DaprWorkflowStatus } from '../src/agents/durableAgentState.js';

// Mock DaprClient
vi.mock('@dapr/dapr', () => ({
  DaprClient: vi.fn().mockImplementation(() => ({
    state: {
      get: vi.fn(),
      save: vi.fn(),
    },
    pubsub: {
      publish: vi.fn(),
    },
  })),
}));

describe('DurableAgent Integration', () => {
  let agent: DurableAgent;
  let mockDaprClient: any;

  beforeEach(() => {
    // Create agent with minimal config
    agent = new DurableAgent({
      name: 'TestDurableAgent',
      role: 'Assistant',
      goal: 'Test durable agent functionality',
    });
    
    mockDaprClient = agent.daprClient;
  });

  afterEach(async () => {
    // Cleanup
    await agent.shutdown();
  });

  describe('Initialization', () => {
    it('should create a durable agent with default configuration', () => {
      expect(agent).toBeDefined();
      expect(agent.name).toBe('TestDurableAgent');
      expect(agent.role).toBe('Assistant');
      expect(agent.goal).toBe('Test durable agent functionality');
      expect(agent.agentTopicName).toBe('TestDurableAgent');
      expect(agent.stateStoreName).toBe('statestore');
      expect(agent.pubSubName).toBe('messagebus');
    });

    it('should create a durable agent with custom configuration', () => {
      const customAgent = new DurableAgent({
        name: 'CustomAgent',
        role: 'DataAnalyst',
        goal: 'Analyze data',
        agentTopicName: 'custom-topic',
        stateStoreName: 'custom-store',
        pubSubName: 'custom-pubsub',
        broadcastTopicName: 'broadcast-topic',
        daprHost: '192.168.1.100',
        daprPort: '4500',
      });

      expect(customAgent.name).toBe('CustomAgent');
      expect(customAgent.agentTopicName).toBe('custom-topic');
      expect(customAgent.stateStoreName).toBe('custom-store');
      expect(customAgent.pubSubName).toBe('custom-pubsub');
      expect(customAgent.broadcastTopicName).toBe('broadcast-topic');
      
      // Cleanup
      customAgent.shutdown();
    });

    it('should have agent metadata properly set', () => {
      expect(agent.agentMetadata).toBeDefined();
      expect(agent.agentMetadata?.name).toBe('TestDurableAgent');
      expect(agent.agentMetadata?.role).toBe('Assistant');
      expect(agent.agentMetadata?.goal).toBe('Test durable agent functionality');
      expect(agent.agentMetadata?.topicName).toBe('TestDurableAgent');
      expect(agent.agentMetadata?.pubSubName).toBe('messagebus');
      expect(agent.agentMetadata?.orchestrator).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should load state from Dapr state store', async () => {
      const mockState = {
        instances: {
          'test-instance': {
            input: 'test input',
            workflow_name: 'AgenticWorkflow',
            status: DaprWorkflowStatus.RUNNING,
            messages: [],
            tool_history: [],
          }
        },
        chat_history: [],
      };

      mockDaprClient.state.get.mockResolvedValue(mockState);

      await agent.loadState();

      expect(mockDaprClient.state.get).toHaveBeenCalledWith(
        'statestore',
        'agent_state_TestDurableAgent'
      );
      expect(agent.getWorkflowInstances()).toEqual(mockState.instances);
    });

    it('should handle missing state gracefully', async () => {
      mockDaprClient.state.get.mockResolvedValue(null);

      await agent.loadState();

      expect(mockDaprClient.state.get).toHaveBeenCalled();
      expect(agent.getWorkflowInstances()).toEqual({});
    });

    it('should save state to Dapr state store', async () => {
      mockDaprClient.state.save.mockResolvedValue(undefined);

      await agent.saveState();

      expect(mockDaprClient.state.save).toHaveBeenCalledWith(
        'statestore',
        expect.arrayContaining([
          expect.objectContaining({
            key: 'agent_state_TestDurableAgent',
            value: expect.any(Object),
          })
        ])
      );
    });

    it('should reset workflow state', async () => {
      // First set some state
      const instances = agent.getWorkflowInstances();
      instances['test-id'] = {
        input: 'test',
        messages: [],
        tool_history: [],
        start_time: new Date(),
        status: DaprWorkflowStatus.RUNNING,
      } as any;

      expect(Object.keys(instances)).toHaveLength(1);

      // Reset state
      await agent.resetWorkflowState();

      expect(Object.keys(agent.getWorkflowInstances())).toHaveLength(0);
      expect(mockDaprClient.state.save).toHaveBeenCalled();
    });
  });

  describe('Workflow Execution', () => {
    it('should run workflow with string input', async () => {
      mockDaprClient.state.get.mockResolvedValue(null);
      mockDaprClient.state.save.mockResolvedValue(undefined);

      const result = await agent.run('Hello, test agent');

      expect(result).toBeDefined();
      expect(result.role).toBe('assistant');
      expect(result.content).toContain('Hello, test agent');
      expect(result.workflow_instance_id).toBeDefined();
      expect(agent.workflowInstanceId).toBeDefined();
    });

    it('should run workflow with object input', async () => {
      mockDaprClient.state.get.mockResolvedValue(null);
      mockDaprClient.state.save.mockResolvedValue(undefined);

      const result = await agent.run({ task: 'Process data', type: 'analysis' });

      expect(result).toBeDefined();
      expect(result.role).toBe('assistant');
      expect(result.content).toContain('Process data');
      expect(result.workflow_instance_id).toBeDefined();
    });

    it('should handle workflow execution without LLM', async () => {
      const agentWithoutLLM = new DurableAgent({
        name: 'NoLLMAgent',
        // No LLM configured
      });

      mockDaprClient.state.get.mockResolvedValue(null);

      await expect(agentWithoutLLM.run('test')).rejects.toThrow(
        'No LLM client configured for this durable agent'
      );

      await agentWithoutLLM.shutdown();
    });

    it('should create workflow instance with proper structure', async () => {
      mockDaprClient.state.get.mockResolvedValue(null);
      mockDaprClient.state.save.mockResolvedValue(undefined);

      await agent.run('Test workflow');

      const instances = agent.getWorkflowInstances();
      const instanceIds = Object.keys(instances);
      
      expect(instanceIds).toHaveLength(1);
      
      const instance = instances[instanceIds[0]];
      expect(instance.input).toBe('Test workflow');
      expect(instance.workflow_name).toBe('AgenticWorkflow');
      expect(instance.status).toBe(DaprWorkflowStatus.COMPLETED);
      expect(instance.messages).toHaveLength(2); // User + assistant messages
      expect(instance.start_time).toBeDefined();
      expect(instance.end_time).toBeDefined();
      expect(instance.output).toBeDefined();
    });
  });

  describe('Messaging', () => {
    it('should broadcast message when broadcast topic is configured', async () => {
      const broadcastAgent = new DurableAgent({
        name: 'BroadcastAgent',
        broadcastTopicName: 'broadcast-topic',
      });

      const mockDaprClientBroadcast = broadcastAgent.daprClient;
      vi.mocked(mockDaprClientBroadcast.pubsub.publish).mockResolvedValue(undefined as any);

      const message = {
        role: 'assistant' as const,
        content: 'Broadcast message',
        name: 'BroadcastAgent',
        timestamp: new Date(),
      };

      await broadcastAgent.broadcastMessage(message);

      expect(mockDaprClientBroadcast.pubsub.publish).toHaveBeenCalledWith(
        'messagebus',
        'broadcast-topic',
        message
      );

      await broadcastAgent.shutdown();
    });

    it('should skip broadcast when no topic configured', async () => {
      // Agent without broadcast topic
      const message = {
        role: 'assistant' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      // Should not throw, but should warn and skip
      await agent.broadcastMessage(message);

      expect(mockDaprClient.pubsub.publish).not.toHaveBeenCalled();
    });

    it('should send message to specific agent', async () => {
      vi.mocked(mockDaprClient.pubsub.publish).mockResolvedValue(undefined as any);

      const message = {
        role: 'user' as const,
        content: 'Task for you',
        name: 'TestDurableAgent',
        timestamp: new Date(),
        workflow_instance_id: 'test-instance-id',
      };

      await agent.sendMessageToAgent('TargetAgent', message);

      expect(mockDaprClient.pubsub.publish).toHaveBeenCalledWith(
        'messagebus',
        'TargetAgent',
        message
      );
    });
  });

  describe('Workflow Instance Management', () => {
    it('should get current workflow instance', async () => {
      mockDaprClient.state.get.mockResolvedValue(null);
      mockDaprClient.state.save.mockResolvedValue(undefined);

      // Initially no current instance
      expect(agent.getCurrentWorkflowInstance()).toBeUndefined();

      // Run workflow to create instance
      await agent.run('Test');

      // Should now have current instance
      const currentInstance = agent.getCurrentWorkflowInstance();
      expect(currentInstance).toBeDefined();
      expect(currentInstance?.input).toBe('Test');
    });

    it('should load current workflow instance from state', async () => {
      const mockState = {
        instances: {
          'running-instance': {
            input: 'test input',
            workflow_name: 'AgenticWorkflow',
            status: DaprWorkflowStatus.RUNNING,
            messages: [],
            tool_history: [],
          },
          'completed-instance': {
            input: 'completed input',
            workflow_name: 'AgenticWorkflow',
            status: DaprWorkflowStatus.COMPLETED,
            messages: [],
            tool_history: [],
          }
        },
        chat_history: [],
      };

      mockDaprClient.state.get.mockResolvedValue(mockState);

      await agent.loadState();

      // Should load the running instance as current
      expect(agent.workflowInstanceId).toBe('running-instance');
    });
  });

  describe('Error Handling', () => {
    it('should handle state loading errors gracefully', async () => {
      vi.mocked(mockDaprClient.state.get).mockRejectedValue(new Error('State store unavailable'));

      // Should not throw, but continue with initial state
      await agent.loadState();

      expect(agent.getWorkflowInstances()).toEqual({});
    });

    it('should handle state saving errors', async () => {
      vi.mocked(mockDaprClient.state.save).mockRejectedValue(new Error('State store write error'));

      await expect(agent.saveState()).rejects.toThrow('State store write error');
    });

    it('should handle workflow execution errors', async () => {
      vi.mocked(mockDaprClient.state.get).mockResolvedValue(null);
      vi.mocked(mockDaprClient.state.save).mockRejectedValue(new Error('State save failed'));

      await expect(agent.run('Test')).rejects.toThrow('State save failed');
    });

    it('should handle messaging errors', async () => {
      const broadcastAgent = new DurableAgent({
        name: 'ErrorAgent',
        broadcastTopicName: 'error-topic',
      });

      const mockBroadcastClient = broadcastAgent.daprClient;
      vi.mocked(mockBroadcastClient.pubsub.publish).mockRejectedValue(new Error('PubSub error'));

      const message = {
        role: 'assistant' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      await expect(broadcastAgent.broadcastMessage(message)).rejects.toThrow('PubSub error');

      await broadcastAgent.shutdown();
    });
  });

  describe('Cleanup', () => {
    it('should shutdown gracefully', async () => {
      vi.mocked(mockDaprClient.state.save).mockResolvedValue(undefined);

      // Should not throw
      await agent.shutdown();

      // Should attempt to save final state
      expect(mockDaprClient.state.save).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      vi.mocked(mockDaprClient.state.save).mockRejectedValue(new Error('Save failed during shutdown'));

      // Should not throw even if state save fails
      await agent.shutdown();
    });
  });
});