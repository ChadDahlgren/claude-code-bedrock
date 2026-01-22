// Manage inference settings (reasoning tokens, output tokens)
//
// These settings control REASONING time - how long Claude deliberates before responding.
// This is NOT context window or how much of the codebase Claude can see.

import { success, failure } from '../lib/output.js';
import {
  getInferenceConfig,
  applyInferenceConfig,
  getInferencePresets,
  getInferenceTokenRange,
  getSettingsPath,
  isBedrockConfigured,
} from '../lib/config.js';
import { parseArgs, getValue } from '../lib/args.js';
import {
  type InferencePresetName,
  INFERENCE_PRESETS,
  DEFAULT_INFERENCE_PRESET,
} from '../lib/constants.js';

interface GetInferenceResult {
  configured: boolean;
  bedrockConfigured: boolean;
  current: {
    preset: InferencePresetName;
    thinkingTokens: number;
    outputTokens: number;
    promptCachingDisabled: boolean;
  };
  presets: Array<{
    name: string;
    label: string;
    thinkingTokens: number;
    outputTokens: number;
    description: string;
    caveat?: string;
    isDefault: boolean;
  }>;
  tokenRange: {
    min: number;
    max: number;
  };
  settingsPath: string;
}

interface SetInferenceResult {
  applied: boolean;
  config: {
    preset: InferencePresetName;
    thinkingTokens: number;
    outputTokens: number;
  };
  settingsPath: string;
  requiresRestart: boolean;
}

const VALID_PRESETS: InferencePresetName[] = ['focused', 'balanced', 'thorough', 'custom'];

export function inferenceConfig(): void {
  const args = parseArgs();

  // Get parameter values
  const presetArg = getValue(args, 'preset');
  const thinkingArg = getValue(args, 'thinking');
  const outputArg = getValue(args, 'output');

  // If no arguments, return current config and available presets
  if (!presetArg && !thinkingArg && !outputArg) {
    const config = getInferenceConfig();
    const presets = getInferencePresets();
    const range = getInferenceTokenRange();
    const bedrockConfigured = isBedrockConfigured();

    // Check if inference is explicitly configured (has env vars set)
    // vs just returning defaults
    const configured = config.preset !== DEFAULT_INFERENCE_PRESET ||
                       config.thinkingTokens !== INFERENCE_PRESETS[DEFAULT_INFERENCE_PRESET].thinkingTokens;

    success<GetInferenceResult>({
      configured,
      bedrockConfigured,
      current: {
        preset: config.preset,
        thinkingTokens: config.thinkingTokens,
        outputTokens: config.outputTokens,
        promptCachingDisabled: config.promptCachingDisabled,
      },
      presets: presets.map(p => ({
        name: p.name,
        label: p.label,
        thinkingTokens: p.thinkingTokens,
        outputTokens: p.outputTokens,
        description: p.description,
        caveat: p.caveat,
        isDefault: p.name === DEFAULT_INFERENCE_PRESET,
      })),
      tokenRange: range,
      settingsPath: getSettingsPath(),
    });
    return;
  }

  // Check if Bedrock is configured first
  if (!isBedrockConfigured()) {
    failure('Bedrock is not configured. Run /bedrock setup first.');
  }

  // Determine preset and values
  let preset: InferencePresetName;
  let thinkingTokens: number | undefined;
  let outputTokens: number | undefined;

  if (presetArg) {
    // Validate preset name
    if (!VALID_PRESETS.includes(presetArg as InferencePresetName)) {
      failure(`Invalid preset: ${presetArg}. Valid options: ${VALID_PRESETS.join(', ')}`);
    }
    preset = presetArg as InferencePresetName;

    // If custom, require thinking and output values
    if (preset === 'custom') {
      if (!thinkingArg || !outputArg) {
        failure('Custom preset requires --thinking=<tokens> and --output=<tokens>');
      }

      const range = getInferenceTokenRange();
      thinkingTokens = parseInt(thinkingArg, 10);
      outputTokens = parseInt(outputArg, 10);

      if (isNaN(thinkingTokens) || isNaN(outputTokens)) {
        failure('Invalid token values. Must be integers.');
      }

      if (thinkingTokens < range.min || thinkingTokens > range.max) {
        failure(`Thinking tokens must be between ${range.min} and ${range.max}`);
      }

      if (outputTokens < range.min || outputTokens > range.max) {
        failure(`Output tokens must be between ${range.min} and ${range.max}`);
      }
    }
  } else {
    // No preset specified, but has custom values - treat as custom
    preset = 'custom';

    if (!thinkingArg || !outputArg) {
      failure('Either specify --preset=<name> or both --thinking=<tokens> and --output=<tokens>');
    }

    const range = getInferenceTokenRange();
    thinkingTokens = parseInt(thinkingArg, 10);
    outputTokens = parseInt(outputArg, 10);

    if (isNaN(thinkingTokens) || isNaN(outputTokens)) {
      failure('Invalid token values. Must be integers.');
    }

    if (thinkingTokens < range.min || thinkingTokens > range.max) {
      failure(`Thinking tokens must be between ${range.min} and ${range.max}`);
    }

    if (outputTokens < range.min || outputTokens > range.max) {
      failure(`Output tokens must be between ${range.min} and ${range.max}`);
    }
  }

  // Apply the configuration
  applyInferenceConfig({
    preset,
    thinkingTokens,
    outputTokens,
  });

  // Get the applied config to return actual values
  const appliedConfig = getInferenceConfig();

  success<SetInferenceResult>({
    applied: true,
    config: {
      preset: appliedConfig.preset,
      thinkingTokens: appliedConfig.thinkingTokens,
      outputTokens: appliedConfig.outputTokens,
    },
    settingsPath: getSettingsPath(),
    requiresRestart: true,
  });
}
