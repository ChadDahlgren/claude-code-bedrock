import { type InferencePresetName, type InferencePreset } from './constants.js';
import { type AwsError } from './errors.js';
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
/**
 * Read the current Claude settings with error context
 * Warns to stderr if settings file is corrupted
 */
export declare function readSettings(): ClaudeSettings;
/**
 * Read settings with detailed error context
 */
export declare function readSettingsWithContext(): ReadSettingsResult;
/**
 * Clean up temp file if it exists (call on error recovery)
 */
export declare function cleanupTempFiles(): void;
/**
 * Check if a backup file exists
 */
export declare function hasBackup(): boolean;
/**
 * Restore settings from backup file
 * Returns true if restore was successful
 */
export declare function restoreFromBackup(): boolean;
/**
 * Get the backup file path
 */
export declare function getBackupPath(): string;
/**
 * Write Claude settings (merges with existing)
 * Uses atomic write pattern to prevent corruption
 */
export declare function writeSettings(updates: Partial<ClaudeSettings>): void;
/**
 * Get current Bedrock configuration from settings
 */
export declare function getBedrockConfig(): BedrockConfig | null;
/**
 * Apply Bedrock configuration to settings
 * Also applies balanced inference defaults on initial setup
 */
export declare function applyBedrockConfig(config: {
    profile: string;
    region: string;
    model: string;
}): void;
/**
 * Remove Bedrock configuration from settings
 * Also removes inference settings since they're Bedrock-specific
 */
export declare function removeBedrockConfig(): void;
/**
 * Check if Bedrock is configured
 */
export declare function isBedrockConfigured(): boolean;
/**
 * Get the settings file path
 */
export declare function getSettingsPath(): string;
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
export declare function getInferenceConfig(): InferenceConfig;
/**
 * Apply inference configuration to settings
 * Can use a preset name or custom values
 */
export declare function applyInferenceConfig(config: {
    preset: InferencePresetName;
    thinkingTokens?: number;
    outputTokens?: number;
}): void;
/**
 * Remove inference configuration from settings
 */
export declare function removeInferenceConfig(): void;
/**
 * Get all available inference presets for display
 */
export declare function getInferencePresets(): InferencePreset[];
/**
 * Get a specific preset by name
 */
export declare function getInferencePreset(name: Exclude<InferencePresetName, 'custom'>): InferencePreset;
/**
 * Get the valid token range for custom values
 */
export declare function getInferenceTokenRange(): {
    min: number;
    max: number;
};
