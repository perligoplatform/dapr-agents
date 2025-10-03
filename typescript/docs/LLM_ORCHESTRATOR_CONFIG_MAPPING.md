# LLM Orchestrator Configuration Usage Mapping

## Configuration Settings and Their Usage Paths

### 1. `name: "LLMOrchestrator"`

**Purpose**: Identifies the orchestrator instance for logging and state management

**Usage Paths:**
```typescript
// File: src/workflow/orchestrators/llm/orchestrator.ts
// Constructor - Line ~60
export class LLMOrchestrator extends OrchestratorWorkflowBase {
  constructor(config: LLMOrchestratorConfig) {
    super(config); // Passes name to base class
    
// File: src/workflow/orchestrators/base.ts  
// Base class constructor - Line ~45
export class OrchestratorWorkflowBase extends WorkflowApp {
  public readonly name: string;
  
  constructor(config: OrchestratorWorkflowConfig) {
    super(config);
    this.name = config.name; // Stored as instance property
```

**Runtime Usage:**
```typescript
// Used in logging throughout the orchestrator
console.log(`🧠 ${this.name} created successfully`);

// Used in state management for instance identification
this.state.instances[instanceId] = {
  orchestratorName: this.name, // Included in state
  // ... other state properties
};
```

**Dapr Mapping**: Not directly mapped to Dapr components, used for internal identification

---

### 2. `messageBusName: "messagepubsub"`

**Purpose**: Specifies which Dapr pub/sub component to use for agent communication

**Usage Paths:**
```typescript
// File: src/workflow/orchestrators/base.ts
// Stored in base class - Line ~50
public readonly messageBusName: string;

constructor(config: OrchestratorWorkflowConfig) {
  this.messageBusName = config.messageBusName;
```

**Runtime Usage:**
```typescript
// File: src/workflow/orchestrators/llm/orchestrator.ts
// Method: broadcastMessageToAgents - Line ~450
async broadcastMessageToAgents(input: any): Promise<void> {
  const daprClient = new DaprClient();
  
  await daprClient.pubsub.publish(
    this.messageBusName,  // Uses "messagepubsub" 
    this.broadcastTopicName,  // Topic within the pub/sub
    input.message
  );
}

// Method: triggerAgentTask - Line ~380
async triggerAgentTask(input: any): Promise<any> {
  await daprClient.pubsub.publish(
    this.messageBusName,  // "messagepubsub"
    `agent_${input.agentName}`, // Agent-specific topic
    taskMessage
  );
}
```

**Dapr Mapping**: 
- **Component File**: `components/messagepubsub-inmemory.yaml` or `components/messagepubsub.yaml`
- **Component Type**: `pubsub.redis` or `pubsub.in-memory`
- **Runtime**: Dapr resolves "messagepubsub" to the configured pub/sub component

---

### 3. `stateStoreName: "workflowstatestore"`

**Purpose**: Specifies which Dapr state store to use for workflow state persistence

**Usage Paths:**
```typescript
// File: src/workflow/orchestrators/base.ts
// Stored in base class - Line ~52
public readonly stateStoreName: string;

constructor(config: OrchestratorWorkflowConfig) {
  this.stateStoreName = config.stateStoreName;
```

**Runtime Usage:**
```typescript
// File: src/workflow/orchestrators/llm/orchestrator.ts
// Method: saveWorkflowState - Line ~520
async saveWorkflowState(instanceId: string): Promise<void> {
  const daprClient = new DaprClient();
  
  await daprClient.state.save(
    this.stateStoreName,  // "workflowstatestore"
    [
      {
        key: `${this.stateKey}_${instanceId}`, // "workflow_state_instance123"
        value: this.state.instances[instanceId]
      }
    ]
  );
}

// Method: loadWorkflowState - Line ~540
async loadWorkflowState(instanceId: string): Promise<LLMWorkflowInstance | null> {
  const daprClient = new DaprClient();
  
  const result = await daprClient.state.get(
    this.stateStoreName,  // "workflowstatestore"
    `${this.stateKey}_${instanceId}`  // "workflow_state_instance123"
  );
  
  return result || null;
}
```

**Dapr Mapping**:
- **Component File**: `components/statestore.yaml`
- **Component Type**: `state.in-memory` or `state.redis`
- **Runtime**: Dapr resolves "workflowstatestore" to the configured state store component

---

### 4. `stateKey: "workflow_state"`

**Purpose**: Base key prefix for storing workflow state in the state store

**Usage Paths:**
```typescript
// File: src/workflow/orchestrators/base.ts
// Stored in base class - Line ~54
public readonly stateKey: string;

constructor(config: OrchestratorWorkflowConfig) {
  this.stateKey = config.stateKey;
```

**Runtime Usage:**
```typescript
// Combined with instance ID to create unique keys
const fullStateKey = `${this.stateKey}_${instanceId}`;
// Result: "workflow_state_marketing-workflow-001"

// Used in all state operations:
await daprClient.state.save(this.stateStoreName, [
  {
    key: fullStateKey,  // "workflow_state_marketing-workflow-001"
    value: workflowData
  }
]);

// Also used for querying state
const state = await daprClient.state.get(this.stateStoreName, fullStateKey);
```

**Key Generation Pattern**:
```
Base Key + Instance ID = Full State Key
"workflow_state" + "_" + "marketing-workflow-001" = "workflow_state_marketing-workflow-001"
```

---

### 5. `agentsRegistryStoreName: "agentstatestore"`

**Purpose**: Specifies which Dapr state store contains the agent registry/metadata

**Usage Paths:**
```typescript
// File: src/workflow/orchestrators/base.ts
// Stored in base class - Line ~56
public readonly agentsRegistryStoreName: string;

constructor(config: OrchestratorWorkflowConfig) {
  this.agentsRegistryStoreName = config.agentsRegistryStoreName;
```

**Runtime Usage:**
```typescript
// File: src/workflow/orchestrators/llm/orchestrator.ts
// Method: getAgentsMetadataAsString - Line ~280
async getAgentsMetadataAsString(input: any): Promise<string> {
  const daprClient = new DaprClient();
  
  // Retrieve agent registry from specified state store
  const agentsData = await daprClient.state.get(
    this.agentsRegistryStoreName,  // "agentstatestore"
    this.agentsRegistryKey         // "agents_registry"
  );
  
  if (!agentsData) {
    return "No agents currently registered.";
  }
  
  // Format agent metadata for LLM consumption
  return this.formatAgentsMetadata(agentsData);
}

// Method: updateAgentRegistry - Line ~310
async updateAgentRegistry(agentInfo: AgentMetadata): Promise<void> {
  const daprClient = new DaprClient();
  
  // Get current registry
  const currentRegistry = await daprClient.state.get(
    this.agentsRegistryStoreName,  // "agentstatestore"
    this.agentsRegistryKey         // "agents_registry"
  ) || {};
  
  // Update registry
  currentRegistry[agentInfo.name] = agentInfo;
  
  // Save back to state store
  await daprClient.state.save(this.agentsRegistryStoreName, [
    {
      key: this.agentsRegistryKey,
      value: currentRegistry
    }
  ]);
}
```

**Dapr Mapping**:
- **Component File**: `components/agentstatestore.yaml` (separate from workflow state)
- **Component Type**: `state.in-memory` or `state.redis`
- **Runtime**: Dapr resolves "agentstatestore" to the agent registry state store component

---

### 6. `agentsRegistryKey: "agents_registry"`

**Purpose**: Specific key within the agent state store that contains agent metadata

**Usage Paths:**
```typescript
// File: src/workflow/orchestrators/base.ts
// Stored in base class - Line ~58
public readonly agentsRegistryKey: string;

constructor(config: OrchestratorWorkflowConfig) {
  this.agentsRegistryKey = config.agentsRegistryKey;
```

**Runtime Usage:**
```typescript
// Always used as the exact key for agent registry operations
await daprClient.state.get(
  this.agentsRegistryStoreName,  // "agentstatestore" 
  this.agentsRegistryKey         // "agents_registry"
);

// Registry structure stored at this key:
{
  "ResearchAgent": {
    "name": "ResearchAgent",
    "capabilities": ["market-research", "competitive-analysis"],
    "status": "available",
    "lastSeen": "2025-10-02T14:30:00Z"
  },
  "ContentWriter": {
    "name": "ContentWriter", 
    "capabilities": ["copywriting", "content-creation"],
    "status": "busy",
    "lastSeen": "2025-10-02T14:25:00Z"
  }
}
```

**Storage Pattern**:
```
State Store: "agentstatestore"
Key: "agents_registry"
Value: { agentName: agentMetadata, ... }
```

---

### 7. `broadcastTopicName: "beacon_channel"`

**Purpose**: Pub/sub topic name for broadcasting messages to all agents

**Usage Paths:**
```typescript
// File: src/workflow/orchestrators/base.ts
// Stored in base class - Line ~60
public readonly broadcastTopicName: string;

constructor(config: OrchestratorWorkflowConfig) {
  this.broadcastTopicName = config.broadcastTopicName;
```

**Runtime Usage:**
```typescript
// File: src/workflow/orchestrators/llm/orchestrator.ts
// Method: broadcastMessageToAgents - Line ~450
async broadcastMessageToAgents(input: any): Promise<void> {
  const daprClient = new DaprClient();
  
  const broadcastMessage = {
    type: 'workflow_announcement',
    instanceId: input.instanceId,
    message: input.message,
    timestamp: new Date().toISOString(),
    orchestrator: this.name
  };
  
  // Publish to broadcast topic - all agents listening here
  await daprClient.pubsub.publish(
    this.messageBusName,        // "messagepubsub"
    this.broadcastTopicName,    // "beacon_channel"
    broadcastMessage
  );
  
  console.log(`📡 Broadcast sent to ${this.broadcastTopicName}`);
}

// Method: announceWorkflowStart - Line ~480
async announceWorkflowStart(instanceId: string, task: string): Promise<void> {
  const announcement = {
    type: 'workflow_started',
    instanceId,
    task,
    orchestrator: this.name,
    timestamp: new Date().toISOString()
  };
  
  await daprClient.pubsub.publish(
    this.messageBusName,        // "messagepubsub"  
    this.broadcastTopicName,    // "beacon_channel"
    announcement
  );
}
```

**Agent Subscription Pattern**:
```typescript
// Agents subscribe to the broadcast topic like this:
await daprClient.pubsub.subscribe(
  "messagepubsub",    // Same pub/sub component
  "beacon_channel",   // Same broadcast topic
  (message) => {
    // All agents receive workflow announcements
    this.handleWorkflowAnnouncement(message);
  }
);
```

---

## Component Resolution Flow

### 1. **Configuration to Dapr Component Mapping**
```
Configuration Value → Dapr Component Name → Actual Component
"messagepubsub"    → messagepubsub        → Redis Pub/Sub or In-Memory
"workflowstatestore" → statestore         → Redis State or In-Memory  
"agentstatestore"  → agentstatestore      → Redis State or In-Memory
```

### 2. **Runtime Resolution Process**
```typescript
// When orchestrator starts:
1. Configuration loaded with component names
2. Dapr validates component existence at startup
3. Components initialized and connectivity tested
4. Orchestrator ready to use components by name

// During execution:
await daprClient.state.save("workflowstatestore", [...]);
                          ↓
            Dapr resolves to actual state store component
                          ↓
                 Operation executed on backend store
```

### 3. **Topic and Key Namespace Organization**
```
Pub/Sub Topics:
- "beacon_channel"           → Broadcast to all agents
- "agent_ResearchAgent"      → Direct messages to ResearchAgent  
- "agent_ContentWriter"      → Direct messages to ContentWriter

State Store Keys:
- "workflow_state_instance1" → Workflow instance 1 state
- "workflow_state_instance2" → Workflow instance 2 state  
- "agents_registry"          → Agent metadata registry
```

This mapping shows how configuration values flow through the codebase to actual Dapr component operations, providing the complete traceability from config to runtime execution.