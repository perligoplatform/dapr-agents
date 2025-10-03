/**
 * TypeScript Dapr Agents Examples - Entry Point
 * 
 * This module provides easy access to all TypeScript examples demonstrating
 * the equivalent functionality of Python dapr-agents quickstarts.
 * 
 * PYTHON EQUIVALENT: Various quickstart examples in quickstarts/ directory
 */

// Orchestrator Examples
export * from './orchestrators/llm-orchestrator.js';
export * from './orchestrators/random-orchestrator.js';
export * from './orchestrators/roundrobin-orchestrator.js';

// Basic Usage Examples
export * from './basic-usage/pubsub-client.js';

// Workflow Examples  
export * from './workflows/sequential-workflow.js';

/**
 * Example runner that demonstrates all major functionality
 */
export async function runAllExamples(): Promise<void> {
  console.log('🚀 Running TypeScript Dapr Agents Examples');
  console.log('==========================================');
  console.log('');
  
  try {
    // Import examples
    const { runBasicExample } = await import('./workflows/sequential-workflow.js');
    const { publishToLLMOrchestrator } = await import('./basic-usage/pubsub-client.js');
    
    console.log('1️⃣ Running Sequential Workflow Example...');
    await runBasicExample();
    console.log('');
    
    console.log('2️⃣ Testing Pub/Sub Client...');
    console.log('   (Note: This requires a running orchestrator service)');
    // Uncomment to test with running services:
    // await publishToLLMOrchestrator();
    console.log('   ✅ Pub/Sub client ready (skipped actual publishing)');
    console.log('');
    
    console.log('🎉 All examples completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('- Start orchestrator services: node examples/orchestrators/llm-orchestrator.js');
    console.log('- Publish tasks: node examples/basic-usage/pubsub-client.js --orchestrator=LLMOrchestrator');
    console.log('- Run extended workflows: node examples/workflows/sequential-workflow.js --extended');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    throw error;
  }
}

/**
 * Example configurations for different use cases
 */
export const ExampleConfigs = {
  development: {
    maxIterations: 2,
    timeout: 60,
    saveStateLocally: true,
    logLevel: 'debug'
  },
  
  production: {
    maxIterations: 10,
    timeout: 1800,
    saveStateLocally: false,
    logLevel: 'info'
  },
  
  testing: {
    maxIterations: 1,
    timeout: 30,
    saveStateLocally: true,
    logLevel: 'error'
  }
};

/**
 * Helper function to get configuration for current environment
 */
export function getExampleConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ExampleConfigs[env as keyof typeof ExampleConfigs] || ExampleConfigs.development;
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('TypeScript Dapr Agents Examples');
    console.log('');
    console.log('Usage: node examples/index.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --all          Run all examples in sequence');
    console.log('');
    console.log('Individual examples:');
    console.log('  Orchestrators:');
    console.log('    node examples/orchestrators/llm-orchestrator.js');
    console.log('    node examples/orchestrators/random-orchestrator.js');
    console.log('    node examples/orchestrators/roundrobin-orchestrator.js');
    console.log('');
    console.log('  Clients:');
    console.log('    node examples/basic-usage/pubsub-client.js');
    console.log('');
    console.log('  Workflows:');
    console.log('    node examples/workflows/sequential-workflow.js --basic');
    console.log('    node examples/workflows/sequential-workflow.js --extended');
    
  } else if (args.includes('--all')) {
    runAllExamples().catch(console.error);
  } else {
    console.log('TypeScript Dapr Agents Examples');
    console.log('Use --help for usage information or --all to run all examples');
  }
}