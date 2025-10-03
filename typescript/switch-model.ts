#!/usr/bin/env node

/**
 * Azure OpenAI Model Switcher
 * 
 * Usage:
 *   npx tsx switch-model.ts gpt-4                    # Switch to gpt-4 deployment
 *   npx tsx switch-model.ts gpt-35-turbo            # Switch to gpt-35-turbo deployment  
 *   npx tsx switch-model.ts my-custom-deployment     # Switch to custom deployment
 *   npx tsx switch-model.ts                         # Show current configuration
 */

import fs from 'fs';
import path from 'path';
import { loadEnvironment } from './src/utils/environment.js';

// Load current environment
loadEnvironment();

const envFilePath = path.join(process.cwd(), '.env');

function updateEnvFile(deploymentName: string): void {
  if (!fs.existsSync(envFilePath)) {
    console.error('❌ .env file not found');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envFilePath, 'utf8');
  
  // Update or add AZURE_OPENAI_DEPLOYMENT_NAME
  if (envContent.includes('AZURE_OPENAI_DEPLOYMENT_NAME=')) {
    envContent = envContent.replace(/AZURE_OPENAI_DEPLOYMENT_NAME=.*/g, `AZURE_OPENAI_DEPLOYMENT_NAME=${deploymentName}`);
  } else {
    envContent += `\nAZURE_OPENAI_DEPLOYMENT_NAME=${deploymentName}\n`;
  }
  
  fs.writeFileSync(envFilePath, envContent);
  console.log(`✅ Updated Azure OpenAI deployment to: ${deploymentName}`);
}

function showCurrentConfig(): void {
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'not configured';
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'not configured';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || 'not configured';
  
  console.log('📋 Current Azure OpenAI Configuration:');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Deployment: ${deploymentName}`);
  console.log(`   API Version: ${apiVersion}`);
  console.log(`   Component: azure-openai`);
}

function showUsage(): void {
  console.log('📖 Usage:');
  console.log('   npx tsx switch-model.ts gpt-4                    # Switch to gpt-4 deployment');
  console.log('   npx tsx switch-model.ts gpt-35-turbo            # Switch to gpt-35-turbo deployment');
  console.log('   npx tsx switch-model.ts my-custom-deployment     # Switch to custom deployment');
  console.log('   npx tsx switch-model.ts                         # Show current configuration');
  console.log('');
  console.log('💡 Common deployment names:');
  console.log('   • gpt-4');
  console.log('   • gpt-4-turbo');
  console.log('   • gpt-35-turbo');
  console.log('   • gpt-35-turbo-16k');
  console.log('');
  console.log('🔄 Remember to restart Dapr sidecar after switching models');
}

// Main execution
const args = process.argv.slice(2);
const deploymentName = args[0];

if (deploymentName) {
  updateEnvFile(deploymentName);
  showCurrentConfig();
  console.log('');
  console.log('🔄 Remember to restart Dapr sidecar to use new deployment');
} else {
  showCurrentConfig();
  console.log('');
  showUsage();
}