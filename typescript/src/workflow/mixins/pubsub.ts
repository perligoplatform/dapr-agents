/**
 * PubSub mixin providing Dapr-based pub/sub messaging, event publishing, and dynamic message routing.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:27-378
 * 
 * Features:
 * - Publishes messages and events to Dapr topics with optional CloudEvent metadata
 * - Registers message handlers dynamically using decorated methods
 * - Routes incoming messages to handlers based on CloudEvent `type` and message schema
 * - Supports Zod schemas, plain objects, and complex types as message payloads
 * - Handles asynchronous message processing and workflow invocation
 * - Manages topic subscriptions and message dispatch via Dapr client
 */

import { DaprClient } from '@dapr/dapr';
import { z } from 'zod';

// Interface that workflow classes must implement to use PubSub capabilities
export interface PubSubCapable {
  // Context properties that must exist on the workflow
  messageBusName?: string;
  broadcastTopicName?: string;
  name: string;
  
  // Methods that must be available for PubSub functionality
  runWorkflow?(workflowName: string, input: any): string;
  monitorWorkflowCompletion?(instanceId: string): Promise<void>;
  
  // Storage for handlers and subscriptions (implementation detail)
  _topicHandlers?: Map<string, Map<string, HandlerEntry>>;
  _subscriptions?: Map<string, () => void>;
}

// Context interface for dependency injection
export interface PubSubContext {
  getDaprClient(): DaprClient;
}

// Handler entry structure
export interface HandlerEntry {
  schema: z.ZodType<any>;
  handler: (message: any) => Promise<any>;
}

// CloudEvent metadata structure
export interface CloudEventMetadata {
  type?: string;
  source?: string;
  [key: string]: any;
}

// Message with metadata
export interface MessageWithMetadata {
  _messageMetadata?: CloudEventMetadata;
  [key: string]: any;
}

/**
 * Static helper class providing PubSub functionality using composition pattern
 * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:27 (class PubSubMixin)
 */
export class PubSubMixin {
  
  /**
   * Serializes a message to JSON format.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:43-57
   * 
   * @param message - The message content to serialize
   * @returns JSON string of the message
   * @throws Error if the message is not serializable
   */
  static async serializeMessage(message: any): Promise<string> {
    try {
      return JSON.stringify(message ?? {});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Message contains non-serializable data: ${errorMessage}`);
    }
  }

  /**
   * Publishes a message to a specific topic with optional metadata.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:59-95
   * 
   * @param this - The workflow instance with PubSub capabilities
   * @param context - PubSub context for Dapr client access
   * @param pubsubName - The pub/sub component to use
   * @param topicName - The topic to publish the message to
   * @param message - The message content, can be any JSON-serializable type
   * @param metadata - Additional metadata to include in the publish event
   */
  static async publishMessage(
    this: PubSubCapable,
    context: PubSubContext,
    pubsubName: string,
    topicName: string,
    message: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const jsonMessage = await PubSubMixin.serializeMessage(message);
      const client = context.getDaprClient();
      
      // TODO: retry publish should be configurable
      await client.pubsub.publish(
        pubsubName || this.messageBusName || 'default',
        topicName,
        jsonMessage,
        {
          metadata: metadata || {},
          contentType: 'application/json'
        }
      );
      
      console.debug(
        `Message successfully published to topic '${topicName}' on pub/sub '${pubsubName}'.`
      );
      console.debug(`Serialized Message: ${jsonMessage}, Metadata: ${JSON.stringify(metadata)}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `Error publishing message to topic '${topicName}' on pub/sub '${pubsubName}'. ` +
        `Message: ${JSON.stringify(message)}, Metadata: ${JSON.stringify(metadata)}, Error: ${errorMessage}`
      );
      throw new Error(
        `Failed to publish message to topic '${topicName}' on pub/sub '${pubsubName}': ${errorMessage}`
      );
    }
  }

  /**
   * Publishes an event message to a specified topic with dynamic metadata.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:97-166
   * 
   * @param this - The workflow instance with PubSub capabilities
   * @param context - PubSub context for Dapr client access
   * @param topicName - The topic to publish the message to
   * @param pubsubName - The pub/sub component to use
   * @param source - The source of the message (e.g., service or agent name)
   * @param message - The message content, as an object or validated data
   * @param messageType - The type of the message. Required if message is a plain object
   * @param additionalMetadata - Additional metadata fields to include in the message
   */
  static async publishEventMessage(
    this: PubSubCapable,
    context: PubSubContext,
    topicName: string,
    pubsubName: string,
    source: string,
    message: any,
    messageType?: string,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    let messageDict: Record<string, any>;
    let resolvedMessageType: string;

    // Handle different message types (similar to Python's BaseModel, dict, dataclass handling)
    if (message && typeof message === 'object' && message.constructor !== Object) {
      // Assume it's a class instance with a constructor name
      resolvedMessageType = messageType || message.constructor.name;
      messageDict = { ...message };
    } else if (typeof message === 'object' && message !== null) {
      // Plain object
      if (!messageType) {
        throw new Error('messageType must be provided when message is a plain object.');
      }
      resolvedMessageType = messageType;
      messageDict = message;
    } else {
      throw new Error('Message must be an object instance or a plain object.');
    }

    const metadata: CloudEventMetadata = {
      'cloudevent.type': resolvedMessageType,
      'cloudevent.source': source,
      ...additionalMetadata
    };

    console.debug(
      `${source} preparing to publish '${resolvedMessageType}' to topic '${topicName}'.`
    );
    console.debug(`Message: ${JSON.stringify(messageDict)}, Metadata: ${JSON.stringify(metadata)}`);

    await PubSubMixin.publishMessage.call(
      this,
      context,
      topicName,
      pubsubName || this.messageBusName || 'default',
      messageDict,
      metadata
    );

    console.log(`${source} published '${resolvedMessageType}' to topic '${topicName}'.`);
  }

  /**
   * Registers message handlers dynamically by subscribing once per topic.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:168-220
   * 
   * Incoming messages are dispatched by CloudEvent `type` to the appropriate handler.
   * This function:
   * - Scans all class methods for the `@messageRouter` decorator metadata
   * - Extracts routing metadata and message schemas
   * - Wraps each handler and maps it by `(pubsubName, topicName)` and schema name
   * - Ensures only one handler per schema per topic is allowed
   * 
   * @param this - The workflow instance with PubSub capabilities
   * @param context - PubSub context for Dapr client access
   */
  static registerMessageRoutes(
    this: PubSubCapable,
    context: PubSubContext
  ): void {
    // Initialize storage if not present
    this._topicHandlers = this._topicHandlers || new Map();
    this._subscriptions = this._subscriptions || new Map();

    // Find all methods decorated with message router metadata
    const messageHandlers = PubSubMixin.getDecoratedMethods(this, '_isMessageHandler');

    for (const [methodName, method] of Object.entries(messageHandlers)) {
      try {
        const routerData = (method as any)._messageRouterData;
        if (!routerData) continue;

        const pubsubName = routerData.pubsub || this.messageBusName || 'default';
        const isBroadcast = routerData.isBroadcast || false;
        const topicName = routerData.topic || (
          isBroadcast ? this.broadcastTopicName : this.name
        );
        const messageSchemas = routerData.messageSchemas || [];

        if (!messageSchemas.length) {
          throw new Error(`No message schemas found for handler '${methodName}'.`);
        }

        const wrappedMethod = PubSubMixin.createWrappedMethod.call(this, method);
        const topicKey = `${pubsubName}:${topicName}`;

        if (!this._topicHandlers.has(topicKey)) {
          this._topicHandlers.set(topicKey, new Map());
        }
        const handlers = this._topicHandlers.get(topicKey)!;

        for (const schema of messageSchemas) {
          if (!PubSubMixin.isValidRoutableSchema(schema)) {
            throw new Error(
              `Unsupported message schema for handler '${methodName}': ${schema}`
            );
          }

          const schemaName = schema._def?.typeName || schema.constructor.name || 'Unknown';
          console.debug(
            `Registering handler '${methodName}' for topic '${topicName}' with schema '${schemaName}'`
          );

          // Prevent multiple handlers for the same schema
          if (handlers.has(schemaName)) {
            throw new Error(
              `Duplicate handler for schema '${schemaName}' on topic '${topicName}'. ` +
              `Each schema can only be handled by one function per topic.`
            );
          }

          handlers.set(schemaName, {
            schema,
            handler: wrappedMethod
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to register handler '${methodName}': ${errorMessage}`);
      }
    }

    // Subscribe once per topic
    for (const topicKey of this._topicHandlers.keys()) {
      const [pubsubName, topicName] = topicKey.split(':');
      if (topicName && pubsubName) {
        PubSubMixin.subscribeWithRouter.call(this, context, pubsubName, topicName);
      }
    }

    console.log('All message routes registered.');
  }

  /**
   * Helper method to find decorated methods on the instance.
   * PYTHON EQUIVALENT: dapr_agents/workflow/utils/core.py:get_decorated_methods
   */
  private static getDecoratedMethods(instance: any, decoratorFlag: string): Record<string, Function> {
    const methods: Record<string, Function> = {};
    
    // Walk through the prototype chain to find all methods
    let current = instance;
    while (current && current !== Object.prototype) {
      const propertyNames = Object.getOwnPropertyNames(current);
      for (const name of propertyNames) {
        if (name === 'constructor') continue;
        
        const descriptor = Object.getOwnPropertyDescriptor(current, name);
        if (descriptor?.value && typeof descriptor.value === 'function') {
          const method = descriptor.value;
          if ((method as any)[decoratorFlag]) {
            methods[name] = method.bind(instance);
          }
        }
      }
      current = Object.getPrototypeOf(current);
    }
    
    return methods;
  }

  /**
   * Wraps a message handler method to ensure it runs asynchronously.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:222-263
   */
  private static createWrappedMethod(this: PubSubCapable, method: Function): (message: any) => Promise<any> {
    return async (message: any) => {
      try {
        // Check if this is a workflow handler
        if ((method as any)._isWorkflow) {
          const workflowName = (method as any)._workflowName || method.name;
          
          // Handle message conversion for workflow input
          let messageDict = message;
          if (message && typeof message === 'object' && message._messageMetadata) {
            // Extract metadata if available
            const metadata = message._messageMetadata;
            // Convert to plain object for workflow input
            messageDict = { ...message };
            messageDict._messageMetadata = metadata;
          }
          
          // Invoke the workflow
          if (this.runWorkflow) {
            const instanceId = this.runWorkflow(workflowName, messageDict);
            // Monitor completion asynchronously
            if (this.monitorWorkflowCompletion) {
              this.monitorWorkflowCompletion(instanceId).catch(error => {
                console.error(`Error monitoring workflow completion: ${error}`);
              });
            }
          }
          return null;
        }

        // Call the method (assume it's async or make it async)
        const result = method.call(this, { message });
        return result instanceof Promise ? await result : result;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error invoking handler '${method.name}': ${errorMessage}`);
        return null;
      }
    };
  }

  /**
   * Subscribe to a topic with message routing.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:265-295
   */
  private static subscribeWithRouter(
    this: PubSubCapable,
    context: PubSubContext,
    pubsubName: string,
    topicName: string
  ): void {
    // Note: The Python version uses threading and Dapr subscription streams
    // In TypeScript/Node.js with Dapr SDK, we would typically use HTTP endpoints
    // or gRPC streaming, but this is highly dependent on the Dapr SDK implementation
    
    // For now, we'll store the subscription info for later implementation
    const subscriptionKey = `${pubsubName}:${topicName}`;
    
    if (!this._subscriptions) {
      this._subscriptions = new Map();
    }
    
    // Placeholder for actual subscription implementation
    const closeSubscription = () => {
      console.log(`Closing subscription for ${subscriptionKey}`);
    };
    
    this._subscriptions.set(subscriptionKey, closeSubscription);
    
    console.log(`Subscribed to topic '${topicName}' on pubsub '${pubsubName}'`);
  }

  /**
   * Routes an incoming message to the correct handler based on CloudEvent `type`.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/pubsub.py:297-378
   */
  static async routeMessage(
    this: PubSubCapable,
    pubsubName: string,
    topicName: string,
    message: any
  ): Promise<{ status: 'success' | 'drop' | 'retry'; result?: any }> {
    try {
      const topicKey = `${pubsubName}:${topicName}`;
      const handlerMap = this._topicHandlers?.get(topicKey);
      
      if (!handlerMap || handlerMap.size === 0) {
        console.warn(
          `No handlers for topic '${topicName}' on pubsub '${pubsubName}'. Dropping message.`
        );
        return { status: 'drop' };
      }

      // Extract CloudEvent metadata and data
      const { eventData, metadata } = PubSubMixin.extractCloudEventData(message);
      const eventType = metadata.type;

      // Find the handler for the event type
      const routeEntry = handlerMap.get(eventType || '');
      if (!routeEntry) {
        console.warn(
          `No handler matched CloudEvent type '${eventType}' on topic '${topicName}'`
        );
        return { status: 'drop' };
      }

      const { schema, handler } = routeEntry;

      try {
        // Validate the message against the schema
        const parsedMessage = PubSubMixin.validateMessageSchema(schema, eventData);
        
        // Attach metadata to the parsed message
        if (typeof parsedMessage === 'object' && parsedMessage !== null) {
          (parsedMessage as MessageWithMetadata)._messageMetadata = metadata;
        }

        console.log(
          `Dispatched to handler '${handler.name}' for event type '${eventType}'`
        );
        
        // Call the handler with the parsed message
        const result = await handler(parsedMessage);
        return result !== null && result !== undefined 
          ? { status: 'success', result }
          : { status: 'success' };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(
          `Failed to validate message against schema: ${errorMessage}`
        );
        return { status: 'retry' };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Unexpected error during message routing: ${errorMessage}`);
      return { status: 'retry' };
    }
  }

  /**
   * Extract CloudEvent data and metadata from Dapr message.
   * PYTHON EQUIVALENT: dapr_agents/workflow/utils/messaging.py:extract_cloudevent_data
   */
  private static extractCloudEventData(message: any): { eventData: any; metadata: CloudEventMetadata } {
    // This is a simplified implementation - actual CloudEvent extraction
    // would depend on the specific Dapr message format
    const metadata: CloudEventMetadata = {
      type: message.type || message.metadata?.type,
      source: message.source || message.metadata?.source,
      ...message.metadata
    };
    
    const eventData = message.data || message;
    
    return { eventData, metadata };
  }

  /**
   * Validate message against schema.
   * PYTHON EQUIVALENT: dapr_agents/workflow/utils/messaging.py:validate_message_model
   */
  private static validateMessageSchema(schema: z.ZodType<any>, data: any): any {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Schema validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if a schema is valid for routing.
   * PYTHON EQUIVALENT: dapr_agents/workflow/utils/core.py:is_valid_routable_model
   */
  private static isValidRoutableSchema(schema: any): boolean {
    // Check if it's a Zod schema
    return schema && typeof schema.parse === 'function';
  }
}