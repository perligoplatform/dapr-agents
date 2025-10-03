import { z } from 'zod';

/**
 * Configuration for message router decorator
 */
export const MessageRouterConfigSchema = z.object({
  pubsub: z.string().optional().describe('The name of the pub/sub component.'),
  topic: z.string().optional().describe('The topic name for the handler.'),
  deadLetterTopic: z.string().optional().describe('Dead-letter topic for failed messages.'),
  broadcast: z.boolean().default(false).describe('If true, the message is broadcast to all agents.'),
  messageSchema: z.any().optional().describe('Zod schema for message validation'),
  messageType: z.string().optional().describe('Expected message type name'),
});

export type MessageRouterConfig = z.infer<typeof MessageRouterConfigSchema>;

/**
 * Metadata attached to message handler functions
 */
export interface MessageRouterMetadata {
  isMessageHandler: true;
  messageRouterData: {
    pubsub?: string;
    topic?: string;
    deadLetterTopic?: string;
    isBroadcast: boolean;
    messageSchemas: any[];
    messageTypes: string[];
  };
  isWorkflow?: boolean;
  workflowName?: string;
}

/**
 * Type guard to check if a function is a message handler
 * PYTHON EQUIVALENT: Checking for ._is_message_handler attribute in messaging.py
 */
export function isMessageHandlerFunction(func: any): func is Function & MessageRouterMetadata {
  return typeof func === 'function' && func.isMessageHandler === true;
}

/**
 * Extract message models from a Zod schema or type
 * PYTHON EQUIVALENT: extract_message_models function in messaging.py
 */
function extractMessageModels(messageSchema?: any): any[] {
  if (!messageSchema) return [];
  
  // Handle Zod schemas
  if (messageSchema._def) {
    return [messageSchema];
  }
  
  // Handle union types (if we add support for them later)
  if (Array.isArray(messageSchema)) {
    return messageSchema;
  }
  
  return [messageSchema];
}

/**
 * Validate if a model is suitable for routing
 * PYTHON EQUIVALENT: is_valid_routable_model function in messaging.py
 */
function isValidRoutableModel(model: any): boolean {
  // For now, we'll accept any Zod schema or constructor function
  if (model?._def) return true; // Zod schema
  if (typeof model === 'function') return true; // Constructor function
  if (typeof model === 'object' && model !== null) return true; // Plain object schema
  
  return false;
}

/**
 * Message router decorator factory function.
 * 
 * Decorator for registering message handlers by inspecting type hints/schemas.
 * This decorator extracts the expected message model type and stores metadata 
 * for routing messages by message schema.
 * 
 * PYTHON EQUIVALENT: @message_router decorator in messaging.py lines 11-80
 * 
 * @param config Message router configuration
 * @returns Decorator function that attaches message handler metadata
 * 
 * @example
 * ```typescript
 * // Define message schema
 * const UserEventSchema = z.object({
 *   userId: z.string(),
 *   action: z.string(),
 *   timestamp: z.string()
 * });
 * 
 * // Basic message handler
 * const handleUserEvent = messageRouter({
 *   topic: "user.events",
 *   messageSchema: UserEventSchema
 * })((message: z.infer<typeof UserEventSchema>) => {
 *   console.log(`User ${message.userId} performed ${message.action}`);
 * });
 * 
 * // Broadcast message handler
 * const handleBroadcast = messageRouter({
 *   topic: "system.broadcasts",
 *   broadcast: true,
 *   messageSchema: SystemEventSchema
 * })((message: SystemEvent) => {
 *   // Handle system-wide events
 * });
 * 
 * // With dead letter topic
 * const handleCriticalEvents = messageRouter({
 *   pubsub: "redis-pubsub",
 *   topic: "critical.events",
 *   deadLetterTopic: "critical.events.dead",
 *   messageSchema: CriticalEventSchema
 * })((message: CriticalEvent) => {
 *   // Handle critical events with error recovery
 * });
 * ```
 */
export function messageRouter<TMessage = any>(
  config: MessageRouterConfig
) {
  return function<TFunc extends (message: TMessage, ...args: any[]) => any>(
    func: TFunc
  ): TFunc & MessageRouterMetadata {
    if (typeof func !== 'function') {
      throw new Error(`@messageRouter must be applied to a function, got ${typeof func}.`);
    }

    const routerConfig = MessageRouterConfigSchema.parse(config);
    
    // Extract message models from schema
    const messageModels = extractMessageModels(routerConfig.messageSchema);
    
    if (messageModels.length === 0) {
      throw new Error(
        `Message handler '${func.name}' must have a messageSchema in configuration with a valid type.`
      );
    }

    // Validate all message models
    for (const model of messageModels) {
      if (!isValidRoutableModel(model)) {
        throw new TypeError(
          `Handler '${func.name}' has unsupported message type: ${model}`
        );
      }
    }

    console.debug(
      `@messageRouter: '${func.name}' => models ${messageModels.map(m => m.name || 'Anonymous').join(', ')}`
    );

    // Create decorated function with metadata (similar to Python's approach)
    const decoratedFunc = func as TFunc & MessageRouterMetadata;
    
    // Check if this is also a workflow (preserve existing metadata)
    const isWorkflow = 'isWorkflow' in func && (func as any).isWorkflow;
    const workflowName = isWorkflow ? (func as any).workflowName : undefined;
    
    // Attach message router metadata (PYTHON EQUIVALENT: lines 56-70 in messaging.py)
    decoratedFunc.isMessageHandler = true;
    
    const deadLetter = routerConfig.deadLetterTopic || 
      (routerConfig.topic ? `${routerConfig.topic}_DEAD` : undefined);
    
    decoratedFunc.messageRouterData = {
      isBroadcast: routerConfig.broadcast,
      messageSchemas: messageModels,
      messageTypes: messageModels.map(model => 
        model.name || routerConfig.messageType || 'UnknownMessage'
      ),
    };
    
    if (routerConfig.pubsub) {
      decoratedFunc.messageRouterData.pubsub = routerConfig.pubsub;
    }
    if (routerConfig.topic) {
      decoratedFunc.messageRouterData.topic = routerConfig.topic;
    }
    if (deadLetter) {
      decoratedFunc.messageRouterData.deadLetterTopic = deadLetter;
    }

    // Preserve workflow metadata if it exists
    if (isWorkflow) {
      decoratedFunc.isWorkflow = true;
      decoratedFunc.workflowName = workflowName;
    }

    return decoratedFunc;
  };
}

/**
 * Extract message router configuration from a decorated function
 * PYTHON EQUIVALENT: Reading ._message_router_data attribute from decorated functions
 */
export function getMessageRouterConfig(func: Function & MessageRouterMetadata): MessageRouterConfig {
  const data = func.messageRouterData;
  return {
    pubsub: data.pubsub,
    topic: data.topic,
    deadLetterTopic: data.deadLetterTopic,
    broadcast: data.isBroadcast,
    messageSchema: data.messageSchemas[0], // Return first schema for simplicity
    messageType: data.messageTypes[0],
  };
}

/**
 * Get all message types handled by a function
 * PYTHON EQUIVALENT: Accessing messageTypes from _message_router_data
 */
export function getMessageTypes(func: Function & MessageRouterMetadata): string[] {
  return func.messageRouterData.messageTypes;
}

/**
 * Get all message schemas handled by a function
 * PYTHON EQUIVALENT: Accessing messageSchemas from _message_router_data
 */
export function getMessageSchemas(func: Function & MessageRouterMetadata): any[] {
  return func.messageRouterData.messageSchemas;
}

/**
 * Check if a message handler is for broadcast messages
 * PYTHON EQUIVALENT: Checking isBroadcast from _message_router_data
 */
export function isBroadcastHandler(func: Function & MessageRouterMetadata): boolean {
  return func.messageRouterData.isBroadcast;
}

/**
 * Discover all message handler functions from an object or module
 * PYTHON EQUIVALENT: Similar to discovering tasks/workflows but for message handlers
 */
export function discoverMessageHandlers(target: any): Record<string, Function & MessageRouterMetadata> {
  const handlers: Record<string, Function & MessageRouterMetadata> = {};
  
  if (!target || typeof target !== 'object') {
    return handlers;
  }
  
  // Get all property names including inherited ones
  const allProps = new Set<string>();
  let current = target;
  
  while (current && current !== Object.prototype) {
    Object.getOwnPropertyNames(current).forEach(prop => allProps.add(prop));
    current = Object.getPrototypeOf(current);
  }
  
  for (const prop of Array.from(allProps)) {
    try {
      const value = target[prop];
      if (isMessageHandlerFunction(value)) {
        // Create a key based on topic and message types
        const data = value.messageRouterData;
        const key = `${data.topic || 'default'}:${data.messageTypes.join('|')}`;
        handlers[key] = value;
      }
    } catch (error) {
      // Skip properties that can't be accessed
      continue;
    }
  }
  
  return handlers;
}