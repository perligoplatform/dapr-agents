/**
 * Random Orchestrator example - TypeScript equivalent of Python quickstart
 * 
 * PYTHON EQUIVALENT: quickstarts/05-multi-agent-workflows/services/workflow-random/app.py
 * 
 * This example demonstrates how to create and start a Random orchestrator service
 * that randomly selects agents to handle tasks.
 */

import { RandomOrchestrator, type RandomOrchestratorConfig } from '../../src/workflow/orchestrators/index.js';

async function main(): Promise<void> {
  try {
    const config: RandomOrchestratorConfig = {
      name: "RandomOrchestrator",
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

    const workflowService = new RandomOrchestrator(config);
    
    console.log('🎲 Random Orchestrator created successfully');
    console.log(`   - Name: ${config.name}`);
    console.log(`   - Max Iterations: ${config.maxIterations}`);
    console.log(`   - Strategy: Random agent selection`);
    
    await workflowService.startRuntime();
    
    console.log('✅ Random Orchestrator runtime started successfully');
    console.log('🎯 Ready to randomly assign tasks to agents');
    
  } catch (error) {
    console.error(`❌ Error starting Random Orchestrator: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}