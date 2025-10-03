/**
 * Sequential Workflow example - TypeScript equivalent of Python workflow example
 * 
 * PYTHON EQUIVALENT: quickstarts/04-llm-based-workflows/sequential_workflow.py
 * 
 * This example demonstrates how to create a workflow with sequential task execution
 * using the TypeScript workflow system with LLM-powered tasks.
 */

import { WorkflowApp } from '../../src/workflow/index.js';
import { loadEnvironment } from '../../src/utils/environment.js';
import { WorkflowContext } from '@dapr/dapr';
import { getDefaultLLM } from '../../src/llm/utils/defaults.js';

// Load environment variables from .env file
loadEnvironment();

/**
 * Sequential workflow that chains LLM tasks together
 * PYTHON EQUIVALENT: task_chain_workflow function in sequential_workflow.py
 */
async function taskChainWorkflow(ctx: WorkflowContext): Promise<string> {
  // Execute first task - get a character
  const character = await ctx.callActivity('get_character') as unknown as string;
  
  // Execute second task - get a famous line from that character
  const famousLine = await ctx.callActivity('get_line', { character }) as unknown as string;
  
  return famousLine;
}

/**
 * Task to pick a random LOTR character
 * PYTHON EQUIVALENT: get_character function in sequential_workflow.py
 */
async function getCharacter(input?: any): Promise<string> {
  console.log('🧙 getCharacter called with input:', input);
  
  // This would typically call an LLM service
  // For this example, we'll simulate the response
  const characters = [
    'Gandalf',
    'Frodo Baggins', 
    'Aragorn',
    'Legolas',
    'Gimli',
    'Samwise Gamgee',
    'Boromir',
    'Galadriel'
  ];
  
  const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
  console.log(`🧙 Character selected: ${randomCharacter}`);
  
  return randomCharacter;
}

/**
 * Task to get a famous line from the specified character
 * PYTHON EQUIVALENT: get_line function in sequential_workflow.py
 */
async function getLine(input: { character: string }): Promise<string> {
  console.log('💬 getLine called with input:', input);
  
  // This would typically call an LLM service
  // For this example, we'll simulate the response with predefined quotes
  const famousQuotes: Record<string, string> = {
    'Gandalf': 'You shall not pass!',
    'Frodo Baggins': 'I will take the Ring, though I do not know the way.',
    'Aragorn': 'A day may come when the courage of men fails, but it is not this day.',
    'Legolas': 'A red sun rises. Blood has been spilled this night.',
    'Gimli': 'Nobody tosses a Dwarf!',
    'Samwise Gamgee': 'Share and enjoy!',
    'Boromir': 'One does not simply walk into Mordor.',
    'Galadriel': 'Even the smallest person can change the course of the future.'
  };
  
  const quote = famousQuotes[input.character] || `A wise saying from ${input.character}`;
  console.log(`💬 Famous line: "${quote}"`);
  
  return quote;
}

/**
 * Example of running the workflow synchronously
 */
export async function runSequentialWorkflowExample(): Promise<string> {
  const wfApp = new WorkflowApp({
    llm: getDefaultLLM(),
    timeout: 30 // 5 minutes
  });
  
  // Register the workflow and tasks using the proper methods
  wfApp.registerWorkflow('task_chain_workflow', taskChainWorkflow);
  wfApp.registerTask('get_character', getCharacter);
  wfApp.registerTask('get_line', getLine);
  
  console.log('🚀 Starting sequential workflow...');
  
  try {
    // Start the workflow runtime
    await wfApp.startRuntime();
    
    // Execute the workflow using the client
    if (wfApp.wfClient) {
      const instanceId = `sequential-${Date.now()}`;
      
      await wfApp.wfClient.scheduleNewWorkflow('task_chain_workflow', {}, instanceId);
      
      // Wait for completion and get result
      const result = await wfApp.wfClient.waitForWorkflowCompletion(instanceId, undefined, 300000);
      
      if (result) {
        console.log(`✅ Workflow completed successfully`);
        console.log(`🎬 Result: ${result.serializedOutput}`);
        
        return result.serializedOutput || 'No output';
      } else {
        throw new Error('Workflow result is undefined');
      }
    } else {
      throw new Error('Workflow client not initialized');
    }
    
  } catch (error) {
    console.error(`❌ Workflow failed: ${error}`);
    throw error;
  }
}

/**dapr
 * Example with more complex task chaining
 */
export async function runExtendedSequentialWorkflow(): Promise<any> {
  const wfApp = new WorkflowApp({
    llm: getDefaultLLM(),
    timeout: 600 // 10 minutes for extended workflow
  });
  
  // Define extended workflow
  const extendedWorkflow = async (ctx: WorkflowContext, input: any) => {
    console.log('🚀 Starting extendedWorkflow execution with input:', input);
    
    // Step 1: Get character
    console.log('📝 Step 1: Calling get_character activity...');
    const character = await ctx.callActivity('get_character', {});
    console.log('✅ Step 1 completed, character:', character);
    
    // Step 2: Get famous line
    console.log('📝 Step 2: Calling get_line activity...');
    const famousLine = await ctx.callActivity('get_line', { character });
    console.log('✅ Step 2 completed, famous line:', famousLine);
    
    // Step 3: Analyze the quote (simulated)
    console.log('📝 Step 3: Calling analyze_quote activity...');
    const analysis = await ctx.callActivity('analyze_quote', { 
      character, 
      quote: famousLine 
    });
    console.log('✅ Step 3 completed, analysis:', analysis);
    
    // Step 4: Generate story context
    console.log('📝 Step 4: Calling generate_context activity...');
    const context = await ctx.callActivity('generate_context', {
      character,
      quote: famousLine,
      analysis
    });
    console.log('✅ Step 4 completed, context:', context);

    const result = {
      character,
      quote: famousLine,
      analysis,
      context
    };
    
    console.log('🎉 Workflow completed successfully with result:', result);
    return result;
  };  // Additional tasks for extended workflow
  const analyzeQuote = async (input: { character: string; quote: string }) => {
    console.log('🔍 analyzeQuote called with input:', input);
    const result = `This quote by ${input.character} demonstrates themes of courage and determination, characteristic of Tolkien's heroic literature.`;
    console.log('🔍 Analysis result:', result);
    return result;
  };

  const generateContext = async (input: { character: string; quote: string; analysis: string }) => {
    console.log('📖 generateContext called with input:', input);
    const result = `In the world of Middle-earth, ${input.character} speaks these words during a moment of great significance, reflecting the epic nature of their journey.`;
    console.log('📖 Context result:', result);
    return result;
  };
  
  // Register everything
  wfApp.registerWorkflow('extended_task_chain', extendedWorkflow);
  wfApp.registerTask('get_character', getCharacter);
  wfApp.registerTask('get_line', getLine);
  wfApp.registerTask('analyze_quote', analyzeQuote);
  wfApp.registerTask('generate_context', generateContext);
  
  console.log('🚀 Starting extended sequential workflow...');
  
  try {
    await wfApp.startRuntime();
    
    if (wfApp.wfClient) {
      const instanceId = `extended-${Date.now()}`;
      console.log(`🎯 Scheduling workflow with instance ID: ${instanceId}`);
      
      await wfApp.wfClient.scheduleNewWorkflow('extended_task_chain', undefined, instanceId);
      console.log(`📅 Workflow scheduled, waiting for completion...`);
      
      const result = await wfApp.wfClient.waitForWorkflowCompletion(instanceId, undefined, 600000);
      
      if (result) {
        console.log(`✅ Extended workflow completed successfully`);
        console.log(`📖 Full result:`, result.serializedOutput);
        
        return result.serializedOutput;
      } else {
        throw new Error('Extended workflow result is undefined');
      }
    } else {
      throw new Error('Workflow client not initialized');
    }
    
  } catch (error) {
    console.error(`❌ Extended workflow failed: ${error}`);
    throw error;
  }
}

/**
 * Simple example that demonstrates basic workflow concepts
 */
export async function runBasicExample(): Promise<void> {
  console.log('🎭 Running basic sequential workflow example...');
  console.log('   - This simulates LLM-powered task chaining');
  console.log('   - Character selection → Famous quote → Result');
  console.log('');
  
  try {
    const result = await runSequentialWorkflowExample();
    console.log('');
    console.log('🎉 Basic example completed!');
    console.log(`📝 Final output: ${result}`);
  } catch (error) {
    console.error('❌ Basic example failed:', error);
  }
}

// CLI execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const extended = '--extended';//args.includes('--extended');
  const basic = '--basic' //args.includes('--basic');
  
  try {
    if (basic) {
      await runBasicExample();
    } else if (extended) {
      await runExtendedSequentialWorkflow();
    } else {
      console.log('🎭 Sequential Workflow Examples');
      console.log('');
      console.log('Available options:');
      console.log('  --basic      Run basic sequential workflow');
      console.log('  --extended   Run extended workflow with analysis');
      console.log('');
      console.log('Example: node sequential-workflow.js --basic');
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}