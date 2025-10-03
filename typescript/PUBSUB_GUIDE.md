# Pub/Sub Configuration Guide

This project supports dynamic switching between different pub/sub backends for flexibility in development and production environments.

## Available Pub/Sub Options

### 1. Redis (Default - Production Ready)
- **Component**: `messagepubsub`
- **Description**: Redis-based pubsub (production-ready, persistent)
- **Requirements**: Redis server running on localhost:6379
- **Use case**: Production, development with persistence

### 2. In-Memory (Development/Testing)
- **Component**: `messagepubsub-inmemory`
- **Description**: In-memory pubsub (testing/development, not persistent)
- **Requirements**: None (built into Dapr)
- **Use case**: Quick testing, CI/CD, development without external dependencies

## Quick Configuration

### Using the CLI Switcher
```bash
# Switch to Redis (default)
npx tsx switch-pubsub.ts redis

# Switch to in-memory
npx tsx switch-pubsub.ts inmemory

# Check current configuration
npx tsx switch-pubsub.ts
```

### Manual Configuration
Edit your `.env` file:
```env
# For Redis
PUBSUB_TYPE=redis

# For in-memory
PUBSUB_TYPE=inmemory
```

## Component Files

The following component files are available:

- `components/messagepubsub.yaml` - Redis pubsub component
- `components/messagepubsub-inmemory.yaml` - In-memory pubsub component

## Important Notes

1. **Restart Required**: After switching pubsub types, restart your Dapr sidecar to pick up the new component
2. **Redis Dependency**: For Redis mode, ensure Redis is running (Docker: `docker run -p 6379:6379 redis`)
3. **Persistence**: In-memory mode does not persist messages across restarts
4. **Environment Loading**: The pubsub utilities automatically load from `.env` file

## Example Usage

```typescript
import { getPubSubConfig, validatePubSubDependencies } from './src/utils/pubsub.js';

// Get current configuration
const config = getPubSubConfig();
console.log(`Using: ${config.componentName} (${config.type})`);

// Validate dependencies
await validatePubSubDependencies(config);

// Use with Dapr client
const client = new DaprClient();
await client.pubsub.publish(config.componentName, 'topic', message);
```

## Troubleshooting

- **ERR_PUBSUB_NOT_FOUND**: Component not loaded - restart Dapr sidecar
- **Redis connection failed**: Ensure Redis is running on localhost:6379
- **Component validation failed**: Check component YAML syntax and restart Dapr