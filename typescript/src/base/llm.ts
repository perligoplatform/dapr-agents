import { PromptTemplateBase } from './prompt.js';

/**
 * Abstract base class for LLM clients
 */
export abstract class LLMClientBase {
  public promptTemplate?: PromptTemplateBase;

  public abstract readonly provider: string;
  public abstract readonly api: string;
  public abstract readonly config: any;
  public abstract readonly client: any;

  public abstract getClient(): any;
  public abstract getConfig(): any;

  public refreshClient(): void {
    // Refresh config and client using the current state
    const newConfig = this.getConfig();
    const newClient = this.getClient();
    // Note: This would need to update internal state in concrete implementations
  }
}