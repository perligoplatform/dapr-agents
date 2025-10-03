/**
 * Workflow mixins providing reusable functionality using TypeScript composition pattern.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/__init__.py
 * 
 * This module exports all workflow mixins that provide additional capabilities
 * to workflow classes through composition rather than inheritance.
 * 
 * Each mixin follows the hybrid pattern:
 * - Interface defining required capabilities
 * - Static helper class with methods
 * - Context interface for dependency injection
 * 
 * Usage Example:
 * ```typescript
 * class MyWorkflow implements MessagingCapable, PubSubCapable {
 *   // ... implement required properties and methods ...
 *   
 *   async broadcastMessage(message: any, context: MessagingContext) {
 *     return MessagingMixin.broadcastMessage.call(this, context, message);
 *   }
 * }
 * ```
 */

// Import types for re-export
import type { MessagingCapable, MessagingContext } from './messaging';
import type { PubSubCapable, PubSubContext } from './pubsub';
import type { ServiceCapable, ServiceContext } from './service';
import type { StateManagementCapable, StateManagementContext } from './state';

// Export all mixin interfaces and classes
export {
  MessagingMixin,
  type MessagingCapable,
  type MessagingContext,
  type BroadcastOptions
} from './messaging';

export {
  PubSubMixin,
  type PubSubCapable,
  type PubSubContext,
  type HandlerEntry,
  type CloudEventMetadata,
  type MessageWithMetadata
} from './pubsub';

export {
  ServiceMixin,
  type ServiceCapable,
  type ServiceContext,
  type HttpServerBase,
  type RouteMetadata
} from './service';

export {
  StateManagementMixin,
  type StateManagementCapable,
  type StateManagementContext,
  type StateStoreClient
} from './state';

// Re-export all capability interfaces for easier import
export type WorkflowCapabilities = 
  & MessagingCapable 
  & PubSubCapable 
  & ServiceCapable 
  & StateManagementCapable;
  
// Re-export all context interfaces for easier import
export type WorkflowContexts = 
  & MessagingContext 
  & PubSubContext 
  & ServiceContext 
  & StateManagementContext;