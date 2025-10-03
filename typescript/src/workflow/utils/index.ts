/**
 * Workflow utilities providing helper functions for validation, introspection, and messaging.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/__init__.py
 * 
 * This module exports utility functions used throughout the workflow system:
 * - Core validation and type checking utilities
 * - CloudEvent processing and message validation
 * - Method discovery and decorator introspection
 * - Message serialization and parsing
 */

// Export core utilities
export {
  isZodSchema,
  isSupportedModel,
  isValidRoutableModel,
  getDecoratedMethods,
  isFunction,
  isPlainObject,
  getTypeName,
  deepClone
} from './core';

// Export messaging utilities
export {
  extractMessageModels,
  extractCloudEventData,
  validateMessageModel,
  parseCloudEvent,
  createCloudEventMetadata,
  serializeMessage,
  deserializeMessage,
  type EventMessageMetadata,
  type SubscriptionMessage
} from './messaging';

// Import for convenience objects
import {
  isSupportedModel,
  isValidRoutableModel,
  getTypeName
} from './core';

import {
  extractCloudEventData,
  validateMessageModel,
  parseCloudEvent,
  createCloudEventMetadata,
  serializeMessage,
  deserializeMessage
} from './messaging';

// Re-export commonly used combinations
export type MessageValidation = {
  isSupported: typeof isSupportedModel;
  isRoutable: typeof isValidRoutableModel;
  validate: typeof validateMessageModel;
  getTypeName: typeof getTypeName;
};

export type CloudEventProcessing = {
  extract: typeof extractCloudEventData;
  parse: typeof parseCloudEvent;
  createMetadata: typeof createCloudEventMetadata;
  serialize: typeof serializeMessage;
  deserialize: typeof deserializeMessage;
};

// Convenience object with all message validation functions
export const MessageValidationUtils: MessageValidation = {
  isSupported: isSupportedModel,
  isRoutable: isValidRoutableModel,
  validate: validateMessageModel,
  getTypeName: getTypeName,
};

// Convenience object with all CloudEvent processing functions
export const CloudEventUtils: CloudEventProcessing = {
  extract: extractCloudEventData,
  parse: parseCloudEvent,
  createMetadata: createCloudEventMetadata,
  serialize: serializeMessage,
  deserialize: deserializeMessage,
};