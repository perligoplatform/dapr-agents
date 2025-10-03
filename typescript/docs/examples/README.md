# Example Configurations

This directory contains example configurations for various scenarios.

## Available Examples

### Environment Configurations

#### Development Environment (.env.development)
```env
# Development configuration with in-memory components
PUBSUB_TYPE=inmemory
AZURE_OPENAI_DEPLOYMENT=gpt-35-turbo-dev
DAPR_LOG_LEVEL=debug
APP_PORT=3000
```

#### Production Environment (.env.production)
```env
# Production configuration with Redis
PUBSUB_TYPE=redis
AZURE_OPENAI_DEPLOYMENT=gpt-4-prod
DAPR_LOG_LEVEL=info
APP_PORT=8080
```

#### Testing Environment (.env.test)
```env
# Testing configuration
PUBSUB_TYPE=inmemory
AZURE_OPENAI_DEPLOYMENT=gpt-35-turbo-test
DAPR_LOG_LEVEL=warn
APP_PORT=3001
```

### Component Configurations

#### Azure OpenAI with Multiple Deployments
```yaml
# components/azure-openai-multi.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-openai-gpt4
spec:
  type: conversation.azure.openai
  version: v1
  metadata:
  - name: apiKey
    value: "{env:AZURE_OPENAI_API_KEY}"
  - name: endpoint
    value: "{env:AZURE_OPENAI_ENDPOINT}"
  - name: deploymentName
    value: "gpt-4-deployment"
  - name: apiVersion
    value: "{env:AZURE_OPENAI_API_VERSION}"
scopes:
- dapr-agents
```

#### Redis with Authentication
```yaml
# components/messagepubsub-auth.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagepubsub-secure
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "{env:REDIS_HOST}"
  - name: redisPassword
    value: "{env:REDIS_PASSWORD}"
  - name: redisDB
    value: "{env:REDIS_DB}"
  - name: enableTLS
    value: "true"
scopes:
- dapr-agents
```

### VS Code Configurations

#### Multi-Environment Launch Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Development",
      "envFile": "${workspaceFolder}/.env.development",
      "preLaunchTask": "start-dapr-dev"
    },
    {
      "name": "Debug Production-like",
      "envFile": "${workspaceFolder}/.env.production",
      "preLaunchTask": "start-dapr-prod"
    }
  ]
}
```

## Usage

1. Copy the appropriate `.env.*` file to `.env`
2. Update with your actual values
3. Copy component files to `components/` directory
4. Start debugging with F5

## Notes

- These are example configurations - adapt for your specific needs
- Always use environment variables for sensitive data
- Test configurations in development before deploying