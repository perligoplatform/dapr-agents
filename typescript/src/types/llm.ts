import { z } from 'zod';

/**
 * ElevenLabs Client Configuration
 */
export const ElevenLabsClientConfigSchema = z.object({
  /** Base URL for the ElevenLabs API */
  baseUrl: z.enum(['https://api.elevenlabs.io', 'https://api.us.elevenlabs.io'])
    .default('https://api.elevenlabs.io'),
  /** API key to authenticate with the ElevenLabs API */
  apiKey: z.string().optional(),
});

export type ElevenLabsClientConfig = z.infer<typeof ElevenLabsClientConfigSchema>;

/**
 * NVIDIA Client Configuration
 */
export const NVIDIAClientConfigSchema = z.object({
  /** Base URL for the NVIDIA API */
  baseUrl: z.string().default('https://integrate.api.nvidia.com/v1'),
  /** API key to authenticate the NVIDIA API */
  apiKey: z.string().optional(),
});

export type NVIDIAClientConfig = z.infer<typeof NVIDIAClientConfigSchema>;

/**
 * Hugging Face Inference Client Configuration
 */
export const HFInferenceClientConfigSchema = z.object({
  /** Model ID on Hugging Face Hub or a URL to a deployed endpoint */
  model: z.string().optional(),
  /** Inference provider to use */
  hfProvider: z.string().default('auto'),
  /** Hugging Face access token for authentication */
  token: z.union([z.string(), z.boolean()]).optional(),
  /** Alias for token */
  apiKey: z.union([z.string(), z.boolean()]).optional(),
  /** Custom endpoint URL for inference */
  baseUrl: z.string().optional(),
  /** Maximum seconds to wait for a response */
  timeout: z.number().optional(),
  /** Extra HTTP headers to send with requests */
  headers: z.record(z.string()).default({}),
  /** Extra cookies to send with requests */
  cookies: z.record(z.string()).default({}),
  /** Proxy settings for HTTP requests */
  proxies: z.unknown().optional(),
  /** Billing account for requests */
  billTo: z.string().optional(),
});

export type HFInferenceClientConfig = z.infer<typeof HFInferenceClientConfigSchema>;

/**
 * OpenAI Client Configuration
 */
export const OpenAIClientConfigSchema = z.object({
  /** Base URL for the OpenAI API */
  baseUrl: z.string().optional(),
  /** API key to authenticate the OpenAI API */
  apiKey: z.string().optional(),
  /** Organization name for OpenAI */
  organization: z.string().optional(),
  /** OpenAI project name */
  project: z.string().optional(),
});

export type OpenAIClientConfig = z.infer<typeof OpenAIClientConfigSchema>;

/**
 * Azure OpenAI Client Configuration
 */
export const AzureOpenAIClientConfigSchema = z.object({
  /** API key to authenticate the Azure OpenAI API */
  apiKey: z.string().optional(),
  /** Azure Active Directory token for authentication */
  azureAdToken: z.string().optional(),
  /** Azure organization associated with the OpenAI resource */
  organization: z.string().optional(),
  /** Azure project associated with the OpenAI resource */
  project: z.string().optional(),
  /** API version for Azure OpenAI models */
  apiVersion: z.string().default('2024-07-01-preview'),
  /** Azure endpoint for Azure OpenAI models */
  azureEndpoint: z.string().optional(),
  /** Azure deployment for Azure OpenAI models */
  azureDeployment: z.string().optional(),
  /** Client ID for Managed Identity authentication */
  azureClientId: z.string().optional(),
});

export type AzureOpenAIClientConfig = z.infer<typeof AzureOpenAIClientConfigSchema>;

/**
 * Dapr Inference Client Configuration
 */
export const DaprInferenceClientConfigSchema = z.object({
  /** Dapr LLM component name */
  componentName: z.string().optional(),
  /** Context ID for conversation tracking */
  contextId: z.string().optional(),
  /** Whether to scrub PII from messages */
  scrubPii: z.boolean().optional(),
  /** Temperature for generation */
  temperature: z.number().optional(),
  /** Additional parameters */
  parameters: z.record(z.any()).optional(),
});

export type DaprInferenceClientConfig = z.infer<typeof DaprInferenceClientConfigSchema>;

/**
 * Model Configuration Types
 */
export const OpenAIModelConfigSchema = OpenAIClientConfigSchema.extend({
  type: z.literal('openai'),
  name: z.string(),
});

export type OpenAIModelConfig = z.infer<typeof OpenAIModelConfigSchema>;

export const AzureOpenAIModelConfigSchema = AzureOpenAIClientConfigSchema.extend({
  type: z.literal('azure_openai'),
});

export type AzureOpenAIModelConfig = z.infer<typeof AzureOpenAIModelConfigSchema>;

export const HFHubModelConfigSchema = HFInferenceClientConfigSchema.extend({
  type: z.literal('huggingface'),
  name: z.string().optional(),
});

export type HFHubModelConfig = z.infer<typeof HFHubModelConfigSchema>;

export const NVIDIAModelConfigSchema = NVIDIAClientConfigSchema.extend({
  type: z.literal('nvidia'),
  name: z.string().optional(),
});

export type NVIDIAModelConfig = z.infer<typeof NVIDIAModelConfigSchema>;

/**
 * OpenAI Parameters Base
 */
export const OpenAIParamsBaseSchema = z.object({
  /** ID of the model to use */
  model: z.string().optional(),
  /** Sampling temperature */
  temperature: z.number().min(0.0).max(2.0).default(0),
  /** Maximum number of tokens to generate */
  maxTokens: z.number().positive().optional(),
  /** Nucleus sampling probability mass */
  topP: z.number().min(0.0).max(1.0).default(1.0),
  /** Frequency penalty */
  frequencyPenalty: z.number().min(-2.0).max(2.0).default(0.0),
  /** Presence penalty */
  presencePenalty: z.number().min(-2.0).max(2.0).default(0.0),
  /** Stop sequences */
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  /** Whether to stream responses */
  stream: z.boolean().default(false),
});

export type OpenAIParamsBase = z.infer<typeof OpenAIParamsBaseSchema>;

/**
 * OpenAI Chat Completion Parameters
 */
export const OpenAIChatCompletionParamsSchema = OpenAIParamsBaseSchema.extend({
  /** Modify likelihood of specified tokens */
  logitBias: z.record(z.union([z.string(), z.number()]), z.number()).optional(),
  /** Whether to return log probabilities */
  logprobs: z.boolean().default(false),
  /** Number of top log probabilities to return */
  topLogprobs: z.number().min(0).max(20).optional(),
  /** Number of chat completion choices to generate */
  n: z.number().min(1).max(128).default(1),
  /** Format of the response */
  responseFormat: z.record(z.literal('type'), z.enum(['text', 'json_object'])).optional(),
  /** List of tools the model may call */
  tools: z.array(z.record(z.unknown())).max(64).optional(),
  /** Controls which tool is called */
  toolChoice: z.union([z.string(), z.record(z.unknown())]).optional(),
  /** Controls which function is called */
  functionCall: z.union([z.string(), z.record(z.unknown())]).optional(),
  /** Seed for deterministic sampling */
  seed: z.number().optional(),
  /** Unique identifier representing the end-user */
  user: z.string().optional(),
});

export type OpenAIChatCompletionParams = z.infer<typeof OpenAIChatCompletionParamsSchema>;

/**
 * Hugging Face Hub Chat Completion Parameters
 */
export const HFHubChatCompletionParamsSchema = z.object({
  /** The model to use for chat-completion */
  model: z.string().optional(),
  /** Penalizes new tokens based on their existing frequency */
  frequencyPenalty: z.number().default(0.0),
  /** Modify the likelihood of specified tokens */
  logitBias: z.record(z.union([z.string(), z.number()]), z.number()).optional(),
  /** Whether to return log probabilities */
  logprobs: z.boolean().default(false),
  /** Maximum number of tokens allowed in the response */
  maxTokens: z.number().min(1).default(100),
  /** UNUSED. Included for compatibility */
  n: z.number().optional(),
  /** Penalizes new tokens based on their presence */
  presencePenalty: z.number().default(0.0),
  /** Grammar constraints */
  responseFormat: z.union([z.record(z.unknown()), z.string()]).optional(),
  /** Seed for reproducible control flow */
  seed: z.number().optional(),
  /** Up to four strings which trigger the end of the response */
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  /** Enable realtime streaming of responses */
  stream: z.boolean().default(false),
  /** Options for streaming completions */
  streamOptions: z.record(z.unknown()).optional(),
  /** Controls randomness of the generations */
  temperature: z.number().default(1.0),
  /** Number of most likely tokens to return at each position */
  topLogprobs: z.number().optional(),
  /** Fraction of the most likely next words to sample from */
  topP: z.number().optional(),
  /** The tool to use for the completion */
  toolChoice: z.union([z.string(), z.record(z.unknown())]).optional(),
  /** A prompt to be appended before the tools */
  toolPrompt: z.string().optional(),
  /** A list of tools the model may call */
  tools: z.array(z.record(z.unknown())).optional(),
});

export type HFHubChatCompletionParams = z.infer<typeof HFHubChatCompletionParamsSchema>;

/**
 * NVIDIA Chat Completion Parameters
 */
export const NVIDIAChatCompletionParamsSchema = OpenAIParamsBaseSchema.extend({
  /** Modify likelihood of specified tokens */
  logitBias: z.record(z.union([z.string(), z.number()]), z.number()).optional(),
  /** Whether to return log probabilities */
  logprobs: z.boolean().default(false),
  /** Number of top log probabilities to return */
  topLogprobs: z.number().min(0).max(20).optional(),
  /** Number of chat completion choices to generate */
  n: z.number().min(1).max(128).default(1),
  /** List of tools the model may call */
  tools: z.array(z.record(z.unknown())).max(64).optional(),
  /** Controls which tool is called */
  toolChoice: z.union([z.string(), z.record(z.unknown())]).optional(),
});

export type NVIDIAChatCompletionParams = z.infer<typeof NVIDIAChatCompletionParamsSchema>;

/**
 * Audio Speech Request
 */
export const AudioSpeechRequestSchema = z.object({
  /** TTS model to use */
  model: z.enum(['tts-1', 'tts-1-hd']).default('tts-1'),
  /** Text to generate audio for */
  input: z.string(),
  /** Voice to use */
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  /** Audio format */
  responseFormat: z.enum(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm']).default('mp3'),
  /** Speed of the audio */
  speed: z.number().min(0.25).max(4.0).default(1.0),
});

export type AudioSpeechRequest = z.infer<typeof AudioSpeechRequestSchema>;

/**
 * Audio Transcription Request
 */
export const AudioTranscriptionRequestSchema = z.object({
  /** Model to use */
  model: z.enum(['whisper-1']).default('whisper-1'),
  /** Audio file content */
  file: z.union([
    z.instanceof(ArrayBuffer),
    z.instanceof(Uint8Array),
    z.string(), // file path
  ]),
  /** Language of the audio in ISO-639-1 format */
  language: z.string().optional(),
  /** Optional prompt for the transcription */
  prompt: z.string().optional(),
  /** Response format */
  responseFormat: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).default('json'),
  /** Sampling temperature */
  temperature: z.number().min(0.0).max(1.0).default(0.0),
  /** Granularity of timestamps */
  timestampGranularities: z.array(z.enum(['word', 'segment'])).optional(),
});

export type AudioTranscriptionRequest = z.infer<typeof AudioTranscriptionRequestSchema>;

/**
 * Audio Translation Request
 */
export const AudioTranslationRequestSchema = z.object({
  /** Model to use */
  model: z.enum(['whisper-1']).default('whisper-1'),
  /** Audio file content */
  file: z.union([
    z.instanceof(ArrayBuffer),
    z.instanceof(Uint8Array),
    z.string(), // file path
  ]),
  /** Optional prompt for the translation */
  prompt: z.string().optional(),
  /** Response format */
  responseFormat: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).default('json'),
  /** Sampling temperature */
  temperature: z.number().min(0.0).max(1.0).default(0.0),
});

export type AudioTranslationRequest = z.infer<typeof AudioTranslationRequestSchema>;

/**
 * Audio Response Types
 */
export const AudioTranscriptionResponseSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
  segments: z.array(z.record(z.union([z.string(), z.number(), z.array(z.number())]))).optional(),
});

export type AudioTranscriptionResponse = z.infer<typeof AudioTranscriptionResponseSchema>;

export const AudioTranslationResponseSchema = z.object({
  text: z.string(),
});

export type AudioTranslationResponse = z.infer<typeof AudioTranslationResponseSchema>;

/**
 * Union type for all model configurations
 */
export const ModelConfigSchema = z.union([
  OpenAIModelConfigSchema,
  AzureOpenAIModelConfigSchema,
  HFHubModelConfigSchema,
  NVIDIAModelConfigSchema,
]);

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Union type for all completion parameters
 */
export const CompletionParamsSchema = z.union([
  OpenAIChatCompletionParamsSchema,
  HFHubChatCompletionParamsSchema,
  NVIDIAChatCompletionParamsSchema,
]);

export type CompletionParams = z.infer<typeof CompletionParamsSchema>;

/**
 * Helper functions for creating LLM configurations
 */
export function createOpenAIConfig(
  apiKey: string,
  options?: Partial<OpenAIClientConfig>
): OpenAIClientConfig {
  return OpenAIClientConfigSchema.parse({
    apiKey,
    ...options,
  });
}

export function createAzureOpenAIConfig(
  options: Partial<AzureOpenAIClientConfig>
): AzureOpenAIClientConfig {
  return AzureOpenAIClientConfigSchema.parse(options);
}

export function createHFConfig(
  options?: Partial<HFInferenceClientConfig>
): HFInferenceClientConfig {
  return HFInferenceClientConfigSchema.parse(options ?? {});
}

export function createNVIDIAConfig(
  apiKey: string,
  options?: Partial<NVIDIAClientConfig>
): NVIDIAClientConfig {
  return NVIDIAClientConfigSchema.parse({
    apiKey,
    ...options,
  });
}