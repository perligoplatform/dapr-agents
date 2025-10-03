#!/usr/bin/env node

/**
 * Pub/Sub Configuration Switcher
 * 
 * Usage:
 *   npx tsx switch-pubsub.ts redis     # Switch to Redis
 *   npx tsx switch-pubsub.ts inmemory  # Switch to in-memory
 *   npx tsx switch-pubsub.ts           # Show current configuration
 */

import fs from 'fs';
import path from 'path';
import { loadEnvironment } from './src/utils/environment.js';
import { getPubSubConfig } from './src/utils/pubsub.js';

// Load current environment
loadEnvironment();

const envFilePath = path.join(process.cwd(), '.env');

function updateEnvFile(newType: string): void {
  if (!fs.existsSync(envFilePath)) {
    console.error('❌ .env file not found');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envFilePath, 'utf8');
  
  // Update or add PUBSUB_TYPE
  if (envContent.includes('PUBSUB_TYPE=')) {
    envContent = envContent.replace(/PUBSUB_TYPE=.*/g, `PUBSUB_TYPE=${newType}`);
  } else {
    envContent += `\nPUBSUB_TYPE=${newType}\n`;
  }
  
  fs.writeFileSync(envFilePath, envContent);
  console.log(`✅ Updated PUBSUB_TYPE to: ${newType}`);
}

function showCurrentConfig(): void {
  try {
    const config = getPubSubConfig();
    console.log('📋 Current Pub/Sub Configuration:');
    console.log(`   Type: ${config.type}`);
    console.log(`   Component: ${config.componentName}`);
    console.log(`   Description: ${config.description}`);
  } catch (error) {
    console.error('❌ Error reading configuration:', (error as Error).message);
  }
}

function showUsage(): void {
  console.log('📖 Usage:');
  console.log('   npx tsx switch-pubsub.ts redis     # Switch to Redis');
  console.log('   npx tsx switch-pubsub.ts inmemory  # Switch to in-memory');
  console.log('   npx tsx switch-pubsub.ts           # Show current configuration');
  console.log('');
  console.log('📝 Note: Restart Dapr sidecar after switching to pick up new component');
}

// Main execution
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

switch (command) {
  case 'redis':
    updateEnvFile('redis');
    showCurrentConfig();
    console.log('');
    console.log('🔄 Remember to restart Dapr sidecar to use Redis component');
    break;
    
  case 'inmemory':
    updateEnvFile('inmemory');
    showCurrentConfig();
    console.log('');
    console.log('🔄 Remember to restart Dapr sidecar to use in-memory component');
    break;
    
  case undefined:
    showCurrentConfig();
    break;
    
  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('');
    showUsage();
    process.exit(1);
}