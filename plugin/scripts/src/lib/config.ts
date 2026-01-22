// Settings file helpers

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  ENV_KEYS,
  ENV_VALUES,
  PATHS,
  PERMISSIONS,
  INFERENCE_PRESETS,
  DEFAULT_INFERENCE_PRESET,
  INFERENCE_TOKEN_RANGE,
  type InferencePresetName,
  type StandardPresetName,
  type InferencePreset,
} from './constants.js';
import { createConfigError, type AwsError } from './errors.js';
import { debug } from './progress.js';

export interface BedrockConfig {
  profile: string | null;
  region: string | null;
  model: string | null;
}

export interface ClaudeSettings {
  env?: Record<string, string>;
  awsAuthRefresh?: string;
  model?: string;
  [key: string]: unknown;
}

export interface ReadSettingsResult {
  settings: ClaudeSettings;
  error?: AwsError;
  wasCorrupted?: boolean;
}

const SETTINGS_PATH = PATHS.SETTINGS_FILE;
const SETTINGS_BACKUP_PATH = PATHS.SETTINGS_BACKUP;
const SETTINGS_TEMP_PATH = PATHS.SETTINGS_TEMP;

/**
 * Basic schema validation for settings
 * Returns null if valid, error message if invalid
 */
function validateSettingsSchema(settings: unknown): string | null {
  if (typeof settings !== 'object' || settings === null) {
    return 'Settings must be an object';
  }

  const obj = settings as Record<string, unknown>;

  // env must be an object if present
  if (obj.env !== undefined) {
    if (typeof obj.env !== 'object' || obj.env === null || Array.isArray(obj.env)) {
      return 'settings.env must be an object';
    }
    // All env values must be strings
    for (const [key, value] of Object.entries(obj.env as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        return `settings.env.${key} must be a string, got ${typeof value}`;
      }
    }
  }

  // awsAuthRefresh must be a string if present
  if (obj.awsAuthRefresh !== undefined && typeof obj.awsAuthRefresh !== 'string') {
    return 'settings.awsAuthRefresh must be a string';
  }

  // model must be a string if present
  if (obj.model !== undefined && typeof obj.model !== 'string') {
    return 'settings.model must be a string';
  }

  return null;
}

/**
 * Read the current Claude settings with error context
 * Warns to stderr if settings file is corrupted
 */
export function readSettings(): ClaudeSettings {
  const result = readSettingsWithContext();

  if (result.wasCorrupted) {
    debug('WARNING: Settings file was corrupted. Using empty settings.');
    debug(`Backup may exist at: ${SETTINGS_BACKUP_PATH}`);
  }

  return result.settings;
}

/**
 * Read settings with detailed error context
 */
export function readSettingsWithContext(): ReadSettingsResult {
  try {
    if (!existsSync(SETTINGS_PATH)) {
      return { settings: {} };
    }
    const content = readFileSync(SETTINGS_PATH, 'utf-8');

    // Check for empty file
    if (!content.trim()) {
      return { settings: {} };
    }

    try {
      const parsed = JSON.parse(content);

      // Validate schema
      const schemaError = validateSettingsSchema(parsed);
      if (schemaError) {
        const error = createConfigError('corrupted', schemaError);
        return {
          settings: {},
          error,
          wasCorrupted: true
        };
      }

      return { settings: parsed as ClaudeSettings };
    } catch (parseError) {
      // JSON is corrupted - return empty but flag the error
      const error = createConfigError('corrupted', `Invalid JSON in settings file: ${parseError}`);
      return {
        settings: {},
        error,
        wasCorrupted: true
      };
    }
  } catch (readError) {
    // File read error (permissions, etc.)
    return {
      settings: {},
      error: createConfigError('corrupted', `Cannot read settings file: ${readError}`)
    };
  }
}

/**
 * Write settings atomically using temp file + rename pattern
 * This prevents corruption from interrupted writes or race conditions
 */
function writeSettingsAtomic(settings: ClaudeSettings, createBackup: boolean = true): void {
  const dir = dirname(SETTINGS_PATH);

  // Ensure directory exists with secure permissions
  if (!existsSync(dir)) {
    mkdirSync(dir, { mode: PERMISSIONS.DIRECTORY, recursive: true });
  }

  // Create backup of existing file before writing
  if (createBackup && existsSync(SETTINGS_PATH)) {
    try {
      copyFileSync(SETTINGS_PATH, SETTINGS_BACKUP_PATH);
    } catch {
      // Backup failed - continue anyway, it's not critical
    }
  }

  // Write to temp file first
  const content = JSON.stringify(settings, null, 2) + '\n';
  writeFileSync(SETTINGS_TEMP_PATH, content, { mode: PERMISSIONS.FILE });

  // Atomic rename (this is atomic on POSIX filesystems)
  renameSync(SETTINGS_TEMP_PATH, SETTINGS_PATH);
}

/**
 * Clean up temp file if it exists (call on error recovery)
 */
export function cleanupTempFiles(): void {
  try {
    if (existsSync(SETTINGS_TEMP_PATH)) {
      unlinkSync(SETTINGS_TEMP_PATH);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Check if a backup file exists
 */
export function hasBackup(): boolean {
  return existsSync(SETTINGS_BACKUP_PATH);
}

/**
 * Restore settings from backup file
 * Returns true if restore was successful
 */
export function restoreFromBackup(): boolean {
  try {
    if (!existsSync(SETTINGS_BACKUP_PATH)) {
      return false;
    }

    // Verify backup is valid JSON before restoring
    const content = readFileSync(SETTINGS_BACKUP_PATH, 'utf-8');
    JSON.parse(content); // Will throw if invalid

    // Atomic restore
    copyFileSync(SETTINGS_BACKUP_PATH, SETTINGS_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the backup file path
 */
export function getBackupPath(): string {
  return SETTINGS_BACKUP_PATH;
}

/**
 * Write Claude settings (merges with existing)
 * Uses atomic write pattern to prevent corruption
 */
export function writeSettings(updates: Partial<ClaudeSettings>): void {
  const current = readSettings();
  const merged = { ...current, ...updates };
  writeSettingsAtomic(merged);
}

/**
 * Get current Bedrock configuration from settings
 */
export function getBedrockConfig(): BedrockConfig | null {
  const settings = readSettings();
  const env = settings.env || {};

  if (env[ENV_KEYS.USE_BEDROCK] !== ENV_VALUES.BEDROCK_ENABLED) {
    return null;
  }

  return {
    profile: env[ENV_KEYS.AWS_PROFILE] || null,
    region: env[ENV_KEYS.AWS_REGION] || null,
    model: env[ENV_KEYS.ANTHROPIC_MODEL] || null
  };
}

/**
 * Apply Bedrock configuration to settings
 * Also applies balanced inference defaults on initial setup
 */
export function applyBedrockConfig(config: {
  profile: string;
  region: string;
  model: string;
}): void {
  const settings = readSettings();
  const existingEnv = settings.env || {};

  // Get balanced preset defaults for inference settings
  const balancedPreset = INFERENCE_PRESETS[DEFAULT_INFERENCE_PRESET];

  writeSettings({
    ...settings,
    env: {
      ...existingEnv,
      [ENV_KEYS.USE_BEDROCK]: ENV_VALUES.BEDROCK_ENABLED,
      [ENV_KEYS.AWS_PROFILE]: config.profile,
      [ENV_KEYS.AWS_REGION]: config.region,
      [ENV_KEYS.ANTHROPIC_MODEL]: config.model,
      // Apply balanced inference defaults (user can change via Thinking Mode later)
      [ENV_KEYS.MAX_THINKING_TOKENS]: existingEnv[ENV_KEYS.MAX_THINKING_TOKENS] || balancedPreset.thinkingTokens.toString(),
      [ENV_KEYS.MAX_OUTPUT_TOKENS]: existingEnv[ENV_KEYS.MAX_OUTPUT_TOKENS] || balancedPreset.outputTokens.toString(),
      [ENV_KEYS.DISABLE_PROMPT_CACHING]: existingEnv[ENV_KEYS.DISABLE_PROMPT_CACHING] || '0',
    },
    awsAuthRefresh: `aws sso login --profile ${config.profile}`
  });
}

/**
 * Check if a model ID is a Bedrock model (has provider prefix and version suffix)
 */
function isBedrockModel(modelId: string | undefined): boolean {
  if (!modelId) return false;
  // Bedrock models have format like: us.anthropic.claude-xxx:0 or global.anthropic.claude-xxx:0
  return /^(us|eu|ap|global)\.anthropic\./.test(modelId) && modelId.includes(':');
}

/**
 * Remove Bedrock configuration from settings
 * Also removes inference settings since they're Bedrock-specific
 */
export function removeBedrockConfig(): void {
  const settings = readSettings();
  const env = { ...(settings.env || {}) };

  // Remove Bedrock config
  delete env[ENV_KEYS.USE_BEDROCK];
  delete env[ENV_KEYS.AWS_PROFILE];
  delete env[ENV_KEYS.AWS_REGION];
  delete env[ENV_KEYS.ANTHROPIC_MODEL];

  // Also remove inference settings (Bedrock-specific)
  delete env[ENV_KEYS.MAX_THINKING_TOKENS];
  delete env[ENV_KEYS.MAX_OUTPUT_TOKENS];
  delete env[ENV_KEYS.DISABLE_PROMPT_CACHING];

  const updated = { ...settings };
  delete updated.awsAuthRefresh;

  // Also remove root-level model if it's a Bedrock model
  if (isBedrockModel(updated.model)) {
    delete updated.model;
  }

  if (Object.keys(env).length > 0) {
    updated.env = env;
  } else {
    delete updated.env;
  }

  // Write using atomic pattern
  writeSettingsAtomic(updated);
}

/**
 * Check if Bedrock is configured
 */
export function isBedrockConfigured(): boolean {
  return getBedrockConfig() !== null;
}

/**
 * Get the settings file path
 */
export function getSettingsPath(): string {
  return SETTINGS_PATH;
}

// ============================================================================
// Inference Configuration
// ============================================================================

export interface InferenceConfig {
  preset: InferencePresetName;
  thinkingTokens: number;
  outputTokens: number;
  promptCachingDisabled: boolean;
}

/**
 * Get current inference configuration from settings
 * Returns the preset name and current values
 */
export function getInferenceConfig(): InferenceConfig {
  const settings = readSettings();
  const env = settings.env || {};

  const thinkingTokens = parseInt(env[ENV_KEYS.MAX_THINKING_TOKENS] || '0', 10);
  const outputTokens = parseInt(env[ENV_KEYS.MAX_OUTPUT_TOKENS] || '0', 10);
  const promptCachingDisabled = env[ENV_KEYS.DISABLE_PROMPT_CACHING] === '1';

  // Determine which preset matches (if any)
  let preset: InferencePresetName = 'custom';

  if (thinkingTokens === 0 && outputTokens === 0) {
    // No inference settings configured - return default
    const defaultPreset = INFERENCE_PRESETS[DEFAULT_INFERENCE_PRESET];
    return {
      preset: DEFAULT_INFERENCE_PRESET,
      thinkingTokens: defaultPreset.thinkingTokens,
      outputTokens: defaultPreset.outputTokens,
      promptCachingDisabled: false,
    };
  }

  // Check if current values match a preset
  for (const [name, presetConfig] of Object.entries(INFERENCE_PRESETS)) {
    if (
      thinkingTokens === presetConfig.thinkingTokens &&
      outputTokens === presetConfig.outputTokens
    ) {
      preset = name as InferencePresetName;
      break;
    }
  }

  return {
    preset,
    thinkingTokens: thinkingTokens || INFERENCE_PRESETS[DEFAULT_INFERENCE_PRESET].thinkingTokens,
    outputTokens: outputTokens || INFERENCE_PRESETS[DEFAULT_INFERENCE_PRESET].outputTokens,
    promptCachingDisabled,
  };
}

/**
 * Apply inference configuration to settings
 * Can use a preset name or custom values
 */
export function applyInferenceConfig(config: {
  preset: InferencePresetName;
  thinkingTokens?: number;
  outputTokens?: number;
}): void {
  const settings = readSettings();

  let thinkingTokens: number;
  let outputTokens: number;

  if (config.preset === 'custom') {
    // Custom values - validate they're in range
    thinkingTokens = Math.max(
      INFERENCE_TOKEN_RANGE.MIN,
      Math.min(INFERENCE_TOKEN_RANGE.MAX, config.thinkingTokens || INFERENCE_TOKEN_RANGE.MIN)
    );
    outputTokens = Math.max(
      INFERENCE_TOKEN_RANGE.MIN,
      Math.min(INFERENCE_TOKEN_RANGE.MAX, config.outputTokens || INFERENCE_TOKEN_RANGE.MIN)
    );
  } else {
    // Use preset values - config.preset is now narrowed to StandardPresetName
    const presetName = config.preset as StandardPresetName;
    const preset = INFERENCE_PRESETS[presetName];
    thinkingTokens = preset.thinkingTokens;
    outputTokens = preset.outputTokens;
  }

  writeSettings({
    ...settings,
    env: {
      ...(settings.env || {}),
      [ENV_KEYS.MAX_THINKING_TOKENS]: thinkingTokens.toString(),
      [ENV_KEYS.MAX_OUTPUT_TOKENS]: outputTokens.toString(),
      // Explicitly set prompt caching to enabled (0 = enabled)
      [ENV_KEYS.DISABLE_PROMPT_CACHING]: '0',
    },
  });
}

/**
 * Remove inference configuration from settings
 */
export function removeInferenceConfig(): void {
  const settings = readSettings();
  const env = { ...(settings.env || {}) };

  delete env[ENV_KEYS.MAX_THINKING_TOKENS];
  delete env[ENV_KEYS.MAX_OUTPUT_TOKENS];
  delete env[ENV_KEYS.DISABLE_PROMPT_CACHING];

  const updated = { ...settings };

  if (Object.keys(env).length > 0) {
    updated.env = env;
  } else {
    delete updated.env;
  }

  writeSettingsAtomic(updated);
}

/**
 * Get all available inference presets for display
 */
export function getInferencePresets(): InferencePreset[] {
  return Object.values(INFERENCE_PRESETS);
}

/**
 * Get a specific preset by name
 */
export function getInferencePreset(name: Exclude<InferencePresetName, 'custom'>): InferencePreset {
  return INFERENCE_PRESETS[name];
}

/**
 * Get the valid token range for custom values
 */
export function getInferenceTokenRange(): { min: number; max: number } {
  return { min: INFERENCE_TOKEN_RANGE.MIN, max: INFERENCE_TOKEN_RANGE.MAX };
}
