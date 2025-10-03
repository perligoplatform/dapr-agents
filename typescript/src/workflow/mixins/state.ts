/**
 * State management mixin providing workflow state initialization, validation, and persistence.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/state.py:14-253
 * 
 * Features:
 * - Initialize workflow state from provided value or storage
 * - Validate state against Zod schemas
 * - Load and save state to Dapr state store
 * - Support local state file persistence
 * - Handle state merging and atomic saves
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Interface that workflow classes must implement to use State Management capabilities
export interface StateManagementCapable {
  // State configuration
  state?: any;
  stateFormat?: z.ZodType<any>;
  stateStoreName?: string;
  stateKey?: string;
  localStatePath?: string;
  saveStateLocally?: boolean;
  name: string;
  
  // State store client
  _stateStoreClient?: StateStoreClient;
}

// Context interface for dependency injection
export interface StateManagementContext {
  getStateStoreClient(): StateStoreClient;
}

// State store client interface
export interface StateStoreClient {
  tryGetState(key: string): Promise<{ hasState: boolean; data: any }>;
  saveState(key: string, data: string): Promise<void>;
}

// Mutex for thread-safe state operations
class StateLock {
  private mutex = Promise.resolve();
  
  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.mutex.then(() => {
      let resolveNext: () => void = () => {};
      const next = new Promise<void>(resolve => {
        resolveNext = resolve;
      });
      this.mutex = next;
      return resolveNext;
    });
    
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

const stateLock = new StateLock();

/**
 * Static helper class providing State Management functionality using composition pattern
 * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/state.py:14 (class StateManagementMixin)
 */
export class StateManagementMixin {

  /**
   * Initialize workflow state from provided value or storage.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/state.py:20-44
   * 
   * @param this - The workflow instance with State Management capabilities
   * @param context - State management context for client access
   * @throws Error if state initialization or loading from storage fails
   */
  static async initializeState(
    this: StateManagementCapable,
    context: StateManagementContext
  ): Promise<void> {
    try {
      if (this.state === undefined || this.state === null) {
        console.debug('No user-provided state. Attempting to load from storage.');
        this.state = await StateManagementMixin.loadState.call(this, context);
      }

      // Handle Zod schema instances (similar to Pydantic BaseModel)
      if (this.state && typeof this.state === 'object' && this.state._def) {
        console.debug('User provided a state as a Zod schema. Converting to plain object.');
        // If it's a Zod schema result, extract the data
        this.state = this.state.data || this.state;
      }

      if (typeof this.state !== 'object' || this.state === null) {
        throw new Error(
          `Invalid state type: ${typeof this.state}. Expected object.`
        );
      }

      const keyCount = Object.keys(this.state).length;
      console.debug(`Workflow state initialized with ${keyCount} key(s).`);
      await StateManagementMixin.saveState.call(this, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error initializing workflow state: ${errorMessage}`);
    }
  }

  /**
   * Validate the workflow state against `stateFormat` if provided.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/state.py:46-66
   * 
   * @param this - The workflow instance with State Management capabilities
   * @param stateData - The raw state data to validate
   * @returns The validated and structured state
   * @throws z.ZodError if the state data does not conform to the expected schema
   */
  static validateState(
    this: StateManagementCapable,
    stateData: any
  ): any {
    try {
      if (!this.stateFormat) {
        console.warn('No schema (stateFormat) provided; returning state as-is.');
        return stateData;
      }

      console.debug('Validating workflow state against schema.');
      const validatedState = this.stateFormat.parse(stateData);
      return validatedState;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new z.ZodError([{
          code: 'custom',
          message: `Invalid workflow state: ${error.errors.map(e => e.message).join(', ')}`,
          path: []
        }]);
      }
      throw error;
    }
  }

  /**
   * Load the workflow state from the configured Dapr state store.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/state.py:68-128
   * 
   * @param this - The workflow instance with State Management capabilities
   * @param context - State management context for client access
   * @returns The loaded and optionally validated state
   * @throws Error if the state store is not properly configured or loading fails
   */
  static async loadState(
    this: StateManagementCapable,
    context: StateManagementContext
  ): Promise<any> {
    try {
      if (!this._stateStoreClient || !this.stateStoreName || !this.stateKey) {
        console.error('State store is not configured. Cannot load state.');
        throw new Error(
          'State store is not configured. Please provide \'stateStoreName\' and \'stateKey\'.'
        );
      }

      // For durable agents, always load from database to ensure it's the source of truth
      const { hasState, data: stateData } = await this._stateStoreClient.tryGetState(this.stateKey);

      if (hasState && stateData) {
        console.debug(
          `Existing state found for key '${this.stateKey}'. Validating it.`
        );
        
        if (typeof stateData !== 'object' || stateData === null) {
          throw new Error(
            `Invalid state type retrieved: ${typeof stateData}. Expected object.`
          );
        }

        // Set this.state to the loaded data
        let loadedState;
        if (this.stateFormat) {
          loadedState = StateManagementMixin.validateState.call(this, stateData);
        } else {
          loadedState = stateData;
        }

        this.state = loadedState;
        console.debug(`Set this.state to loaded data: ${JSON.stringify(this.state)}`);

        return loadedState;
      }

      console.debug(
        `No existing state found for key '${this.stateKey}'. Initializing empty state.`
      );
      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load state for key '${this.stateKey}': ${errorMessage}`);
      throw new Error(`Error loading workflow state: ${errorMessage}`);
    }
  }

  /**
   * Return the file path for saving the local state.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/state.py:130-137
   * 
   * @param this - The workflow instance with State Management capabilities
   * @returns The absolute path to the local state file
   */
  static getLocalStateFilePath(this: StateManagementCapable): string {
    const directory = this.localStatePath || process.cwd();
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    return path.join(directory, `${this.stateKey}.json`);
  }

  /**
   * Safely save the workflow state to a local JSON file.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/state.py:139-189
   * 
   * @param this - The workflow instance with State Management capabilities
   * @param stateData - The state data to save (as JSON string or object)
   * @param filename - Optional filename for the state file
   * @throws Error if saving to disk fails
   */
  static async saveStateToDisk(
    this: StateManagementCapable,
    stateData: string | any,
    filename?: string
  ): Promise<void> {
    try {
      const saveDirectory = this.localStatePath || process.cwd();
      if (!fs.existsSync(saveDirectory)) {
        fs.mkdirSync(saveDirectory, { recursive: true });
      }
      
      const resolvedFilename = filename || `${this.name}_state.json`;
      const filePath = path.join(saveDirectory, resolvedFilename);

      // Create temporary file for atomic write
      const tempPath = path.join(saveDirectory, `.${resolvedFilename}.tmp`);

      await stateLock.acquire(async () => {
        let existingState: any = {};
        if (fs.existsSync(filePath)) {
          try {
            const existingContent = fs.readFileSync(filePath, 'utf-8');
            existingState = JSON.parse(existingContent);
          } catch (error) {
            console.warn('Existing state file is corrupt or empty. Overwriting.');
          }
        }

        const newState = typeof stateData === 'string' 
          ? JSON.parse(stateData) 
          : stateData;
        const mergedState = { ...existingState, ...newState };

        // Write to temporary file first
        fs.writeFileSync(tempPath, JSON.stringify(mergedState, null, 4), 'utf-8');
        
        // Atomic move
        fs.renameSync(tempPath, filePath);
      });

      console.debug(`Workflow state saved locally at '${filePath}'.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to save workflow state to disk: ${errorMessage}`);
      throw new Error(`Error saving workflow state to disk: ${errorMessage}`);
    }
  }

  /**
   * Save the current workflow state to Dapr and optionally to disk.
   * PYTHON EQUIVALENT: dapr_agents/workflow/mixins/state.py:191-253
   * 
   * @param this - The workflow instance with State Management capabilities
   * @param context - State management context for client access
   * @param state - The new state to save. If not provided, saves the existing state
   * @param forceReload - If true, reloads the state from the store after saving
   * @throws Error if the state store is not configured or saving fails
   */
  static async saveState(
    this: StateManagementCapable,
    context: StateManagementContext,
    state?: any,
    forceReload: boolean = false
  ): Promise<void> {
    try {
      if (!this._stateStoreClient || !this.stateStoreName || !this.stateKey) {
        console.error('State store is not configured. Cannot save state.');
        throw new Error(
          'State store is not configured. Please provide \'stateStoreName\' and \'stateKey\'.'
        );
      }

      this.state = state || this.state;
      if (!this.state) {
        console.warn('Skipping state save: Empty state.');
        return;
      }

      let stateToSave: string;

      // Handle different state types
      if (this.state && typeof this.state === 'object' && this.state._def) {
        // Zod schema result
        stateToSave = JSON.stringify(this.state.data || this.state);
      } else if (typeof this.state === 'object' && this.state !== null) {
        stateToSave = JSON.stringify(this.state);
      } else if (typeof this.state === 'string') {
        try {
          JSON.parse(this.state);
          stateToSave = this.state;
        } catch (error) {
          throw new Error(`Invalid JSON string provided as state: ${error}`);
        }
      } else {
        throw new Error(
          `Invalid state type: ${typeof this.state}. Expected object or JSON string.`
        );
      }

      await this._stateStoreClient.saveState(this.stateKey, stateToSave);
      console.debug(`Successfully saved state for key '${this.stateKey}'.`);

      if (this.saveStateLocally) {
        await StateManagementMixin.saveStateToDisk.call(this, stateToSave);
      }

      if (forceReload) {
        this.state = await StateManagementMixin.loadState.call(this, context);
        console.debug(`State reloaded after saving for key '${this.stateKey}'.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to save state for key '${this.stateKey}': ${errorMessage}`);
      throw error;
    }
  }
}