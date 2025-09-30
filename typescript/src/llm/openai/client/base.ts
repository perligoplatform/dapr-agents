import { z } from 'zod';
import { LLMClientBase } from '../../../base/llm.js';
import { OpenAIClientConfig, AzureOpenAIClientConfig } from '../../../types/llm.js';

/**
 * Configuration schema for OpenAI base client
 */
export const OpenAIClientBaseConfigSchema = z.object({
  apiKey: z.string().optional().describe('API key for OpenAI or Azure OpenAI'),
  baseUrl: z.string().optional().describe('Base URL for OpenAI API (OpenAI-specific)'),
  azureEndpoint: z.string().optional().describe('Azure endpoint URL (Azure OpenAI-specific)'),
  azureDeployment: z.string().optional().describe('Azure deployment name (Azure OpenAI-specific)'),
  apiVersion: z.string().optional().describe('Azure API version (Azure OpenAI-specific)'),
  organization: z.string().optional().describe('Organization for OpenAI or Azure OpenAI'),
  project: z.string().optional().describe('Project for OpenAI or Azure OpenAI'),
  azureAdToken: z.string().optional().describe('Azure AD token for authentication (Azure-specific)'),
  azureClientId: z.string().optional().describe('Client ID for Managed Identity (Azure-specific)'),
  timeout: z.union([z.number(), z.record(z.any())]).optional().describe('Timeout for requests in seconds'),
});

export type OpenAIClientBaseConfig = z.infer<typeof OpenAIClientBaseConfigSchema>;

/**
 * Base class for managing OpenAI and Azure OpenAI clients.
 * Handles client initialization, configuration, and shared logic.
 */
export abstract class OpenAIClientBase extends LLMClientBase {
  public readonly apiKey?: string;
  public readonly baseUrl?: string;
  public readonly azureEndpoint?: string;
  public readonly azureDeployment?: string;
  public readonly apiVersion?: string;
  public readonly organization?: string;
  public readonly project?: string;
  public readonly azureAdToken?: string;
  public readonly azureClientId?: string;
  public readonly timeout: number | Record<string, any>;

  // Private attributes
  private _provider = 'openai';
  private _api = 'base';
  private _config?: OpenAIClientConfig | AzureOpenAIClientConfig;
  private _client?: any; // OpenAI or AzureOpenAI client

  constructor(config: OpenAIClientBaseConfig = {}) {
    super();
    const validated = OpenAIClientBaseConfigSchema.parse(config);
    
    // Handle optional properties with conditional assignment
    if (validated.apiKey !== undefined) this.apiKey = validated.apiKey;
    if (validated.baseUrl !== undefined) this.baseUrl = validated.baseUrl;
    if (validated.azureEndpoint !== undefined) this.azureEndpoint = validated.azureEndpoint;
    if (validated.azureDeployment !== undefined) this.azureDeployment = validated.azureDeployment;
    if (validated.apiVersion !== undefined) this.apiVersion = validated.apiVersion;
    if (validated.organization !== undefined) this.organization = validated.organization;
    if (validated.project !== undefined) this.project = validated.project;
    if (validated.azureAdToken !== undefined) this.azureAdToken = validated.azureAdToken;
    if (validated.azureClientId !== undefined) this.azureClientId = validated.azureClientId;
    this.timeout = validated.timeout ?? 1500; // Handle default here

    // Initialize after construction
    this._postInit();
  }

  private _postInit(): void {
    this._config = this.getConfig();
    this._client = this.getClient();
  }

  public get provider(): string {
    return this._provider;
  }

  public get api(): string {
    return this._api;
  }

  public get config(): OpenAIClientConfig | AzureOpenAIClientConfig {
    if (!this._config) {
      throw new Error('Configuration not initialized');
    }
    return this._config;
  }

  public get client(): any {
    if (!this._client) {
      throw new Error('Client not initialized');
    }
    return this._client;
  }

  /**
   * Check if this is an Azure OpenAI configuration
   */
  public get isAzure(): boolean {
    return !!(this.azureEndpoint || this.azureDeployment);
  }

  /**
   * Returns the appropriate configuration for OpenAI or Azure OpenAI
   */
  public getConfig(): OpenAIClientConfig | AzureOpenAIClientConfig {
    const isAzure = this.azureEndpoint || this.azureDeployment;

    if (isAzure) {
      return {
        apiKey: this.apiKey,
        organization: this.organization,
        project: this.project,
        azureAdToken: this.azureAdToken,
        azureEndpoint: this.azureEndpoint,
        azureDeployment: this.azureDeployment,
        apiVersion: this.apiVersion,
      } as AzureOpenAIClientConfig;
    } else {
      return {
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        organization: this.organization,
        project: this.project,
      } as OpenAIClientConfig;
    }
  }

  /**
   * Initialize and return the appropriate client (OpenAI or Azure OpenAI)
   */
  public getClient(): any {
    const config = this.config;
    const timeout = this.timeout;

    if (this.isAzureConfig(config)) {
      console.log('Initializing Azure OpenAI client...');
      return this.createAzureClient(config, timeout);
    } else {
      console.log('Initializing OpenAI client...');
      return this.createOpenAIClient(config, timeout);
    }
  }

  /**
   * Check if config is for Azure OpenAI
   */
  private isAzureConfig(config: OpenAIClientConfig | AzureOpenAIClientConfig): config is AzureOpenAIClientConfig {
    return 'azureEndpoint' in config || 'azureDeployment' in config;
  }

  /**
   * Create OpenAI client
   */
  private createOpenAIClient(config: OpenAIClientConfig, timeout: number | Record<string, any>): any {
    // This would use the OpenAI SDK
    // For now, return a mock client
    return {
      type: 'openai',
      config,
      timeout,
    };
  }

  /**
   * Create Azure OpenAI client
   */
  private createAzureClient(config: AzureOpenAIClientConfig, timeout: number | Record<string, any>): any {
    // This would use the Azure OpenAI SDK
    // For now, return a mock client
    return {
      type: 'azure-openai',
      config,
      timeout,
    };
  }

  /**
   * Validate client configuration
   */
  public validateConfig(): boolean {
    const config = this.config;
    
    if (this.isAzureConfig(config)) {
      return !!(config.azureEndpoint && (config.apiKey || config.azureAdToken));
    } else {
      return !!config.apiKey;
    }
  }
}