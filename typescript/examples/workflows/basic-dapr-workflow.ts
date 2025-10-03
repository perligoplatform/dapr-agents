/**
 * Basic Dapr Workflow Example - Minimal implementation using only Dapr SDK
 * 
 * This example uses only the core Dapr workflow components without any custom wrappers
 * to test if the basic workflow functionality works.
 */

import { 
  WorkflowRuntime, 
  DaprWorkflowClient, 
  WorkflowActivityContext, 
  WorkflowContext
} from '@dapr/dapr';

// Simple activity function
async function sayHello(context: WorkflowActivityContext, name: string): Promise<string> {
  console.log(`🔧 sayHello activity called with name: ${name}`);
  const result = `Hello, ${name}!`;
  console.log(`✅ sayHello returning: ${result}`);
  return result;
}

// Simple workflow function
async function helloWorkflow(context: WorkflowContext, input: any): Promise<string> {
  console.log(`🚀 helloWorkflow started with input:`, input);
  
  const name = input?.name || 'World';
  console.log(`📝 Calling sayHello activity with name: ${name}`);
  
  const greeting = await context.callActivity('sayHello', name);
  console.log(`✅ Activity completed, got: ${greeting}`);
  
  const result = `Workflow result: ${greeting}`;
  console.log(`🎉 Workflow completed with: ${result}`);
  return result;
}

async function main() {
  console.log('🎭 Starting Basic Dapr Workflow Example');
  
  // Create workflow runtime and client
  const workflowRuntime = new WorkflowRuntime();
  const workflowClient = new DaprWorkflowClient();
  
  try {
    // Register the activity and workflow
    console.log('📋 Registering activity: sayHello');
    workflowRuntime.registerActivityWithName('sayHello', sayHello);
    
    console.log('🔄 Registering workflow: helloWorkflow');
    workflowRuntime.registerWorkflowWithName('helloWorkflow', helloWorkflow);
    
    // Start the workflow runtime
    console.log('🚀 Starting workflow runtime...');
    await workflowRuntime.start();
    console.log('✅ Workflow runtime started successfully');
    
    // Schedule a new workflow instance
    const instanceId = `hello-${Date.now()}`;
    console.log(`🎯 Scheduling workflow with instance ID: ${instanceId}`);
    
    await workflowClient.scheduleNewWorkflow('helloWorkflow', { name: 'Dapr' }, instanceId);
    console.log('📅 Workflow scheduled, waiting for completion...');
    
    // Wait for workflow completion
    const result = await workflowClient.waitForWorkflowCompletion(instanceId, true, 30);
    
    if (result) {
      console.log('✅ Workflow completed successfully!');
      console.log('📖 Result:', result.serializedOutput);
    } else {
      console.error('❌ No result returned from workflow');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Cleanup
    try {
      console.log('🛑 Stopping workflow runtime...');
      await workflowRuntime.stop();
      console.log('✅ Workflow runtime stopped');
    } catch (error) {
      console.error('❌ Error stopping runtime:', error);
    }
  }
}

// Run the example
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}