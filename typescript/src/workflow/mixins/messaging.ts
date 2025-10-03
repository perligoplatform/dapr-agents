import { z } from 'zod';

/**
 * Configuration for messaging operations
 */
export const BroadcastOptionsSchema = z.object({
  excludeOrchestrator: z.boolean().default(false).describe('If true, excludes orchestrators from receiving the message'),
  metadata: z.record(z.any()).optional().describe('Additional metadata fields to include in the message'),
});

export type BroadcastOptions = z.infer<typeof BroadcastOptionsSchema>;

/**
 * Interface defining messaging capabilities
 * PYTHON EQUIVALENT: MessagingMixin class methods in messaging.py
 */
export interface MessagingCapable {
  broadcastMessage(message: any, options?: BroadcastOptions): Promise<void>;
  sendDirectMessage(agent: string, message: any, metadata?: Record<string, any>): Promise<void>;
}

/**
 * Context interface required for messaging operations
 * Maps to properties available on Python classes that use MessagingMixin
 */
export interface MessagingContext {
  name: string;
  messageBusName: string;
  broadcastTopicName?: string;
  publishMessage(topic: string, data: any, metadata?: Record<string, any>): Promise<void>;
  getAgentsMetadata(excludeSelf?: boolean, excludeOrchestrator?: boolean): Promise<Record<string, any>>;
}

/**
 * Messaging mixin providing agent messaging capabilities.
 * 
 * This TypeScript implementation uses a static helper pattern instead of Python's
 * multiple inheritance, but provides identical functionality.
 * 
 * PYTHON EQUIVALENT: MessagingMixin class from messaging.py
 * 
 * Usage:
 * ```typescript
 * class MyWorkflow extends WorkflowApp implements MessagingCapable {
 *   broadcastMessage = MessagingMixin.broadcastMessage.bind(this);
 *   sendDirectMessage = MessagingMixin.sendDirectMessage.bind(this);
 *   
 *   // Or using delegation:
 *   async broadcastMessage(message: any, options?: BroadcastOptions): Promise<void> {
 *     return MessagingMixin.broadcastMessage.call(this, message, options);
 *   }
 * }
 * ```
 */
export const MessagingMixin = {
  /**
   * Send a message to all registered agents.
   * 
   * PYTHON EQUIVALENT: MessagingMixin.broadcast_message() method in messaging.py lines 14-48
   * 
   * @param this Context object with messaging capabilities
   * @param message The message content as any serializable object
   * @param options Broadcasting options including exclusion filters
   */
  async broadcastMessage(
    this: MessagingContext,
    message: any,
    options: Partial<BroadcastOptions> = {}
  ): Promise<void> {
    try {
      // Skip broadcasting if no broadcast topic is set
      // PYTHON EQUIVALENT: lines 28-31 in messaging.py
      if (!this.broadcastTopicName) {
        console.log(`${this.name} has no broadcast topic; skipping broadcast.`);
        return;
      }

      // Skip broadcasting if no agents are registered
      // PYTHON EQUIVALENT: lines 32-37 in messaging.py
      const agentsMetadata = await this.getAgentsMetadata(
        true, // excludeSelf
        options.excludeOrchestrator ?? false
      );
      
      if (!agentsMetadata || Object.keys(agentsMetadata).length === 0) {
        console.warn('No agents available for broadcast.');
        return;
      }

      // Broadcast the message to all agents
      // PYTHON EQUIVALENT: lines 38-48 in messaging.py
      console.log(`${this.name} broadcasting message to ${this.broadcastTopicName}.`);
      
      await this.publishMessage(
        this.broadcastTopicName,
        message,
        {
          source: this.name,
          broadcast: 'true',
          agentCount: Object.keys(agentsMetadata).length.toString(),
          ...options.metadata,
        }
      );

      console.log(`✅ Successfully broadcasted message to ${Object.keys(agentsMetadata).length} agents`);
    } catch (error) {
      console.error(`❌ Failed to broadcast message from ${this.name}:`, error);
      throw error;
    }
  },

  /**
   * Send a direct message to a specific agent.
   * 
   * PYTHON EQUIVALENT: MessagingMixin.send_direct_message() method in messaging.py lines 50-88
   * 
   * @param this Context object with messaging capabilities
   * @param agentName The name of the target agent
   * @param message The message content to send
   * @param metadata Additional metadata to include with the message
   */
  async sendDirectMessage(
    this: MessagingContext,
    agentName: string,
    message: any,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Validate that the target agent exists
      // PYTHON EQUIVALENT: Similar validation logic in messaging.py lines 55-65
      const agentsMetadata = await this.getAgentsMetadata(false, false); // Include all agents
      const targetAgent = agentsMetadata[agentName];
      
      if (!targetAgent) {
        throw new Error(`Agent '${agentName}' not found in registry. Available agents: ${Object.keys(agentsMetadata).join(', ')}`);
      }

      // Determine the target topic for the agent
      // PYTHON EQUIVALENT: Topic resolution logic in messaging.py lines 66-75
      const targetTopic = targetAgent.topicName || `${agentName}.direct`;
      
      console.log(`${this.name} sending direct message to ${agentName} via topic: ${targetTopic}`);

      // Send the direct message
      // PYTHON EQUIVALENT: Message publishing in messaging.py lines 76-88
      await this.publishMessage(
        targetTopic,
        message,
        {
          source: this.name,
          target: agentName,
          messageType: 'direct',
          timestamp: new Date().toISOString(),
          ...metadata,
        }
      );

      console.log(`✅ Successfully sent direct message to ${agentName}`);
    } catch (error) {
      console.error(`❌ Failed to send direct message to ${agentName}:`, error);
      throw error;
    }
  },

  /**
   * Send a targeted message to multiple specific agents.
   * 
   * PYTHON EQUIVALENT: Extension of messaging capabilities, similar pattern to broadcast_message
   * but with selective targeting (not present in original Python but follows same patterns)
   * 
   * @param this Context object with messaging capabilities
   * @param agentNames Array of target agent names
   * @param message The message content to send
   * @param metadata Additional metadata to include with the message
   */
  async sendMulticastMessage(
    this: MessagingContext,
    agentNames: string[],
    message: any,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      if (!agentNames || agentNames.length === 0) {
        console.warn('No agents specified for multicast message');
        return;
      }

      console.log(`${this.name} sending multicast message to ${agentNames.length} agents: ${agentNames.join(', ')}`);

      // Send message to each specified agent
      const promises = agentNames.map(agentName => 
        MessagingMixin.sendDirectMessage.call(this, agentName, message, {
          ...metadata,
          multicast: 'true',
          multicastGroup: agentNames.join(','),
        })
      );

      await Promise.allSettled(promises);
      console.log(`✅ Multicast message sent to ${agentNames.length} agents`);
    } catch (error) {
      console.error(`❌ Failed to send multicast message:`, error);
      throw error;
    }
  },

  /**
   * Check if messaging is properly configured.
   * 
   * PYTHON EQUIVALENT: Similar validation patterns used throughout messaging.py
   * 
   * @param this Context object with messaging capabilities
   * @returns True if messaging is configured and ready
   */
  isMessagingConfigured(this: MessagingContext): boolean {
    return !!(this.messageBusName && this.publishMessage);
  },

  /**
   * Get messaging configuration summary.
   * 
   * PYTHON EQUIVALENT: Debug/info methods pattern used in Python mixins
   * 
   * @param this Context object with messaging capabilities
   * @returns Configuration summary object
   */
  getMessagingConfig(this: MessagingContext): Record<string, any> {
    return {
      name: this.name,
      messageBusName: this.messageBusName,
      broadcastTopicName: this.broadcastTopicName,
      hasPublishCapability: typeof this.publishMessage === 'function',
      hasAgentMetadataAccess: typeof this.getAgentsMetadata === 'function',
    };
  },
};

/**
 * Helper function to add messaging capabilities to a class.
 * This provides an alternative to manual method binding.
 * 
 * PYTHON EQUIVALENT: The effect of inheriting from MessagingMixin in Python
 * 
 * @param target The class instance to enhance with messaging capabilities
 * @returns The enhanced instance with messaging methods
 */
export function withMessaging<T extends MessagingContext>(target: T): T & MessagingCapable {
  const enhanced = target as T & MessagingCapable;
  
  enhanced.broadcastMessage = MessagingMixin.broadcastMessage.bind(target);
  enhanced.sendDirectMessage = MessagingMixin.sendDirectMessage.bind(target);
  
  return enhanced;
}

/**
 * Decorator factory for adding messaging capabilities to classes.
 * 
 * PYTHON EQUIVALENT: The inheritance pattern `class MyClass(BaseClass, MessagingMixin)`
 * 
 * Usage:
 * ```typescript
 * @withMessagingCapabilities
 * class MyWorkflow extends WorkflowApp {
 *   // Automatically gets messaging methods
 * }
 * ```
 */
export function withMessagingCapabilities<T extends new (...args: any[]) => MessagingContext>(
  constructor: T
) {
  return class extends constructor implements MessagingCapable {
    broadcastMessage = MessagingMixin.broadcastMessage.bind(this);
    sendDirectMessage = MessagingMixin.sendDirectMessage.bind(this);
  };
}