/**
 * Round Robin Orchestrator example - TypeScript equivalent of Python quickstart
 * 
 * PYTHON EQUIVALENT: quickstarts/05-multi-agent-workflows/services/workflow-roundrobin/app.py
 * 
 * This example demonstrates how to create and start a Round Robin orchestrator service
 * that cycles through agents in order.
 */

import { RoundRobinOrchestrator, type RoundRobinOrchestratorConfig } from '../../src/workflow/orchestrators/index.js';

async function main(): Promise<void> {
  try {
    const config: RoundRobinOrchestratorConfig = {
      name: "RoundRobinOrchestrator", 
      messageBusName: "messagepubsub",
      stateStoreName: "workflowstatestore",
      stateKey: "workflow_state",
      agentsRegistryStoreName: "agentstatestore",
      agentsRegistryKey: "agents_registry",
      broadcastTopicName: "beacon_channel", 
      maxIterations: 3,
      currentAgentIndex: 0, // Start with first agent
      // Required fields from base config
      state: {},
      saveStateLocally: false,
      timeout: 300
    };

    const workflowService = new RoundRobinOrchestrator(config);
    
    console.log('🔄 Round Robin Orchestrator created successfully');
    console.log(`   - Name: ${config.name}`);
    console.log(`   - Max Iterations: ${config.maxIterations}`);
    console.log(`   - Strategy: Sequential agent rotation`);
    
    await workflowService.startRuntime();
    
    console.log('✅ Round Robin Orchestrator runtime started successfully');
    console.log('🎯 Ready to cycle through agents in order');
    
  } catch (error) {
    console.error(`❌ Error starting Round Robin Orchestrator: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}