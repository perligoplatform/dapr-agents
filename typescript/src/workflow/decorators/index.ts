/**
 * Workflow decorators for TypeScript
 * 
 * This module provides decorator factory functions that replicate the functionality
 * of Python decorators for tasks, workflows, FastAPI routes, and message handlers.
 * 
 * PYTHON EQUIVALENT: dapr_agents.workflow.decorators package
 */

// Core decorators
export {
  task,
  taskWithDescription,
  workflow,
  isTaskFunction,
  isWorkflowFunction,
  getTaskConfig,
  getWorkflowConfig,
  discoverTasks,
  discoverWorkflows,
  type TaskConfig,
  type TaskMetadata,
  type WorkflowConfig,
  type WorkflowMetadata,
} from './core.js';

// FastAPI route decorators
export {
  route,
  get,
  post,
  put,
  patch,
  del,
  isRouteFunction,
  getRouteConfig,
  discoverRoutes,
  type RouteConfig,
  type RouteMetadata,
} from './fastapi.js';

// Messaging decorators
export {
  messageRouter,
  isMessageHandlerFunction,
  getMessageRouterConfig,
  getMessageTypes,
  getMessageSchemas,
  isBroadcastHandler,
  discoverMessageHandlers,
  type MessageRouterConfig,
  type MessageRouterMetadata,
} from './messaging.js';

// Import for internal use
import {
  discoverTasks,
  discoverWorkflows,
  isTaskFunction,
  isWorkflowFunction,
  getTaskConfig,
  getWorkflowConfig,
} from './core.js';
import {
  discoverRoutes,
  isRouteFunction,
  getRouteConfig,
} from './fastapi.js';
import {
  discoverMessageHandlers,
  isMessageHandlerFunction,
  getMessageRouterConfig,
} from './messaging.js';

/**
 * Discover all decorated functions from a target object
 * PYTHON EQUIVALENT: Combined discovery from WorkflowApp methods
 */
export function discoverAll(target: any) {
  return {
    tasks: discoverTasks(target),
    workflows: discoverWorkflows(target),
    routes: discoverRoutes(target),
    messageHandlers: discoverMessageHandlers(target),
  };
}

/**
 * Check if a function has any workflow-related decorators
 */
export function isDecoratedFunction(func: any): boolean {
  return (
    isTaskFunction(func) ||
    isWorkflowFunction(func) ||
    isRouteFunction(func) ||
    isMessageHandlerFunction(func)
  );
}

/**
 * Get all metadata from a decorated function
 */
export function getMetadata(func: any): Record<string, any> {
  const metadata: Record<string, any> = {};

  if (isTaskFunction(func)) {
    metadata.task = getTaskConfig(func);
  }
  
  if (isWorkflowFunction(func)) {
    metadata.workflow = getWorkflowConfig(func);
  }
  
  if (isRouteFunction(func)) {
    metadata.route = getRouteConfig(func);
  }
  
  if (isMessageHandlerFunction(func)) {
    metadata.messageRouter = getMessageRouterConfig(func);
  }

  return metadata;
}