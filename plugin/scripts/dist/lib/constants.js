// Centralized constants to avoid magic strings and ensure consistency
import { homedir } from 'os';
import { join } from 'path';
/**
 * Environment variable names used in Claude settings
 */
export const ENV_KEYS = {
    USE_BEDROCK: 'CLAUDE_CODE_USE_BEDROCK',
    AWS_PROFILE: 'AWS_PROFILE',
    AWS_REGION: 'AWS_REGION',
    ANTHROPIC_MODEL: 'ANTHROPIC_MODEL',
    // Inference settings
    MAX_THINKING_TOKENS: 'MAX_THINKING_TOKENS',
    MAX_OUTPUT_TOKENS: 'CLAUDE_CODE_MAX_OUTPUT_TOKENS',
    DISABLE_PROMPT_CACHING: 'DISABLE_PROMPT_CACHING',
};
/**
 * Values for environment variables
 */
export const ENV_VALUES = {
    BEDROCK_ENABLED: '1',
};
/**
 * File paths
 */
export const PATHS = {
    CLAUDE_DIR: join(homedir(), '.claude'),
    SETTINGS_FILE: join(homedir(), '.claude', 'settings.json'),
    SETTINGS_BACKUP: join(homedir(), '.claude', 'settings.json.backup'),
    SETTINGS_TEMP: join(homedir(), '.claude', 'settings.json.tmp'),
};
/**
 * File permissions (octal)
 */
export const PERMISSIONS = {
    DIRECTORY: 0o700, // Owner read/write/execute only
    FILE: 0o600, // Owner read/write only
};
/**
 * AWS credential export keys
 */
export const AWS_CRED_KEYS = {
    ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
    SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
    SESSION_TOKEN: 'AWS_SESSION_TOKEN',
    EXPIRATION: 'AWS_CREDENTIAL_EXPIRATION',
};
export const INFERENCE_PRESETS = {
    focused: {
        name: 'focused',
        label: 'Focused',
        thinkingTokens: 4096,
        outputTokens: 4096,
        description: 'Quick deliberation. Best for routine tasks and clear problems.',
        caveat: 'May not fully analyze complex tradeoffs.',
    },
    balanced: {
        name: 'balanced',
        label: 'Balanced',
        thinkingTokens: 8192,
        outputTokens: 8192,
        description: 'Solid reasoning without overthinking.',
    },
    thorough: {
        name: 'thorough',
        label: 'Thorough',
        thinkingTokens: 16384,
        outputTokens: 16384,
        description: 'Extended deliberation for architectural decisions.',
        caveat: 'May over-engineer straightforward problems.',
    },
};
/**
 * Valid range for inference token settings
 */
export const INFERENCE_TOKEN_RANGE = {
    MIN: 4096,
    MAX: 16384,
};
/**
 * Default inference preset
 */
export const DEFAULT_INFERENCE_PRESET = 'balanced';
