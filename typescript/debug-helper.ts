#!/usr/bin/env tsx

/**
 * Debug Helper for Dapr Integration
 * 
 * This script provides utilities to verify and test Dapr debugging setup.
 * Run with: tsx debug-helper.ts [command]
 * 
 * Commands:
 *   verify   - Check Dapr installation and status
 *   test     - Test basic Dapr functionality
 *   cleanup  - Stop all Dapr instances
 */

import { DaprClient, CommunicationProtocolEnum } from '@dapr/dapr';

interface DaprStatus {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
  instances: any[];
}

class DaprDebugHelper {
  private daprClient: DaprClient;

  constructor() {
    this.daprClient = new DaprClient({
      daprHost: 'localhost',
      daprPort: '3500',
      communicationProtocol: CommunicationProtocolEnum.HTTP
    });
  }

  async checkDaprStatus(): Promise<DaprStatus> {
    const status: DaprStatus = {
      isInstalled: false,
      isRunning: false,
      instances: []
    };

    try {
      // Check if Dapr CLI is installed
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        const { stdout } = await execAsync('dapr version');
        status.isInstalled = true;
        status.version = stdout.trim();
        console.log('✅ Dapr CLI is installed:', status.version);
      } catch (error) {
        console.log('❌ Dapr CLI not found or not installed');
        return status;
      }

      // Check running instances
      try {
        const { stdout } = await execAsync('dapr list --output json');
        status.instances = JSON.parse(stdout);
        status.isRunning = status.instances.length > 0;
        
        if (status.isRunning) {
          console.log('✅ Dapr instances running:');
          status.instances.forEach(instance => {
            console.log(`  - ${instance.appId} (HTTP: ${instance.httpPort}, gRPC: ${instance.grpcPort})`);
          });
        } else {
          console.log('⚠️  No Dapr instances currently running');
        }
      } catch (error) {
        console.log('⚠️  Could not list Dapr instances');
      }

      // Test Dapr HTTP endpoint
      try {
        const response = await fetch('http://localhost:3500/v1.0/healthz');
        if (response.ok) {
          console.log('✅ Dapr HTTP endpoint is reachable');
        } else {
          console.log('❌ Dapr HTTP endpoint returned error:', response.status);
        }
      } catch (error) {
        console.log('❌ Cannot reach Dapr HTTP endpoint at localhost:3500');
      }

    } catch (error) {
      console.error('Error checking Dapr status:', error);
    }

    return status;
  }

  async testDaprIntegration(): Promise<boolean> {
    try {
      console.log('🧪 Testing Dapr integration...');

      // Test health endpoint
      const healthResponse = await fetch('http://localhost:3500/v1.0/healthz');
      if (!healthResponse.ok) {
        console.log('❌ Health check failed');
        return false;
      }
      console.log('✅ Health check passed');

      // Test metadata endpoint
      const metadataResponse = await fetch('http://localhost:3500/v1.0/metadata');
      if (!metadataResponse.ok) {
        console.log('❌ Metadata check failed');
        return false;
      }
      
      const metadata = await metadataResponse.json();
      console.log('✅ Metadata retrieved:', {
        id: metadata.id,
        version: metadata.runtimeVersion,
        components: metadata.components?.length || 0
      });

      // Test component invocation if LLM component exists
      const llmComponent = metadata.components?.find((c: any) => 
        c.name === 'llm' && c.type === 'bindings.openai'
      );

      if (llmComponent) {
        console.log('✅ LLM component found, testing invocation...');
        
        // Test a simple invocation
        try {
          const testPayload = {
            messages: [{ role: 'user', content: 'Hello, this is a test.' }],
            model: 'gpt-3.5-turbo',
            max_tokens: 10
          };

          const invokeResponse = await fetch('http://localhost:3500/v1.0/bindings/llm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operation: 'chatCompletion',
              data: testPayload
            })
          });

          if (invokeResponse.ok) {
            const result = await invokeResponse.json();
            console.log('✅ LLM component invocation successful');
            console.log('📝 Response preview:', result.choices?.[0]?.message?.content?.substring(0, 50) + '...');
          } else {
            console.log('⚠️  LLM component invocation failed with status:', invokeResponse.status);
            const error = await invokeResponse.text();
            console.log('Error details:', error.substring(0, 200));
          }
        } catch (error) {
          console.log('⚠️  LLM component test error:', (error as Error).message);
        }
      } else {
        console.log('⚠️  LLM component not found, skipping invocation test');
      }

      return true;
    } catch (error) {
      console.error('❌ Dapr integration test failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up Dapr instances...');
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Stop all Dapr instances
      try {
        await execAsync('dapr stop --app-id dapr-agents');
        console.log('✅ Stopped dapr-agents instance');
      } catch (error) {
        console.log('⚠️  No dapr-agents instance to stop');
      }

      // List remaining instances
      try {
        const { stdout } = await execAsync('dapr list');
        if (stdout.trim()) {
          console.log('Remaining Dapr instances:');
          console.log(stdout);
        } else {
          console.log('✅ All Dapr instances stopped');
        }
      } catch (error) {
        console.log('Could not list remaining instances');
      }

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async printDebugInfo(): Promise<void> {
    console.log('\n🔍 Debug Information Summary');
    console.log('==============================');
    
    const status = await this.checkDaprStatus();
    
    console.log('\n📋 VS Code Debug Configurations:');
    console.log('- Debug Dapr Integration Test: Test with auto Dapr management');
    console.log('- Debug Dapr Chat Client: Script with auto Dapr management');
    console.log('- Debug Dapr Setup Verification: Environment verification');
    
    console.log('\n🎯 Debugging Tips:');
    console.log('1. Set breakpoints in DaprChatClient.generate() method');
    console.log('2. Inspect this.invoker.invoke() calls');
    console.log('3. Check request/response payloads in Variables panel');
    console.log('4. Use "Debug Dapr Integration Test" for test debugging');
    console.log('5. Use "Debug Dapr Chat Client" for script debugging');
    
    console.log('\n🚀 Quick Start:');
    console.log('1. Open daprChatClient.ts and set breakpoints');
    console.log('2. Press F5 and select "Debug Dapr Chat Client"');
    console.log('3. Step through the code to see Dapr integration');
  }
}

async function main() {
  const command = process.argv[2] || 'verify';
  const helper = new DaprDebugHelper();

  switch (command) {
    case 'verify':
      await helper.checkDaprStatus();
      await helper.printDebugInfo();
      break;
      
    case 'test': {
      const success = await helper.testDaprIntegration();
      process.exit(success ? 0 : 1);
      break;
    }
      
    case 'cleanup': {
      await helper.cleanup();
      break;
    }
      
    default:
      console.log('Usage: tsx debug-helper.ts [verify|test|cleanup]');
      console.log('');
      console.log('Commands:');
      console.log('  verify   - Check Dapr installation and debug setup');
      console.log('  test     - Test Dapr integration functionality');
      console.log('  cleanup  - Stop all Dapr instances');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DaprDebugHelper };