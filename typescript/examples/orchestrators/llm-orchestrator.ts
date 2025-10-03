/**
 * Basic LLM Orchestrator example - TypeScript equivalent of Python quickstart
 * 
 * PYTHON EQUIVALENT: quickstarts/05-multi-agent-workflows/services/workflow-llm/app.py
 * 
 * This example demonstrates how to create and start an LLM orchestrator service
 * that can coordinate multiple AI agents using intelligent task planning.
 */

import { LLMOrchestrator, type LLMOrchestratorConfig } from '../../src/workflow/orchestrators/llm/index.js';

async function main(): Promise<void> {
  try {
    // Create LLM orchestrator with required configuration
    const config: LLMOrchestratorConfig = {
      name: "LLMOrchestrator",
      messageBusName: "messagepubsub",
      stateStoreName: "workflowstatestore",
      stateKey: "workflow_state",
      agentsRegistryStoreName: "agentstatestore", 
      agentsRegistryKey: "agents_registry",
      broadcastTopicName: "beacon_channel",
      maxIterations: 3,
      // Required fields from base config
      state: {},
      saveStateLocally: false,
      timeout: 300
    };

    const workflowService = new LLMOrchestrator(config);
    
    console.log('🧠 LLM Orchestrator created successfully');
    console.log(`   - Name: ${config.name}`);
    console.log(`   - Max Iterations: ${config.maxIterations}`);
    console.log(`   - Message Bus: ${config.messageBusName}`);
    console.log(`   - State Store: ${config.stateStoreName}`);
    
    // Start the runtime (equivalent to Python's as_service().start())
    await workflowService.startRuntime();
    
    console.log('✅ LLM Orchestrator runtime started successfully');
    console.log('🎯 Ready to coordinate multi-agent workflows');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down LLM Orchestrator...');
      // Add cleanup logic here if needed
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`❌ Error starting LLM Orchestrator: ${error}`);
    process.exit(1);
  }
}

// Example of how to create different orchestrator types
export async function createLLMOrchestrator(): Promise<LLMOrchestrator> {
  const config: LLMOrchestratorConfig = {
    name: "MyLLMOrchestrator",
    messageBusName: "messagepubsub",
    stateStoreName: "workflowstatestore", 
    stateKey: "my_workflow_state",
    agentsRegistryStoreName: "agentstatestore",
    agentsRegistryKey: "my_agents_registry", 
    broadcastTopicName: "my_beacon_channel",
    maxIterations: 5,
    state: {},
    saveStateLocally: false,
    timeout: 600 // 10 minutes
  };
  
  return new LLMOrchestrator(config);
}

// Example of configuring for different environments
export function createDevelopmentConfig(): LLMOrchestratorConfig {
  return {
    name: "DevLLMOrchestrator",
    messageBusName: "dev-pubsub",
    stateStoreName: "dev-statestore",
    stateKey: "dev_workflow_state", 
    agentsRegistryStoreName: "dev-agentstatestore",
    agentsRegistryKey: "dev_agents_registry",
    broadcastTopicName: "dev_beacon_channel",
    maxIterations: 2, // Shorter for development
    state: {},
    saveStateLocally: true, // Local state for development
    timeout: 60 // 1 minute for quick feedback
  };
}

export function createProductionConfig(): LLMOrchestratorConfig {
  return {
    name: "ProdLLMOrchestrator", 
    messageBusName: "prod-pubsub",
    stateStoreName: "prod-statestore",
    stateKey: "prod_workflow_state",
    agentsRegistryStoreName: "prod-agentstatestore", 
    agentsRegistryKey: "prod_agents_registry",
    broadcastTopicName: "prod_beacon_channel",
    maxIterations: 10, // More iterations for complex production workflows
    state: {},
    saveStateLocally: false, // Use distributed state store
    timeout: 1800 // 30 minutes for complex workflows
  };
}

if (require.main === module) {
  main().catch(console.error);
}