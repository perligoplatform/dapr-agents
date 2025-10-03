/**
 * Pub/Sub Utility Functions
 * 
 * This module provides utilities for dynamic pubsub component selection
 * and configuration based on environment variables.
 */

export interface PubSubConfig {
  componentName: string;
  type: 'redis' | 'inmemory';
  description: string;
}

/**
 * Get the appropriate pubsub component configuration based on environment
 */
export function getPubSubConfig(): PubSubConfig {
  const pubsubType = (process.env.PUBSUB_TYPE || 'redis').toLowerCase() as 'redis' | 'inmemory';
  
  const configs: Record<string, PubSubConfig> = {
    redis: {
      componentName: 'messagepubsub',
      type: 'redis',
      description: 'Redis-based pubsub (production-ready, persistent)'
    },
    inmemory: {
      componentName: 'messagepubsub-inmemory',
      type: 'inmemory',
      description: 'In-memory pubsub (testing/development, not persistent)'
    }
  };

  const config = configs[pubsubType];
  if (!config) {
    throw new Error(`Invalid PUBSUB_TYPE: ${pubsubType}. Must be 'redis' or 'inmemory'`);
  }

  return config;
}

/**
 * Validate that the required pubsub dependencies are available
 */
export async function validatePubSubDependencies(config: PubSubConfig): Promise<boolean> {
  if (config.type === 'redis') {
    // Could add Redis connectivity check here
    console.log('📡 Using Redis pubsub - ensure Redis is running on localhost:6379');
    return true;
  } else {
    console.log('💾 Using in-memory pubsub - messages will not persist across restarts');
    return true;
  }
}

/**
 * Display pubsub configuration information
 */
export function displayPubSubInfo(config: PubSubConfig): void {
  console.log('🔧 Pub/Sub Configuration:');
  console.log(`   Component: ${config.componentName}`);
  console.log(`   Type: ${config.type}`);
  console.log(`   Description: ${config.description}`);
  console.log('');
}