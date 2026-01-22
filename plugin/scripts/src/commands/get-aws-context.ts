// Get AWS context: profiles, validity, Bedrock access

import { success, failure } from '../lib/output.js';
import {
  listProfiles,
  getCallerIdentity,
  exportCredentials,
  getConfigValue,
  listInferenceProfiles,
  getBedrockRegions,
  type AwsIdentity,
  type InferenceProfile
} from '../lib/aws.js';
import { getBedrockConfig } from '../lib/config.js';
import { parseArgs, hasFlag, getValue } from '../lib/args.js';
import { progress, progressStep } from '../lib/progress.js';

interface ProfileInfo {
  name: string;
  region: string | null;
  profileRegion: string | null;        // Original region from profile (before Bedrock discovery)
  bedrockRegion: string | null;        // Region where Bedrock was found (may differ from profile)
  regionMismatch: boolean;             // True if Bedrock found in different region than profile
  valid: boolean;
  identity: AwsIdentity | null;
  sessionExpires: string | null;       // Raw UTC timestamp
  sessionExpiresLocal: string | null;  // Formatted in local time with timezone
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

// Bedrock regions are now fetched dynamically from aws.ts

/**
 * Filter inference profiles to only include Claude models
 */
function filterClaudeModels(profiles: InferenceProfile[]): InferenceProfile[] {
  return profiles.filter(p =>
    p.profileId.includes('anthropic') ||
    p.profileName.toLowerCase().includes('claude')
  );
}

/**
 * Prefer global. profiles over regional ones (us., eu., ap.)
 * If a model exists with global. prefix, exclude the regional versions
 * Sort so global. profiles appear first
 */
function preferGlobalProfiles(profiles: InferenceProfile[]): InferenceProfile[] {
  // Extract the model name without the region prefix
  // e.g., "global.anthropic.claude-opus-4-5-20251101-v1:0" -> "anthropic.claude-opus-4-5-20251101-v1:0"
  const getModelBase = (profileId: string): string => {
    return profileId.replace(/^(global|us|eu|ap)\./, '');
  };

  // Find which models have global. versions available
  const globalModels = new Set(
    profiles
      .filter(p => p.profileId.startsWith('global.'))
      .map(p => getModelBase(p.profileId))
  );

  // Filter out regional profiles if global version exists
  const filtered = profiles.filter(p => {
    const base = getModelBase(p.profileId);
    // Keep if it's global, or if there's no global version available
    return p.profileId.startsWith('global.') || !globalModels.has(base);
  });

  // Sort so global. profiles appear first
  return filtered.sort((a, b) => {
    const aIsGlobal = a.profileId.startsWith('global.') ? 0 : 1;
    const bIsGlobal = b.profileId.startsWith('global.') ? 0 : 1;
    return aIsGlobal - bIsGlobal;
  });
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
    const identityResult = getCallerIdentity(name);
    const identity = identityResult.identity;
    const creds = identity ? exportCredentials(name) : null;

    const info: ProfileInfo = {
      name,
      region,
      profileRegion: region,           // Store the original profile region
      bedrockRegion: null,             // Will be set when Bedrock is found
      regionMismatch: false,           // Will be set if Bedrock is in different region
      valid: identity !== null,
      identity,
      sessionExpires: creds?.expiration || null,
      sessionExpiresLocal: creds?.expirationLocal || null,
      bedrockAccess: false,
      inferenceProfiles: []
    };

    // Only check Bedrock if profile is valid and flag is set
    if (info.valid && checkBedrockFlag) {
      progress(`  Checking Bedrock access...`);
      // Use dynamic regions, prioritizing profile's default region
      const regionsToCheck = specificRegion ? [specificRegion] : getBedrockRegions(region);

      for (const r of regionsToCheck) {
        const allProfiles = listInferenceProfiles(name, r);
        const claudeProfiles = filterClaudeModels(allProfiles);
        const preferredProfiles = preferGlobalProfiles(claudeProfiles);

        if (preferredProfiles.length > 0) {
          info.bedrockAccess = true;
          info.inferenceProfiles = preferredProfiles;
          info.bedrockRegion = r;

          // Track if Bedrock was found in a different region than the profile's default
          if (info.profileRegion && info.profileRegion !== r) {
            info.regionMismatch = true;
            // Don't override region - let the user decide
          } else if (!info.region) {
            info.region = r; // Only set region if profile didn't have one
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
