// Get AWS context: profiles, validity, Bedrock access

import { success, failure } from '../lib/output.js';
import {
  listProfiles,
  getCallerIdentity,
  exportCredentials,
  getConfigValue,
  listInferenceProfiles,
  type AwsIdentity,
  type InferenceProfile
} from '../lib/aws.js';
import { getBedrockConfig } from '../lib/config.js';
import { parseArgs, hasFlag, getValue } from '../lib/args.js';
import { progress, progressStep } from '../lib/progress.js';

interface ProfileInfo {
  name: string;
  region: string | null;
  valid: boolean;
  identity: AwsIdentity | null;
  sessionExpires: string | null;
  bedrockAccess: boolean;
  inferenceProfiles: InferenceProfile[];
}

interface AwsContextResult {
  profiles: ProfileInfo[];
  validProfiles: string[];
  bedrockProfiles: string[];
  recommended: string | null;
  currentConfig: {
    profile: string | null;
    region: string | null;
    model: string | null;
  } | null;
  needsSsoSetup: boolean;
}

// Bedrock regions to check
const BEDROCK_REGIONS = ['us-west-2', 'us-east-1', 'eu-west-1', 'ap-northeast-1'];

/**
 * Filter inference profiles to only include Claude models
 */
function filterClaudeModels(profiles: InferenceProfile[]): InferenceProfile[] {
  return profiles.filter(p =>
    p.profileId.includes('anthropic') ||
    p.profileName.toLowerCase().includes('claude')
  );
}

export function getAwsContext(): void {
  const args = parseArgs();
  const checkBedrockFlag = hasFlag(args, 'check-bedrock');
  const specificRegion = getValue(args, 'region') || null;

  progress('Discovering AWS profiles...');
  const profiles = listProfiles();

  if (profiles.length === 0) {
    progress('No profiles found.');
    success<AwsContextResult>({
      profiles: [],
      validProfiles: [],
      bedrockProfiles: [],
      recommended: null,
      currentConfig: getBedrockConfig(),
      needsSsoSetup: true
    });
    return;
  }

  progress(`Found ${profiles.length} profile(s).`);
  const profileInfos: ProfileInfo[] = [];

  for (let i = 0; i < profiles.length; i++) {
    const name = profiles[i];
    progressStep(i + 1, profiles.length, `Checking profile: ${name}`);

    const region = getConfigValue(name, 'region');
    const identity = getCallerIdentity(name);
    const creds = identity ? exportCredentials(name) : null;

    const info: ProfileInfo = {
      name,
      region,
      valid: identity !== null,
      identity,
      sessionExpires: creds?.expiration || null,
      bedrockAccess: false,
      inferenceProfiles: []
    };

    // Only check Bedrock if profile is valid and flag is set
    if (info.valid && checkBedrockFlag) {
      progress(`  Checking Bedrock access...`);
      const regionsToCheck = specificRegion ? [specificRegion] : (region ? [region] : BEDROCK_REGIONS);

      for (const r of regionsToCheck) {
        const allProfiles = listInferenceProfiles(name, r);
        const claudeProfiles = filterClaudeModels(allProfiles);

        if (claudeProfiles.length > 0) {
          info.bedrockAccess = true;
          info.inferenceProfiles = claudeProfiles;
          if (!info.region) {
            info.region = r; // Set region if we found Bedrock access
          }
          break;
        }
      }
    }

    profileInfos.push(info);
  }

  const validProfiles = profileInfos.filter(p => p.valid).map(p => p.name);
  const bedrockProfiles = profileInfos.filter(p => p.bedrockAccess).map(p => p.name);

  // Determine recommendation
  let recommended: string | null = null;
  if (bedrockProfiles.length > 0) {
    recommended = bedrockProfiles[0];
  } else if (validProfiles.length === 1) {
    recommended = validProfiles[0];
  }

  progress('Done.');

  success<AwsContextResult>({
    profiles: profileInfos,
    validProfiles,
    bedrockProfiles,
    recommended,
    currentConfig: getBedrockConfig(),
    needsSsoSetup: validProfiles.length === 0
  });
}
