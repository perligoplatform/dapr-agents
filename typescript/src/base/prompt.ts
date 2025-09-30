/**
 * Abstract base class for prompt templates
 */
export abstract class PromptTemplateBase {
  public abstract inputVariables: string[];

  public abstract formatPrompt(variables: Record<string, any>): string | Record<string, any>[];
  public abstract preFillVariables(variables: Record<string, string | (() => string)>): PromptTemplateBase;
}

/**
 * Message placeholder for chat templates
 */
export interface MessagePlaceHolder {
  variableName: string;
  type: 'placeholder';
}