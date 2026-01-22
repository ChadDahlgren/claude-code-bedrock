// Apply Bedrock configuration to Claude settings

import { success, failure } from '../lib/output.js';
import { applyBedrockConfig, removeBedrockConfig, getBedrockConfig, getSettingsPath } from '../lib/config.js';
import { getCallerIdentity, listInferenceProfiles, findBedrockRegions } from '../lib/aws.js';
import { parseArgs, hasFlag, getValue } from '../lib/args.js';

interface ApplyConfigResult {
  applied: boolean;
  config: {
    profile: string;
    region: string;
    model: string;
  };
  settingsPath: string;
  requiresRestart: boolean;
}

interface RemoveConfigResult {
  removed: boolean;
  settingsPath: string;
}

// Alternate regions are now fetched dynamically from aws.ts

export function applyConfig(): void {
  const args = parseArgs();

  // Handle remove
  if (hasFlag(args, 'remove')) {
    removeBedrockConfig();
    success<RemoveConfigResult>({
      removed: true,
      settingsPath: getSettingsPath()
    });
    return;
  }

  // Get values
  const profile = getValue(args, 'profile');
  const region = getValue(args, 'region');
  const model = getValue(args, 'model');

  // Validate required args
  if (!profile) {
    failure('Missing required argument: --profile=<profile-name>');
  }
  if (!region) {
    failure('Missing required argument: --region=<aws-region>');
  }
  if (!model) {
    failure('Missing required argument: --model=<model-id>');
  }

  // Validate profile exists and has valid credentials
  const identityResult = getCallerIdentity(profile!);
  if (!identityResult.identity) {
    const errorMsg = identityResult.error
      ? `${identityResult.error.message}. ${identityResult.error.suggestion || ''}`
      : `Profile '${profile}' does not exist or has expired credentials. Run 'aws sso login --profile ${profile}' first.`;
    failure(errorMsg.trim());
  }

  // Validate Bedrock access
  const inferenceProfiles = listInferenceProfiles(profile!, region!);
  if (inferenceProfiles.length === 0) {
    // Find working regions dynamically
    const workingRegions = findBedrockRegions(profile!, region, 2);

    let msg = `Profile '${profile}' does not have Bedrock access in region '${region}'.`;
    if (workingRegions.length > 0) {
      msg += ` Try: ${workingRegions.join(' or ')}`;
    } else {
      msg += ' Check IAM permissions for bedrock:ListInferenceProfiles.';
    }
    failure(msg);
  }

  // Validate model exists
  const modelExists = inferenceProfiles.some(p =>
    p.profileId === model ||
    p.profileId.includes(model!) ||
    p.profileName.toLowerCase().includes(model!.toLowerCase())
  );

  if (!modelExists) {
    const available = inferenceProfiles.map(p => p.profileId).join(', ');
    failure(`Model '${model}' not found. Available: ${available}`);
  }

  // Apply configuration
  applyBedrockConfig({ profile: profile!, region: region!, model: model! });

  success<ApplyConfigResult>({
    applied: true,
    config: { profile: profile!, region: region!, model: model! },
    settingsPath: getSettingsPath(),
    requiresRestart: true
  });
}
