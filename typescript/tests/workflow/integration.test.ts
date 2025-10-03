import { describe, it, expect } from 'vitest';
import { WorkflowApp, WorkflowTask, AgenticWorkflow } from '../../src/workflow/index.js';

describe('Workflow Engine Integration', () => {
  it('should create a WorkflowApp instance', () => {
    const workflowApp = new WorkflowApp({
      timeout: 300,
    });
    
    expect(workflowApp).toBeDefined();
    expect(workflowApp.timeout).toBe(300);
    expect(workflowApp.tasks).toBeDefined();
    expect(workflowApp.workflows).toBeDefined();
  });

  it('should create a WorkflowTask instance', () => {
    const task = new WorkflowTask({
      description: 'Test task',
      includeChatHistory: false,
      structuredMode: 'json',
      retryCount: 3,
    });
    
    expect(task).toBeDefined();
    expect(task.description).toBe('Test task');
    expect(task.includeChatHistory).toBe(false);
    expect(task.structuredMode).toBe('json');
    expect(task.retryCount).toBe(3);
  });

  it('should create an AgenticWorkflow instance', () => {
    const agenticWorkflow = new AgenticWorkflow({
      name: 'TestWorkflow',
      messageBusName: 'test-bus',
      stateStoreName: 'test-state',
      agentsRegistryStoreName: 'test-registry',
      timeout: 300,
      stateKey: 'test-state-key',
      state: {},
      agentsRegistryKey: 'test-registry-key',
      maxIterations: 10,
      saveStateLocally: true,
    });
    
    expect(agenticWorkflow).toBeDefined();
    expect(agenticWorkflow.name).toBe('TestWorkflow');
    expect(agenticWorkflow.messageBusName).toBe('test-bus');
    expect(agenticWorkflow.stateStoreName).toBe('test-state');
    expect(agenticWorkflow.maxIterations).toBe(10);
  });

  it('should register tasks in WorkflowApp', () => {
    const workflowApp = new WorkflowApp({
      timeout: 300,
    });
    
    const testTask = async (context: any, input: any) => {
      return `Processed: ${input}`;
    };
    
    workflowApp.registerTask('test-task', testTask);
    
    expect(workflowApp.getTask('test-task')).toBeDefined();
    expect(workflowApp.tasks.size).toBe(1);
  });

  it('should register workflows in WorkflowApp', () => {
    const workflowApp = new WorkflowApp({
      timeout: 300,
    });
    
    const testWorkflow = async (context: any, input: any) => {
      return `Workflow result: ${input}`;
    };
    
    workflowApp.registerWorkflow('test-workflow', testWorkflow);
    
    expect(workflowApp.getWorkflow('test-workflow')).toBeDefined();
    expect(workflowApp.workflows.size).toBe(1);
  });

  it('should clone WorkflowTask with overrides', () => {
    const originalTask = new WorkflowTask({
      description: 'Original task',
      includeChatHistory: false,
      retryCount: 3,
    });
    
    const clonedTask = originalTask.clone({
      description: 'Cloned task',
      retryCount: 5,
    });
    
    expect(clonedTask.description).toBe('Cloned task');
    expect(clonedTask.retryCount).toBe(5);
    expect(clonedTask.includeChatHistory).toBe(false); // Should inherit
  });

  it('should get task metadata', () => {
    const task = new WorkflowTask({
      description: 'Test with metadata',
      includeChatHistory: true,
      structuredMode: 'json',
      timeout: 120,
    });
    
    const metadata = task.getMetadata();
    
    expect(metadata).toHaveProperty('hasDescription', true);
    expect(metadata).toHaveProperty('includeChatHistory', true);
    expect(metadata).toHaveProperty('structuredMode', 'json');
    expect(metadata).toHaveProperty('timeout', 120);
    expect(metadata).toHaveProperty('chatHistoryLength', 0);
  });
});