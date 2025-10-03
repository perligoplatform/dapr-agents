# Dapr Workflow Orchestrator Process

## Overview

A Dapr workflow orchestrator is the central coordinator that manages the execution of complex, distributed workflows. It handles task sequencing, state management, error recovery, and ensures reliable execution across potentially long-running processes.

## Core Components

### 1. Workflow Runtime
- **Purpose**: The runtime engine that executes workflow orchestrator functions
- **Responsibilities**:
  - Load and register workflow definitions
  - Manage workflow instances and their lifecycle
  - Handle durable execution and state persistence
  - Coordinate with the actor runtime for reliable messaging

### 2. Workflow Orchestrator Function
- **Definition**: A function that defines the workflow logic and task sequence
- **Characteristics**:
  - Must be deterministic (same inputs = same outputs)
  - Cannot perform I/O operations directly
  - Communicates only through the workflow context
  - Can be replayed multiple times during execution

### 3. Activities (Tasks)
- **Purpose**: Individual units of work that perform actual business logic
- **Characteristics**:
  - Can perform I/O operations (HTTP calls, database operations, etc.)
  - Should be idempotent when possible
  - Return results to the orchestrator
  - Can fail and be retried

### 4. Workflow Context
- **Role**: The communication bridge between orchestrator and activities
- **Provides**:
  - `callActivity()` - Execute individual tasks
  - `scheduleTimer()` - Add delays or timeouts
  - `waitForExternalEvent()` - Wait for external triggers
  - Current time, instance ID, and other metadata

## Orchestrator Execution Process

### Phase 1: Workflow Initialization
```
1. Client calls scheduleNewWorkflow()
2. Workflow runtime creates new instance with unique ID
3. Orchestrator function begins first execution
4. Workflow context is initialized with instance state
```

### Phase 2: Task Orchestration
```
1. Orchestrator calls ctx.callActivity('task-name', input)
2. Runtime dispatches task to registered activity function
3. Activity executes business logic and returns result
4. Runtime persists task completion and result
5. Orchestrator receives result and continues execution
```

### Phase 3: State Persistence & Replay
```
1. After each activity completion, state is persisted
2. If workflow is interrupted, runtime can replay from last state
3. Orchestrator function re-executes but skips completed activities
4. Deterministic execution ensures consistent replay behavior
```

### Phase 4: Completion or Error Handling
```
1. Orchestrator completes all tasks and returns final result
2. Runtime marks workflow as completed
3. Cleanup resources and notify waiting clients
4. Or handle errors with retry logic and compensation
```

## Technical Implementation Details

### Actor Runtime Integration
- Workflows are built on top of Dapr's actor framework
- Each workflow instance is backed by a virtual actor
- Provides reliable messaging and state persistence
- Handles automatic load balancing and failover

### State Store Requirements
- Workflows require a configured state store with actor runtime support
- State includes:
  - Workflow instance metadata
  - Activity execution history
  - Pending timers and external events
  - Current execution position

### Deterministic Execution Rules
- Orchestrator functions must be deterministic
- Cannot use:
  - `Date.now()` or random numbers
  - Direct I/O operations
  - Non-deterministic APIs
- Must use:
  - Workflow context for all external interactions
  - Deterministic logic and calculations

## Workflow Lifecycle States

### 1. **Pending** - Scheduled but not yet started
### 2. **Running** - Currently executing orchestrator logic
### 3. **Completed** - Successfully finished with result
### 4. **Failed** - Terminated due to unhandled error
### 5. **Terminated** - Manually stopped by external request
### 6. **Suspended** - Paused waiting for external event

## Error Handling & Resilience

### Automatic Retry Logic
- Activities can be configured with retry policies
- Exponential backoff and maximum retry limits
- Different retry strategies for different error types

### Compensation Patterns
- Workflows can implement compensation activities
- Rollback completed work when later steps fail
- Maintain data consistency across distributed operations

### Timeout Management
- Workflows can set timeouts for individual activities
- Overall workflow timeout to prevent infinite execution
- Graceful handling of timeout scenarios

## Communication Patterns

### Synchronous Activity Calls
```typescript
const result = await ctx.callActivity('processPayment', paymentData);
```

### Parallel Task Execution
```typescript
const tasks = [
  ctx.callActivity('sendEmail', emailData),
  ctx.callActivity('updateInventory', inventoryData),
  ctx.callActivity('logTransaction', logData)
];
const results = await Promise.all(tasks);
```

### External Event Handling
```typescript
const approvalEvent = await ctx.waitForExternalEvent('approval');
if (approvalEvent.approved) {
  await ctx.callActivity('processApproval', approvalEvent.data);
}
```

### Timer-Based Delays
```typescript
await ctx.scheduleTimer(new Date(Date.now() + 60000)); // Wait 1 minute
```

## Best Practices

### Orchestrator Design
1. **Keep orchestrators simple** - Complex logic belongs in activities
2. **Make activities idempotent** - Safe to retry multiple times
3. **Use meaningful task names** - Clear activity identification
4. **Handle all error scenarios** - Graceful degradation patterns
5. **Minimize state size** - Only persist necessary data

### Performance Considerations
1. **Batch related operations** - Reduce number of activity calls
2. **Use parallel execution** - When tasks are independent
3. **Implement circuit breakers** - Prevent cascading failures
4. **Monitor workflow metrics** - Execution time, failure rates
5. **Set appropriate timeouts** - Balance reliability and performance

### Security & Compliance
1. **Encrypt sensitive data** - In state store and during transit
2. **Implement audit logging** - Track workflow execution history
3. **Use secure communication** - TLS for all Dapr interactions
4. **Apply least privilege** - Minimal permissions for activities
5. **Validate all inputs** - Prevent injection attacks

## Example Workflow Pattern

```typescript
// Order Processing Orchestrator
async function orderProcessingWorkflow(ctx: WorkflowContext, order: Order) {
  // 1. Validate order
  const validation = await ctx.callActivity('validateOrder', order);
  if (!validation.isValid) {
    throw new Error(`Order validation failed: ${validation.errors}`);
  }

  // 2. Reserve inventory
  const reservation = await ctx.callActivity('reserveInventory', order.items);
  
  try {
    // 3. Process payment
    const payment = await ctx.callActivity('processPayment', {
      amount: order.total,
      customerId: order.customerId
    });

    // 4. Parallel fulfillment tasks
    const fulfillmentTasks = [
      ctx.callActivity('updateInventory', reservation.reservationId),
      ctx.callActivity('scheduleShipping', order),
      ctx.callActivity('sendConfirmationEmail', { order, payment })
    ];
    
    await Promise.all(fulfillmentTasks);

    return {
      orderId: order.id,
      status: 'completed',
      paymentId: payment.id,
      estimatedDelivery: fulfillmentTasks[1].estimatedDate
    };

  } catch (error) {
    // Compensation: Release reserved inventory
    await ctx.callActivity('releaseInventory', reservation.reservationId);
    throw error;
  }
}
```

This orchestrator demonstrates the key patterns of workflow design: validation, resource reservation, parallel execution, error handling, and compensation logic.