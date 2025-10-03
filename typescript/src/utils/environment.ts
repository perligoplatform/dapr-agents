import { config } from 'dotenv';
import { join } from 'path';

/**
 * Load environment variables from .env file
 * This should be called at the start of the application
 */
export function loadEnvironment() {
  // Load .env file from project root
  const envPath = join(process.cwd(), '.env');
  const result = config({ path: envPath });
  
  if (result.error) {
    console.warn('⚠️  No .env file found or error loading it:', result.error.message);
    console.log('💡 Create a .env file from .env.example or set environment variables manually');
  } else {
    console.log('✅ Environment variables loaded from .env file');
  }
  
  return result;
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue!;
}

/**
 * Get OpenAI API key from environment
 */
export function getOpenAIApiKey(): string {
  return getEnvVar('OPENAI_API_KEY');
}

/**
 * Get Dapr configuration from environment
 */
export function getDaprConfig() {
  return {
    httpPort: parseInt(getEnvVar('DAPR_HTTP_PORT', '3500')),
    grpcPort: parseInt(getEnvVar('DAPR_GRPC_PORT', '50001')),
    logLevel: getEnvVar('DAPR_LOG_LEVEL', 'info'),
    appId: getEnvVar('APP_ID', 'dapr-agents'),
    appPort: parseInt(getEnvVar('APP_PORT', '3000')),
  };
}