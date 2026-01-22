/**
 * Environment variable names used in Claude settings
 */
export declare const ENV_KEYS: {
    readonly USE_BEDROCK: "CLAUDE_CODE_USE_BEDROCK";
    readonly AWS_PROFILE: "AWS_PROFILE";
    readonly AWS_REGION: "AWS_REGION";
    readonly ANTHROPIC_MODEL: "ANTHROPIC_MODEL";
    readonly MAX_THINKING_TOKENS: "MAX_THINKING_TOKENS";
    readonly MAX_OUTPUT_TOKENS: "CLAUDE_CODE_MAX_OUTPUT_TOKENS";
    readonly DISABLE_PROMPT_CACHING: "DISABLE_PROMPT_CACHING";
};
/**
 * Values for environment variables
 */
export declare const ENV_VALUES: {
    readonly BEDROCK_ENABLED: "1";
};
/**
 * File paths
 */
export declare const PATHS: {
    readonly CLAUDE_DIR: string;
    readonly SETTINGS_FILE: string;
    readonly SETTINGS_BACKUP: string;
    readonly SETTINGS_TEMP: string;
};
/**
 * File permissions (octal)
 */
export declare const PERMISSIONS: {
    readonly DIRECTORY: 448;
    readonly FILE: 384;
};
/**
 * AWS credential export keys
 */
export declare const AWS_CRED_KEYS: {
    readonly ACCESS_KEY_ID: "AWS_ACCESS_KEY_ID";
    readonly SECRET_ACCESS_KEY: "AWS_SECRET_ACCESS_KEY";
    readonly SESSION_TOKEN: "AWS_SESSION_TOKEN";
    readonly EXPIRATION: "AWS_CREDENTIAL_EXPIRATION";
};
/**
 * Inference preset configuration
 * Controls REASONING time - how long Claude deliberates before responding.
 * This is NOT context window or how much of the codebase Claude can see.
 */
export type InferencePresetName = 'focused' | 'balanced' | 'thorough' | 'custom';
export interface InferencePreset {
    name: InferencePresetName;
    label: string;
    thinkingTokens: number;
    outputTokens: number;
    description: string;
    caveat?: string;
}
export declare const INFERENCE_PRESETS: Record<Exclude<InferencePresetName, 'custom'>, InferencePreset>;
/**
 * Valid range for inference token settings
 */
export declare const INFERENCE_TOKEN_RANGE: {
    readonly MIN: 4096;
    readonly MAX: 16384;
};
/**
 * Standard preset names (excludes 'custom')
 */
export type StandardPresetName = Exclude<InferencePresetName, 'custom'>;
/**
 * Default inference preset
 */
export declare const DEFAULT_INFERENCE_PRESET: StandardPresetName;
