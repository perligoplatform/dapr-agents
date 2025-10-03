/**
 * Service mixin providing HTTP service integration and lifecycle management for agentic workflows.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/service.py:10-217
 * 
 * Features:
 * - Initializes and manages an HTTP server for agent workflows
 * - Registers HTTP endpoints for workflow status, initiation, and custom user routes
 * - Supports both HTTP service mode and headless (no HTTP server) operation
 * - Handles graceful shutdown via signal handling and resource cleanup
 * - Integrates workflow execution via HTTP POST and custom endpoints
 * - Manages subscription cleanup and workflow runtime shutdown on service stop
 * - Provides property access to the HTTP server instance
 */

import { DaprWorkflowStatus } from '../../types/workflow';

// Interface that workflow classes must implement to use Service capabilities
export interface ServiceCapable {
  // Core properties
  name: string;
  
  // Runtime state
  _isRunning?: boolean;
  _shutdownEvent?: { clear(): void; set(): void; wait(): Promise<void> };
  _httpServer?: HttpServerBase;
  _subscriptions?: Map<string, () => void>;
  wfRuntimeIsRunning?: boolean;
  
  // Workflow state management
  workflowInstanceId?: string;
  state?: any;
  
  // Methods that must be available
  registerMessageRoutes?(): void;
  setupSignalHandlers?(): void;
  waitForShutdown?(): Promise<void>;
  saveState?(): void;
  stopRuntime?(): void;
  runWorkflowFromRequest?(request: any): Promise<any>;
}

// Context interface for dependency injection
export interface ServiceContext {
  createHttpServer(name: string, port: number, host: string): HttpServerBase;
}

// HTTP Server interface
export interface HttpServerBase {
  app: any; // HTTP framework app instance (Express, Fastify, etc.)
  start(): Promise<void>;
  stop(): Promise<void>;
  addRoute(path: string, handler: Function, method?: string, options?: any): void;
}

// Route decorator metadata
export interface RouteMetadata {
  path: string;
  method: string;
  options?: any;
}

/**
 * Static helper class providing Service functionality using composition pattern
 * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/service.py:10 (class ServiceMixin)
 */
export class ServiceMixin {

  /**
   * Property getter for the HTTP application instance.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/service.py:27-39
   * 
   * @param this - The workflow instance with Service capabilities
   * @returns The HTTP app instance
   * @throws Error if the HTTP server has not been initialized
   */
  static getApp(this: ServiceCapable): any {
    if (this._httpServer) {
      return this._httpServer.app;
    }
    throw new Error('HTTP server not initialized. Call `asService()` first.');
  }

  /**
   * Register user-defined HTTP routes decorated with `@route`.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/service.py:41-51
   * 
   * @param this - The workflow instance with Service capabilities
   */
  static registerRoutes(this: ServiceCapable): void {
    if (!this._httpServer) {
      throw new Error('HTTP server not initialized. Call `asService()` first.');
    }

    // Find all methods decorated with route metadata
    const routeMethods = ServiceMixin.getDecoratedMethods(this, '_isFastApiRoute');

    for (const [methodName, method] of Object.entries(routeMethods)) {
      const routeData = (method as any)._routeData as RouteMetadata;
      if (routeData) {
        const { path, method: httpMethod = 'GET', options = {} } = routeData;
        console.log(`Registering route ${httpMethod} ${path} -> ${methodName}`);
        
        this._httpServer.addRoute(path, method, httpMethod, options);
      }
    }
  }

  /**
   * Enable HTTP service mode for the agent.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/service.py:53-82
   * 
   * @param this - The workflow instance with Service capabilities
   * @param context - Service context for HTTP server creation
   * @param port - Required port number
   * @param host - Host address to bind to
   * @returns The workflow instance for chaining
   * @throws Error if port is not provided
   */
  static asService(
    this: ServiceCapable,
    context: ServiceContext,
    port?: number,
    host: string = '0.0.0.0'
  ): ServiceCapable {
    if (port === undefined) {
      throw new Error('Port must be provided as a parameter');
    }

    this._httpServer = context.createHttpServer(this.name, port, host);

    // Add default routes
    this._httpServer.addRoute('/status', () => ({ ok: true }), 'GET');
    this._httpServer.addRoute('/start-workflow', 
      this.runWorkflowFromRequest?.bind(this) || (() => { throw new Error('runWorkflowFromRequest not implemented'); }), 
      'POST'
    );

    ServiceMixin.registerRoutes.call(this);
    return this;
  }

  /**
   * Perform graceful shutdown operations for the service.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/service.py:84-88
   */
  static async gracefulShutdown(this: ServiceCapable): Promise<void> {
    await ServiceMixin.stop.call(this);
  }

  /**
   * Start the agent workflow service.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/service.py:90-120
   * 
   * This method starts the HTTP server or runs in headless mode.
   */
  static async start(this: ServiceCapable): Promise<void> {
    if (this._isRunning) {
      console.warn('Service is already running. Ignoring duplicate start request.');
      return;
    }

    console.log('Starting Agent Workflow Service...');
    this._shutdownEvent?.clear();

    try {
      if (!this._httpServer) {
        console.log('Running in headless mode.');
        // Set up signal handlers
        if (this.setupSignalHandlers) {
          this.setupSignalHandlers();
        }
        if (this.registerMessageRoutes) {
          this.registerMessageRoutes();
        }
        this._isRunning = true;
        // Wait for shutdown signal
        if (this.waitForShutdown) {
          await this.waitForShutdown();
        }
      } else {
        console.log('Running in HTTP service mode.');
        if (this.registerMessageRoutes) {
          this.registerMessageRoutes();
        }
        this._isRunning = true;
        await this._httpServer.start();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Service received cancellation signal.');
      } else {
        throw error;
      }
    } finally {
      await ServiceMixin.stop.call(this);
    }
  }

  /**
   * Stop the agent workflow service and clean up resources.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/service.py:122-217
   */
  static async stop(this: ServiceCapable): Promise<void> {
    if (!this._isRunning) {
      console.warn('Service is not running. Ignoring stop request.');
      return;
    }

    console.log('Stopping Agent Workflow Service...');

    // Save state before shutting down to ensure persistence and agent durability
    try {
      if (this.saveState && this.state) {
        // Graceful shutdown compensation: Save incomplete instance if it exists
        if (this.workflowInstanceId) {
          const instances = this.state.instances || {};
          
          if (!(this.workflowInstanceId in instances)) {
            // This instance was never saved, add it as incomplete
            const incompleteEntry = {
              messages: [],
              startTime: new Date().toISOString(),
              source: 'graceful_shutdown',
              triggeringWorkflowInstanceId: null,
              workflowName: (this as any)._workflowName || 'Unknown',
              daprStatus: DaprWorkflowStatus.PENDING,
              suspendedReason: 'app_terminated',
              traceContext: { needsAgentSpanOnResume: true },
            };
            
            if (!this.state.instances) {
              this.state.instances = {};
            }
            this.state.instances[this.workflowInstanceId] = incompleteEntry;
            
            console.log(
              `Added incomplete instance ${this.workflowInstanceId} during graceful shutdown`
            );
          } else {
            // Mark running instances as needing AGENT spans on resume
            if (this.state.instances) {
              for (const [instanceId, instanceData] of Object.entries(this.state.instances)) {
                const data = instanceData as any;
                // Only mark instances that are still running (no endTime)
                if (!data.endTime) {
                  data.daprStatus = DaprWorkflowStatus.SUSPENDED;
                  data.suspendedReason = 'app_terminated';

                  // Mark trace context for AGENT span creation on resume
                  if (data.traceContext) {
                    data.traceContext.needsAgentSpanOnResume = true;
                    console.debug(
                      `Marked trace context for AGENT span creation on resume for ${instanceId}`
                    );
                  }

                  console.log(
                    `Marked instance ${instanceId} as suspended due to app termination`
                  );
                }
              }
            }
          }
        }

        this.saveState();
        console.debug('Workflow state saved successfully.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to save state during shutdown: ${errorMessage}`);
    }

    // Clean up subscriptions
    if (this._subscriptions) {
      for (const [subscriptionKey, closeFn] of this._subscriptions.entries()) {
        try {
          const [pubsubName, topicName] = subscriptionKey.split(':');
          console.log(`Unsubscribing from pubsub '${pubsubName}' topic '${topicName}'`);
          closeFn();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Failed to unsubscribe from topic '${subscriptionKey}': ${errorMessage}`);
        }
      }
      this._subscriptions.clear();
    }

    // Stop HTTP server
    if (this._httpServer) {
      console.log('Stopping HTTP server...');
      await this._httpServer.stop();
    }

    // Stop workflow runtime
    if (this.wfRuntimeIsRunning) {
      console.log('Shutting down workflow runtime.');
      if (this.stopRuntime) {
        this.stopRuntime();
      }
      this.wfRuntimeIsRunning = false;
    }

    this._isRunning = false;
    console.log('Agent Workflow Service stopped successfully.');
  }

  /**
   * Helper method to find decorated methods on the instance.
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
}