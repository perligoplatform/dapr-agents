/**
 * Pub/Sub client example - TypeScript equivalent of Python quickstart client
 * 
 * PYTHON EQUIVALENT: quickstarts/05-multi-agent-workflows/services/client/pubsub_client.py
 * 
 * This example demonstrates how to publish tasks to orchestrator services
 * using Dapr's pub/sub messaging system.
 */

import { DaprClient } from '@dapr/dapr';
import { loadEnvironment } from '../../src/utils/environment.js';
import { getPubSubConfig, validatePubSubDependencies, displayPubSubInfo } from '../../src/utils/pubsub.js';

// Load environment variables from .env file
loadEnvironment();

// Get dynamic pubsub configuration
const pubsubConfig = getPubSubConfig();
const PUBSUB_NAME = pubsubConfig.componentName;

// Display configuration info
displayPubSubInfo(pubsubConfig);

/**
 * Publishes a task to a specified Dapr Pub/Sub topic with retries.
 */
async function publishTask(
  orchestratorTopic: string,
  maxAttempts: number = 10,
  retryDelay: number = 1000
): Promise<void> {
  // Validate pubsub dependencies
  await validatePubSubDependencies(pubsubConfig);
  
  const taskMessage = {
    task: "How to get to Mordor? We all need to help!"
  };

  // Wait a bit to ensure services are ready
  await new Promise(resolve => setTimeout(resolve, 5000));

  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      console.log(`📢 Attempt ${attempt}: Publishing to topic '${orchestratorTopic}'...`);

      const client = new DaprClient();
      
      await client.pubsub.publish(PUBSUB_NAME, orchestratorTopic, taskMessage, {
        metadata: {
          'cloudevent.type': 'TriggerAction'
        }
      });

      console.log(`✅ Successfully published request to '${orchestratorTopic}'`);
      // Note: DaprClient automatically manages connections
      return;

    } catch (error) {
      console.error(`❌ Request failed: ${error}`);
    }

    attempt++;
    console.log(`⏳ Waiting ${retryDelay}ms before next attempt...`);
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }

  console.error(`❌ Maximum attempts (${maxAttempts}) reached without success.`);
  process.exit(1);
}

/**
 * Example of publishing to different orchestrator types
 */
export async function publishToLLMOrchestrator(): Promise<void> {
  await publishTask('LLMOrchestrator');
}

export async function publishToRandomOrchestrator(): Promise<void> {
  await publishTask('RandomOrchestrator');
}

export async function publishToRoundRobinOrchestrator(): Promise<void> {
  await publishTask('RoundRobinOrchestrator');
}

/**
 * Example of publishing complex tasks
 */
export async function publishComplexTask(orchestratorTopic: string): Promise<void> {
  const complexTask = {
    task: "Create a comprehensive analysis of renewable energy solutions",
    requirements: [
      "Research current solar technology trends",
      "Analyze wind power efficiency data", 
      "Compare costs of different renewable sources",
      "Provide implementation recommendations"
    ],
    priority: "high",
    deadline: "2024-12-31",
    stakeholders: ["engineering", "finance", "sustainability"]
  };

  try {
    console.log(`📋 Publishing complex task to '${orchestratorTopic}'...`);
    
    const client = new DaprClient();
    
    await client.pubsub.publish(PUBSUB_NAME, orchestratorTopic, complexTask, {
      metadata: {
        'cloudevent.type': 'TriggerAction',
        'priority': 'high'
      }
    });

    console.log(`✅ Complex task published successfully`);
    // Note: DaprClient automatically manages connections
    
  } catch (error) {
    console.error(`❌ Failed to publish complex task: ${error}`);
    throw error;
  }
}

/**
 * Example of batch publishing multiple tasks
 */
export async function publishBatchTasks(orchestratorTopic: string, tasks: string[]): Promise<void> {
  const client = new DaprClient();
  
  try {
    console.log(`📦 Publishing batch of ${tasks.length} tasks to '${orchestratorTopic}'...`);
    
    const promises = tasks.map(async (task, index) => {
      const taskMessage = {
        task,
        batchId: `batch-${Date.now()}`,
        taskIndex: index,
        totalTasks: tasks.length
      };
      
      return client.pubsub.publish(PUBSUB_NAME, orchestratorTopic, taskMessage, {
        metadata: {
          'cloudevent.type': 'TriggerAction',
          'batch': 'true'
        }
      });
    });
    
    await Promise.all(promises);
    console.log(`✅ All ${tasks.length} tasks published successfully`);
    
  } catch (error) {
    console.error(`❌ Failed to publish batch tasks: ${error}`);
    throw error;
  }
  // Note: DaprClient automatically manages connections
}

// CLI functionality similar to Python version
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const orchestratorTopic = args.find(arg => arg.startsWith('--orchestrator='))?.split('=')[1] || 'LLMOrchestrator';
  
  console.log(`🚀 Publishing task to orchestrator: ${orchestratorTopic}`);
  
  try {
    await publishTask(orchestratorTopic);
  } catch (error) {
    console.error(`❌ Failed to publish task: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}