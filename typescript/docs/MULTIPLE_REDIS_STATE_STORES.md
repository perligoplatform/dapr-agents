# Multiple Redis State Stores in Dapr

## Overview

Yes, you can absolutely have multiple Redis-based state stores in Dapr! Each state store component gets a unique name and can have different configurations, even when using the same underlying Redis server.

## Example: Three Redis State Stores

Here are three Redis state stores I've created for your project, each with different purposes and configurations:

### 1. Workflow State Store (`statestore-workflows.yaml`)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-workflows
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisDB
    value: "0"                    # Redis database 0
  - name: actorStateStore
    value: "true"                 # REQUIRED for workflows
  - name: keyPrefix
    value: "workflows"            # Keys: workflows:*
```

**Purpose**: Workflow and actor state persistence
**Database**: Redis DB 0
**Key Pattern**: `workflows:actor:workflow_instance_id`

### 2. Agent State Store (`statestore-agents.yaml`)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-agents
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisDB
    value: "1"                    # Redis database 1
  - name: actorStateStore
    value: "false"                # Not for workflows
  - name: keyPrefix
    value: "agents"               # Keys: agents:*
```

**Purpose**: Agent configurations, memory, and persistent state
**Database**: Redis DB 1
**Key Pattern**: `agents:agent_id:property`

### 3. Cache State Store (`statestore-cache.yaml`)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-cache
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisDB
    value: "2"                    # Redis database 2
  - name: actorStateStore
    value: "false"                # Not for workflows
  - name: keyPrefix
    value: "cache"                # Keys: cache:*
  - name: ttlInSeconds
    value: "3600"                 # 1 hour TTL
```

**Purpose**: Session data, temporary storage, and caching
**Database**: Redis DB 2
**Key Pattern**: `cache:session_id` (with TTL)

## How Dapr Discovers and Routes Multiple Redis Stores

### 1. Component Discovery

When Dapr starts, it discovers all three components:

```bash
# Dapr scans components/ directory
statestore-workflows.yaml    → Component: "statestore-workflows"
statestore-agents.yaml       → Component: "statestore-agents"  
statestore-cache.yaml        → Component: "statestore-cache"
statestore.yaml             → Component: "statestore" (in-memory)
```

### 2. Component Registration

Dapr registers each as a separate state store:

```typescript
// Internal Dapr component registry (conceptual)
const stateStores = {
  "statestore-workflows": new RedisStateStore({
    host: "localhost:6379",
    db: 0,
    keyPrefix: "workflows",
    actorStateStore: true
  }),
  "statestore-agents": new RedisStateStore({
    host: "localhost:6379", 
    db: 1,
    keyPrefix: "agents",
    actorStateStore: false
  }),
  "statestore-cache": new RedisStateStore({
    host: "localhost:6379",
    db: 2, 
    keyPrefix: "cache",
    ttl: 3600,
    actorStateStore: false
  }),
  "statestore": new InMemoryStateStore({
    actorStateStore: true  // Fallback for development
  })
};
```

### 3. Runtime Component Selection

Your application code specifies which state store to use by **name**:

```typescript
// Different operations use different state stores
const daprClient = new DaprClient();

// Workflow-related state (uses Redis DB 0)
await daprClient.state.save("statestore-workflows", [
  {
    key: "workflow_instance_123",
    value: workflowState
  }
]);

// Agent configuration (uses Redis DB 1)  
await daprClient.state.save("statestore-agents", [
  {
    key: "agent_gpt4_config",
    value: agentConfig
  }
]);

// Session cache (uses Redis DB 2, with TTL)
await daprClient.state.save("statestore-cache", [
  {
    key: "user_session_456", 
    value: sessionData
  }
]);
```

## Data Isolation and Organization

### Redis Database Separation

Each state store uses a different Redis database:

```bash
# Connect to Redis and check different databases
redis-cli

# Workflow data (DB 0)
SELECT 0
KEYS workflows:*
# Returns: workflows:actor:workflow_instance_123

# Agent data (DB 1)  
SELECT 1
KEYS agents:*
# Returns: agents:agent_gpt4_config, agents:agent_claude_memory

# Cache data (DB 2)
SELECT 2  
KEYS cache:*
# Returns: cache:user_session_456 (with TTL)
```

### Key Prefix Organization

Even within the same database, key prefixes provide logical separation:

```
Redis DB 0 (Workflows):
├── workflows:actor:instance_1:state
├── workflows:actor:instance_2:state  
└── workflows:history:completed_runs

Redis DB 1 (Agents):
├── agents:gpt4:config
├── agents:gpt4:memory:conversation_history
├── agents:claude:config
└── agents:registry:available_agents

Redis DB 2 (Cache):
├── cache:session:user_123 (TTL: 3600s)
├── cache:llm_response:hash_abc (TTL: 1800s)
└── cache:temp:upload_xyz (TTL: 600s)
```

## Framework Integration Examples

### 1. LLM Orchestrator Configuration

Update your orchestrator to use specific state stores:

```typescript
// From LLM Orchestrator config
const config = {
  name: "llm_orchestrator",
  messageBusName: "messagepubsub",
  stateStoreName: "statestore-workflows",        // Workflow state
  agentsRegistryStoreName: "statestore-agents",  // Agent registry
  cacheStoreName: "statestore-cache",           // Temporary data
  broadcastTopicName: "broadcast_channel"
};
```

### 2. State Store Selection Utility

Create a utility for dynamic state store selection:

```typescript
// src/utils/statestore.ts
export interface StateStoreConfig {
  workflows: string;
  agents: string;
  cache: string;
  fallback: string;
}

export function getStateStoreConfig(): StateStoreConfig {
  const environment = process.env.NODE_ENV || 'development';
  
  if (environment === 'production') {
    return {
      workflows: "statestore-workflows",  // Redis DB 0
      agents: "statestore-agents",        // Redis DB 1
      cache: "statestore-cache",          // Redis DB 2
      fallback: "statestore"              // In-memory fallback
    };
  } else {
    return {
      workflows: "statestore",            // In-memory for dev
      agents: "statestore", 
      cache: "statestore",
      fallback: "statestore"
    };
  }
}
```

### 3. Usage in Framework Code

```typescript
// Workflow state management
class WorkflowStateManager {
  private stateStoreName: string;
  
  constructor() {
    const config = getStateStoreConfig();
    this.stateStoreName = config.workflows;
  }
  
  async saveWorkflowState(instanceId: string, state: any) {
    await daprClient.state.save(this.stateStoreName, [
      { key: `instance_${instanceId}`, value: state }
    ]);
  }
}

// Agent registry management
class AgentRegistry {
  private stateStoreName: string;
  
  constructor() {
    const config = getStateStoreConfig();
    this.stateStoreName = config.agents;
  }
  
  async registerAgent(agentId: string, config: any) {
    await daprClient.state.save(this.stateStoreName, [
      { key: `agent_${agentId}`, value: config }
    ]);
  }
}

// Cache management
class CacheManager {
  private stateStoreName: string;
  
  constructor() {
    const config = getStateStoreConfig();
    this.stateStoreName = config.cache;
  }
  
  async cacheResponse(key: string, data: any, ttl: number = 3600) {
    await daprClient.state.save(this.stateStoreName, [
      { key: `cache_${key}`, value: data }
    ]);
    // TTL is handled by Redis configuration
  }
}
```

## Advanced Redis Configurations

### 1. Different Redis Instances

You could also point to completely different Redis servers:

```yaml
# High-performance Redis for workflows
metadata:
  name: statestore-workflows-prod
spec:
  metadata:
  - name: redisHost
    value: "redis-cluster-1.example.com:6379"
  - name: redisPassword
    value: "{env:REDIS_WORKFLOWS_PASSWORD}"

# Separate Redis for agent data
metadata:
  name: statestore-agents-prod  
spec:
  metadata:
  - name: redisHost
    value: "redis-cluster-2.example.com:6379"
  - name: redisPassword
    value: "{env:REDIS_AGENTS_PASSWORD}"
```

### 2. Redis Cluster Configuration

```yaml
# Redis cluster for high availability
metadata:
  name: statestore-ha-workflows
spec:
  metadata:
  - name: redisType
    value: "cluster"
  - name: redisHosts
    value: "redis-1:6379,redis-2:6379,redis-3:6379"
  - name: redisPassword
    value: "{env:REDIS_CLUSTER_PASSWORD}"
```

### 3. Redis Sentinel Configuration

```yaml
# Redis with Sentinel for failover
metadata:
  name: statestore-sentinel-workflows
spec:
  metadata:
  - name: redisType
    value: "sentinel"
  - name: sentinelMasterName
    value: "mymaster"
  - name: sentinelHosts
    value: "sentinel-1:26379,sentinel-2:26379,sentinel-3:26379"
```

## Performance and Scaling Considerations

### 1. Database Separation Benefits

- **Performance Isolation**: Heavy workflow operations don't affect agent lookups
- **Backup Strategies**: Different backup schedules for different data types
- **Scaling**: Can move databases to separate Redis instances as needed

### 2. Memory Management

```bash
# Monitor memory usage per database
redis-cli info memory
redis-cli --scan --pattern "workflows:*" | wc -l  # Count workflow keys
redis-cli --scan --pattern "agents:*" | wc -l     # Count agent keys
redis-cli --scan --pattern "cache:*" | wc -l      # Count cache keys
```

### 3. Performance Optimization

```yaml
# Optimized for different use cases
metadata:
- name: maxRetries
  value: "3"
- name: retryDelayInMilliseconds  
  value: "1000"
- name: enableTLS
  value: "false"
- name: dialTimeoutInSeconds
  value: "5"
```

## Monitoring and Debugging

### 1. Check Component Status

```bash
# List all state store components
curl http://localhost:3500/v1.0/components | jq '.[] | select(.type | startswith("state"))'

# Expected output:
# {
#   "name": "statestore-workflows",
#   "type": "state.redis", 
#   "version": "v1"
# },
# {
#   "name": "statestore-agents",
#   "type": "state.redis",
#   "version": "v1" 
# },
# {
#   "name": "statestore-cache",
#   "type": "state.redis",
#   "version": "v1"
# }
```

### 2. Test Component Connectivity

```bash
# Test each state store
curl -X POST http://localhost:3500/v1.0/state/statestore-workflows \
  -H "Content-Type: application/json" \
  -d '[{"key": "test", "value": "workflow-test"}]'

curl -X POST http://localhost:3500/v1.0/state/statestore-agents \
  -H "Content-Type: application/json" \
  -d '[{"key": "test", "value": "agent-test"}]'

curl -X POST http://localhost:3500/v1.0/state/statestore-cache \
  -H "Content-Type: application/json" \
  -d '[{"key": "test", "value": "cache-test"}]'
```

### 3. Redis Monitoring

```bash
# Monitor Redis activity across all databases
redis-cli monitor

# Check specific database usage
redis-cli -n 0 dbsize  # Workflow database
redis-cli -n 1 dbsize  # Agent database  
redis-cli -n 2 dbsize  # Cache database
```

## Summary

Having three (or more) Redis-based state stores is not only possible but often beneficial for:

1. **Data Organization**: Logical separation of workflows, agents, and cache data
2. **Performance Isolation**: Different performance characteristics for different data types
3. **Security**: Different access patterns and retention policies
4. **Scaling**: Ability to move components to separate Redis instances
5. **Development**: Easy switching between Redis and in-memory for testing

The key is that each component has a **unique name**, and your application code specifies which state store to use for each operation. Dapr handles the routing and maintains separate connections/configurations for each component.