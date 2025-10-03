# Multiple CosmosDB State Stores in Dapr

## Overview

Azure CosmosDB provides excellent state store capabilities for Dapr with global distribution, multiple consistency models, and automatic scaling. You can configure multiple CosmosDB state stores, each optimized for different data patterns and performance requirements.

## Example: Three CosmosDB State Stores

Here are three CosmosDB state stores I've created for your project, each with different purposes, consistency models, and performance characteristics:

### 1. Workflow State Store (`statestore-workflows-cosmos.yaml`)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-workflows-cosmos
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "{env:COSMOS_WORKFLOWS_URL}"
  - name: masterKey
    value: "{env:COSMOS_WORKFLOWS_KEY}"
  - name: database
    value: "dapr-workflows"
  - name: collection
    value: "workflow-state"
  - name: actorStateStore
    value: "true"                 # REQUIRED for workflows
  - name: partitionKey
    value: "workflowId"           # Partition by workflow ID
  - name: consistency
    value: "strong"               # Strong consistency for workflows
```

**Purpose**: Workflow and actor state persistence  
**Database**: `dapr-workflows`  
**Collection**: `workflow-state`  
**Partition Strategy**: By `workflowId` for optimal workflow isolation  
**Consistency**: Strong consistency to ensure workflow state integrity  

### 2. Agent State Store (`statestore-agents-cosmos.yaml`)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-agents-cosmos
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "{env:COSMOS_AGENTS_URL}"
  - name: masterKey
    value: "{env:COSMOS_AGENTS_KEY}"
  - name: database
    value: "dapr-agents"
  - name: collection
    value: "agent-registry"
  - name: actorStateStore
    value: "false"                # Not for workflows
  - name: partitionKey
    value: "agentType"            # Partition by agent type
  - name: consistency
    value: "session"              # Session consistency for agents
  - name: defaultTtlInSeconds
    value: "0"                    # No TTL (permanent storage)
```

**Purpose**: Agent configurations, memory, and persistent state  
**Database**: `dapr-agents`  
**Collection**: `agent-registry`  
**Partition Strategy**: By `agentType` (e.g., "gpt4", "claude", "custom")  
**Consistency**: Session consistency for good performance with consistency within session  

### 3. Cache State Store (`statestore-cache-cosmos.yaml`)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-cache-cosmos
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "{env:COSMOS_CACHE_URL}"
  - name: masterKey
    value: "{env:COSMOS_CACHE_KEY}"
  - name: database
    value: "dapr-cache"
  - name: collection
    value: "session-cache"
  - name: actorStateStore
    value: "false"                # Not for workflows
  - name: partitionKey
    value: "sessionType"          # Partition by session type
  - name: consistency
    value: "eventual"             # Eventual consistency for cache
  - name: defaultTtlInSeconds
    value: "3600"                 # 1 hour TTL
```

**Purpose**: Session data, temporary storage, and caching  
**Database**: `dapr-cache`  
**Collection**: `session-cache`  
**Partition Strategy**: By `sessionType` (e.g., "user", "llm", "temp")  
**Consistency**: Eventual consistency for best performance  
**TTL**: Automatic cleanup after 1 hour  

## CosmosDB Architecture and Data Organization

### 1. Database and Collection Structure

```
Azure CosmosDB Account: your-dapr-cosmos-account
├── Database: dapr-workflows
│   └── Collection: workflow-state
│       ├── Partition Key: workflowId
│       ├── Documents: {id, workflowId, state, timestamp, ...}
│       └── Consistency: Strong
│
├── Database: dapr-agents  
│   └── Collection: agent-registry
│       ├── Partition Key: agentType
│       ├── Documents: {id, agentType, agentId, config, memory, ...}
│       └── Consistency: Session
│
└── Database: dapr-cache
    └── Collection: session-cache
        ├── Partition Key: sessionType
        ├── Documents: {id, sessionType, sessionId, data, ttl, ...}
        ├── Consistency: Eventual
        └── TTL: 3600 seconds
```

### 2. Document Structure Examples

#### Workflow Documents
```json
{
  "id": "workflows||workflow_instance_123||state",
  "workflowId": "workflow_instance_123",
  "value": {
    "currentStep": 3,
    "stepResults": ["step1_result", "step2_result"],
    "status": "running"
  },
  "timestamp": "2025-10-02T10:30:00Z",
  "_etag": "\"abc123\"",
  "_ts": 1696248600
}
```

#### Agent Documents
```json
{
  "id": "agents||gpt4_agent_001||config",
  "agentType": "gpt4",
  "agentId": "gpt4_agent_001", 
  "value": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "You are a helpful assistant..."
  },
  "lastUpdated": "2025-10-02T10:30:00Z"
}
```

#### Cache Documents
```json
{
  "id": "cache||user_session_456||data",
  "sessionType": "user",
  "sessionId": "user_session_456",
  "value": {
    "userId": "user123",
    "preferences": {...},
    "temporaryData": {...}
  },
  "ttl": 3600,
  "createdAt": "2025-10-02T10:30:00Z"
}
```

## Environment Configuration

### 1. Environment Variables Setup

```bash
# Workflow CosmosDB
export COSMOS_WORKFLOWS_URL="https://your-workflows-cosmos.documents.azure.com:443/"
export COSMOS_WORKFLOWS_KEY="your-workflows-primary-key"

# Agent CosmosDB  
export COSMOS_AGENTS_URL="https://your-agents-cosmos.documents.azure.com:443/"
export COSMOS_AGENTS_KEY="your-agents-primary-key"

# Cache CosmosDB
export COSMOS_CACHE_URL="https://your-cache-cosmos.documents.azure.com:443/"
export COSMOS_CACHE_KEY="your-cache-primary-key"
```

### 2. Azure CLI Setup (Optional)

```bash
# Create resource group
az group create --name dapr-cosmos-rg --location eastus

# Create CosmosDB accounts
az cosmosdb create \
  --name your-workflows-cosmos \
  --resource-group dapr-cosmos-rg \
  --kind GlobalDocumentDB \
  --consistency-policy Strong

az cosmosdb create \
  --name your-agents-cosmos \
  --resource-group dapr-cosmos-rg \
  --kind GlobalDocumentDB \
  --consistency-policy Session

az cosmosdb create \
  --name your-cache-cosmos \
  --resource-group dapr-cosmos-rg \
  --kind GlobalDocumentDB \
  --consistency-policy Eventual
```

## Framework Integration

### 1. State Store Selection Utility

```typescript
// src/utils/statestore-cosmos.ts
export interface CosmosStateStoreConfig {
  workflows: string;
  agents: string;
  cache: string;
  fallback: string;
}

export function getCosmosStateStoreConfig(): CosmosStateStoreConfig {
  const environment = process.env.NODE_ENV || 'development';
  const useCosmosDB = process.env.USE_COSMOSDB === 'true';
  
  if (environment === 'production' && useCosmosDB) {
    return {
      workflows: "statestore-workflows-cosmos",
      agents: "statestore-agents-cosmos", 
      cache: "statestore-cache-cosmos",
      fallback: "statestore"  // In-memory fallback
    };
  } else {
    // Development - use local Redis or in-memory
    return {
      workflows: "statestore-workflows",  // Redis
      agents: "statestore-agents",        // Redis
      cache: "statestore-cache",          // Redis
      fallback: "statestore"              // In-memory
    };
  }
}

export function getCosmosConfig() {
  return {
    workflowsUrl: process.env.COSMOS_WORKFLOWS_URL,
    agentsUrl: process.env.COSMOS_AGENTS_URL,
    cacheUrl: process.env.COSMOS_CACHE_URL,
    isConfigured: !!(
      process.env.COSMOS_WORKFLOWS_URL && 
      process.env.COSMOS_AGENTS_URL && 
      process.env.COSMOS_CACHE_URL
    )
  };
}
```

### 2. CosmosDB-Optimized Data Access Patterns

```typescript
// Workflow state management with CosmosDB optimization
class CosmosWorkflowStateManager {
  private stateStoreName: string;
  private daprClient: DaprClient;
  
  constructor() {
    const config = getCosmosStateStoreConfig();
    this.stateStoreName = config.workflows;
    this.daprClient = new DaprClient();
  }
  
  async saveWorkflowState(workflowId: string, state: any) {
    // CosmosDB key includes partition key for optimal routing
    const key = `workflow_${workflowId}`;
    
    await this.daprClient.state.save(this.stateStoreName, [
      {
        key,
        value: {
          ...state,
          workflowId,  // Include partition key in document
          lastUpdated: new Date().toISOString()
        },
        metadata: {
          partitionKey: workflowId  // Explicit partition key
        }
      }
    ]);
  }
  
  async getWorkflowState(workflowId: string) {
    const key = `workflow_${workflowId}`;
    
    const response = await this.daprClient.state.get(
      this.stateStoreName, 
      key,
      {
        metadata: {
          partitionKey: workflowId  // Efficient single-partition query
        }
      }
    );
    
    return response;
  }
  
  // Batch operations for efficiency
  async saveMultipleWorkflowStates(workflows: Array<{id: string, state: any}>) {
    const saveOperations = workflows.map(wf => ({
      key: `workflow_${wf.id}`,
      value: {
        ...wf.state,
        workflowId: wf.id,
        lastUpdated: new Date().toISOString()
      },
      metadata: {
        partitionKey: wf.id
      }
    }));
    
    await this.daprClient.state.save(this.stateStoreName, saveOperations);
  }
}
```

### 3. Agent Registry with CosmosDB

```typescript
// Agent management optimized for CosmosDB partitioning
class CosmosAgentRegistry {
  private stateStoreName: string;
  private daprClient: DaprClient;
  
  constructor() {
    const config = getCosmosStateStoreConfig();
    this.stateStoreName = config.agents;
    this.daprClient = new DaprClient();
  }
  
  async registerAgent(agentType: string, agentId: string, config: any) {
    const key = `agent_${agentType}_${agentId}`;
    
    await this.daprClient.state.save(this.stateStoreName, [
      {
        key,
        value: {
          agentType,    // Partition key
          agentId,
          config,
          registeredAt: new Date().toISOString(),
          status: 'active'
        },
        metadata: {
          partitionKey: agentType  // Partition by agent type
        }
      }
    ]);
  }
  
  // Query all agents of a specific type (single partition)
  async getAgentsByType(agentType: string): Promise<any[]> {
    // Note: Dapr doesn't directly support Cosmos queries, 
    // but we can use the query API if available
    try {
      const query = {
        filter: {
          EQ: { "agentType": agentType }
        }
      };
      
      const response = await this.daprClient.state.query(
        this.stateStoreName,
        query
      );
      
      return response.results;
    } catch (error) {
      console.warn('Query not supported, falling back to individual gets');
      // Fallback: would need to maintain an index of agent IDs
      return [];
    }
  }
}
```

### 4. Cache Manager with TTL

```typescript
// Cache management with CosmosDB TTL
class CosmosCacheManager {
  private stateStoreName: string;
  private daprClient: DaprClient;
  
  constructor() {
    const config = getCosmosStateStoreConfig();
    this.stateStoreName = config.cache;
    this.daprClient = new DaprClient();
  }
  
  async cacheData(
    sessionType: string, 
    sessionId: string, 
    data: any, 
    ttlSeconds: number = 3600
  ) {
    const key = `cache_${sessionType}_${sessionId}`;
    
    await this.daprClient.state.save(this.stateStoreName, [
      {
        key,
        value: {
          sessionType,  // Partition key
          sessionId,
          data,
          cachedAt: new Date().toISOString(),
          ttl: ttlSeconds  // CosmosDB will auto-delete after this time
        },
        metadata: {
          partitionKey: sessionType,
          ttlInSeconds: ttlSeconds.toString()  // Dapr TTL metadata
        }
      }
    ]);
  }
  
  async getCachedData(sessionType: string, sessionId: string) {
    const key = `cache_${sessionType}_${sessionId}`;
    
    const response = await this.daprClient.state.get(
      this.stateStoreName,
      key,
      {
        metadata: {
          partitionKey: sessionType
        }
      }
    );
    
    return response?.data || null;
  }
}
```

## Performance Optimization

### 1. Partition Key Design

**Workflow Store:**
- Partition Key: `workflowId`
- Benefits: Complete workflow isolation, efficient single-workflow queries
- Trade-off: Cross-workflow queries require multiple partitions

**Agent Store:**
- Partition Key: `agentType` 
- Benefits: Group related agents, efficient agent-type queries
- Trade-off: Hot partitions if one agent type is heavily used

**Cache Store:**
- Partition Key: `sessionType`
- Benefits: Group similar cache patterns, efficient cleanup
- Trade-off: Uneven distribution if session types vary greatly

### 2. Consistency Model Selection

```yaml
# Strong consistency for critical workflow state
consistency: "strong"        # Workflows
consistency: "session"       # Agents (good performance + consistency)
consistency: "eventual"      # Cache (best performance)
```

### 3. Request Unit (RU) Optimization

```typescript
// Monitor and optimize RU consumption
class CosmosPerformanceMonitor {
  async monitorRUConsumption(operation: string, func: () => Promise<any>) {
    const start = Date.now();
    
    try {
      const result = await func();
      const duration = Date.now() - start;
      
      console.log(`${operation} completed in ${duration}ms`);
      // Monitor RU consumption through Azure monitoring
      
      return result;
    } catch (error) {
      console.error(`${operation} failed:`, error);
      throw error;
    }
  }
}

// Usage
const monitor = new CosmosPerformanceMonitor();
await monitor.monitorRUConsumption('SaveWorkflowState', () =>
  workflowManager.saveWorkflowState(workflowId, state)
);
```

## Scaling and Geographic Distribution

### 1. Multi-Region Setup

```yaml
# Production configuration with global distribution
metadata:
- name: url
  value: "{env:COSMOS_WORKFLOWS_URL}"
- name: masterKey  
  value: "{env:COSMOS_WORKFLOWS_KEY}"
- name: preferredRegions
  value: "East US,West US,North Europe"  # Multi-region
- name: allowInsecureConnection
  value: "false"
- name: enableEndpointDiscovery
  value: "true"
```

### 2. Autoscale Configuration

```bash
# Enable autoscale on collections
az cosmosdb sql throughput update \
  --account-name your-workflows-cosmos \
  --resource-group dapr-cosmos-rg \
  --database-name dapr-workflows \
  --container-name workflow-state \
  --max-throughput 10000 \
  --throughput-type autoscale
```

### 3. Backup and Disaster Recovery

```yaml
# Enable point-in-time restore
metadata:
- name: enableAutomaticFailover
  value: "true"
- name: enableMultipleWriteLocations  
  value: "true"
- name: backupIntervalInMinutes
  value: "240"  # 4 hours
- name: backupRetentionIntervalInHours
  value: "168"  # 7 days
```

## Monitoring and Troubleshooting

### 1. Component Health Checks

```bash
# Check CosmosDB component status
curl http://localhost:3500/v1.0/components | jq '.[] | select(.name | contains("cosmos"))'

# Test each CosmosDB state store
curl -X POST http://localhost:3500/v1.0/state/statestore-workflows-cosmos \
  -H "Content-Type: application/json" \
  -d '[{"key": "test-workflow", "value": {"status": "test"}}]'

curl -X POST http://localhost:3500/v1.0/state/statestore-agents-cosmos \
  -H "Content-Type: application/json" \
  -d '[{"key": "test-agent", "value": {"type": "test"}}]'

curl -X POST http://localhost:3500/v1.0/state/statestore-cache-cosmos \
  -H "Content-Type: application/json" \
  -d '[{"key": "test-cache", "value": {"data": "test"}}]'
```

### 2. Azure Monitor Integration

```typescript
// Application Insights integration
class CosmosMonitoring {
  constructor(private appInsights: any) {}
  
  trackCosmosOperation(
    operation: string, 
    stateStore: string, 
    duration: number, 
    success: boolean
  ) {
    this.appInsights.trackDependency({
      target: stateStore,
      name: operation,
      data: `CosmosDB ${operation}`,
      duration,
      success,
      dependencyTypeName: 'Azure CosmosDB'
    });
  }
}
```

### 3. Common Issues and Solutions

**Issue**: High RU consumption
```yaml
# Solution: Optimize partition key and queries
metadata:
- name: indexingPolicy
  value: '{"indexingMode": "consistent", "automatic": true}'
```

**Issue**: Hot partitions
```typescript
// Solution: Better partition key distribution
const partitionKey = `${agentType}_${hash(agentId) % 10}`;  // Distribute load
```

**Issue**: Cross-partition queries
```typescript
// Solution: Use query API or maintain secondary indexes
const query = {
  filter: {
    EQ: { "status": "active" }
  },
  sort: [
    { key: "lastUpdated", order: "DESC" }
  ]
};
```

## Cost Optimization

### 1. Reserved Capacity

```bash
# Purchase reserved capacity for predictable workloads
az cosmosdb sql restorable-resource show \
  --location "East US" \
  --account-name your-workflows-cosmos
```

### 2. Serverless vs Provisioned

```yaml
# Serverless for low-volume workloads
metadata:
- name: throughputType
  value: "serverless"

# Provisioned for predictable workloads  
metadata:
- name: throughputType
  value: "provisioned"
- name: requestUnits
  value: "400"
```

### 3. TTL for Cost Management

```yaml
# Automatic cleanup reduces storage costs
metadata:
- name: defaultTtlInSeconds
  value: "604800"  # 7 days for logs
```

## Summary

Multiple CosmosDB state stores provide:

1. **Global Scale**: Worldwide distribution with multiple consistency models
2. **Data Isolation**: Separate databases/collections for different data types
3. **Performance Optimization**: Optimized partition keys and consistency models per use case
4. **Enterprise Features**: Backup, disaster recovery, security, compliance
5. **Cost Flexibility**: Serverless and provisioned options
6. **Rich Querying**: SQL-like queries and indexing capabilities

The key advantages over Redis:
- **Global Distribution**: Multi-region replication
- **Elastic Scale**: Automatic scaling based on demand  
- **Enterprise Security**: Built-in encryption, RBAC, private endpoints
- **Rich Data Model**: JSON documents with complex querying
- **Managed Service**: No infrastructure management required

Each CosmosDB state store operates independently with its own database, collection, partition strategy, and consistency model - providing powerful data organization and global scale capabilities!