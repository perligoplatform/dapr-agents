/**
 * Messaging utility functions for CloudEvent processing and message validation.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/messaging.py
 * 
 * Provides utility functions for:
 * - CloudEvent metadata extraction and processing
 * - Message model validation with Zod schemas
 * - Type hint extraction for union types
 * - Message routing and parsing
 */

import { z } from 'zod';
import { isZodSchema, isSupportedModel, getTypeName } from './core';

// Type definitions for CloudEvent processing
export interface EventMessageMetadata {
  id?: string;
  dataContentType?: string;
  pubSubName?: string;
  source?: string;
  specVersion?: string;
  time?: string;
  topic?: string;
  traceId?: string;
  traceParent?: string;
  type?: string;
  traceState?: string;
  headers?: Record<string, any>;
}

export interface SubscriptionMessage {
  id(): string;
  dataContentType(): string;
  pubSubName(): string;
  source(): string;
  specVersion(): string;
  topic(): string;
  type(): string;
  data(): any;
  extensions(): Record<string, any>;
}

/**
 * Extracts one or more message types from a type hint or union.
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/messaging.py:11-23 (extract_message_models)
 * 
 * Supports:
 * - Single type hint: `MyMessageSchema`
 * - Union types: `z.union([MessageA, MessageB])`
 * - Array of types: `[MessageA, MessageB]`
 * - Fallback to empty array if not valid
 * 
 * @param typeHint - The type hint to extract message types from
 * @returns Array of message types
 */
export function extractMessageModels(typeHint: any): any[] {
  if (!typeHint) {
    return [];
  }
  
  // Handle Zod union types
  if (isZodSchema(typeHint) && (typeHint as any)._def?.typeName === 'ZodUnion') {
    const def = (typeHint as any)._def;
    return def.options || [];
  }
  
  // Handle array of types
  if (Array.isArray(typeHint)) {
    return typeHint;
  }
  
  // Handle single type
  if (isSupportedModel(typeHint)) {
    return [typeHint];
  }
  
  return [];
}

/**
 * Extracts CloudEvent metadata and raw payload data from a message.
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/messaging.py:26-67 (extract_cloudevent_data)
 * 
 * @param message - The raw message received from pub/sub (SubscriptionMessage or plain object)
 * @returns Tuple of [event_data, metadata] where event_data is the message payload, and metadata is the parsed CloudEvent metadata
 * @throws Error if message type is unsupported
 */
export function extractCloudEventData(
  message: SubscriptionMessage | Record<string, any>
): { eventData: any; metadata: EventMessageMetadata } {
  let metadata: EventMessageMetadata;
  let eventData: any;
  
  // Handle Dapr SubscriptionMessage interface
  if (message && typeof (message as SubscriptionMessage).id === 'function') {
    const subscriptionMsg = message as SubscriptionMessage;
    metadata = {
      id: subscriptionMsg.id(),
      dataContentType: subscriptionMsg.dataContentType(),
      pubSubName: subscriptionMsg.pubSubName(),
      source: subscriptionMsg.source(),
      specVersion: subscriptionMsg.specVersion(),
      time: undefined,
      topic: subscriptionMsg.topic(),
      traceId: undefined,
      traceParent: undefined,
      type: subscriptionMsg.type(),
      traceState: undefined,
      headers: subscriptionMsg.extensions(),
    };
    eventData = subscriptionMsg.data();
  }
  // Handle plain object message
  else if (typeof message === 'object' && message !== null) {
    const msgObj = message as Record<string, any>;
    metadata = {
      id: msgObj.id,
      dataContentType: msgObj.datacontenttype || msgObj.dataContentType,
      pubSubName: msgObj.pubsubname || msgObj.pubSubName,
      source: msgObj.source,
      specVersion: msgObj.specversion || msgObj.specVersion,
      time: msgObj.time,
      topic: msgObj.topic,
      traceId: msgObj.traceid || msgObj.traceId,
      traceParent: msgObj.traceparent || msgObj.traceParent,
      type: msgObj.type,
      traceState: msgObj.tracestate || msgObj.traceState,
      headers: msgObj.extensions || {},
    };
    eventData = msgObj.data || {};
  }
  else {
    throw new Error(`Unexpected message type: ${typeof message}`);
  }
  
  return { eventData, metadata };
}

/**
 * Validates and parses event data against the provided message model.
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/messaging.py:70-99 (validate_message_model)
 * 
 * @param model - The message model class (Zod schema, constructor function, or Object)
 * @param eventData - The raw event payload data
 * @returns An instance of the message model (or raw object if model is Object)
 * @throws Error if the model is not supported or validation fails
 */
export function validateMessageModel(model: any, eventData: any): any {
  if (!isSupportedModel(model)) {
    throw new Error(`Unsupported model type: ${getTypeName(model)}`);
  }
  
  try {
    const modelName = getTypeName(model);
    console.log(`Validating payload with model '${modelName}'...`);
    
    // Handle plain Object (equivalent to Python dict)
    if (model === Object || model === 'object') {
      return eventData;
    }
    
    // Handle Zod schemas (equivalent to Pydantic models)
    if (isZodSchema(model)) {
      return model.parse(eventData);
    }
    
    // Handle constructor functions (equivalent to dataclasses)
    if (typeof model === 'function' && model.prototype) {
      return new model(eventData);
    }
    
    // Fallback to returning the raw data
    return eventData;
    
  } catch (error) {
    const modelName = getTypeName(model);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Message validation failed for model '${modelName}': ${errorMessage}`);
    throw new Error(`Message validation failed: ${errorMessage}`);
  }
}

/**
 * Parses and validates a CloudEvent from a message.
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/messaging.py:102-154 (parse_cloudevent)
 * 
 * This combines both metadata extraction and message model validation for direct use.
 * 
 * @param message - The incoming pub/sub message (SubscriptionMessage or plain object)
 * @param model - The schema used to validate the message body
 * @returns Tuple of [validated_message, metadata] - the validated message and its metadata
 * @throws Error if metadata extraction or validation fails
 */
export function parseCloudEvent(
  message: SubscriptionMessage | Record<string, any>,
  model?: any
): { validatedMessage: any; metadata: EventMessageMetadata } {
  try {
    const { eventData, metadata } = extractCloudEventData(message);
    
    if (!model) {
      throw new Error('Message validation failed: No model provided.');
    }
    
    const validatedMessage = validateMessageModel(model, eventData);
    
    console.log('Message successfully parsed and validated');
    console.debug(`Data: ${JSON.stringify(validatedMessage)}`);
    console.debug(`Metadata: ${JSON.stringify(metadata)}`);
    
    return { validatedMessage, metadata };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to parse CloudEvent: ${errorMessage}`);
    throw new Error(`Invalid CloudEvent: ${errorMessage}`);
  }
}

/**
 * Create CloudEvent metadata for publishing.
 * 
 * @param options - CloudEvent metadata options
 * @returns Formatted CloudEvent metadata
 */
export function createCloudEventMetadata(options: {
  type: string;
  source: string;
  id?: string;
  dataContentType?: string;
  time?: string;
  [key: string]: any;
}): Record<string, any> {
  const metadata: Record<string, any> = {
    'cloudevent.type': options.type,
    'cloudevent.source': options.source,
  };
  
  if (options.id) {
    metadata['cloudevent.id'] = options.id;
  }
  
  if (options.dataContentType) {
    metadata['cloudevent.datacontenttype'] = options.dataContentType;
  }
  
  if (options.time) {
    metadata['cloudevent.time'] = options.time;
  }
  
  // Add any additional properties
  for (const [key, value] of Object.entries(options)) {
    if (!['type', 'source', 'id', 'dataContentType', 'time'].includes(key)) {
      metadata[key] = value;
    }
  }
  
  return metadata;
}

/**
 * Serialize a message to JSON format.
 * 
 * @param message - The message content to serialize
 * @returns JSON string of the message
 * @throws Error if the message is not serializable
 */
export function serializeMessage(message: any): string {
  try {
    return JSON.stringify(message ?? {});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Message contains non-serializable data: ${errorMessage}`);
  }
}

/**
 * Deserialize a JSON message.
 * 
 * @param jsonMessage - The JSON string to deserialize
 * @returns Parsed message object
 * @throws Error if the JSON is invalid
 */
export function deserializeMessage(jsonMessage: string): any {
  try {
    return JSON.parse(jsonMessage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON message: ${errorMessage}`);
  }
}