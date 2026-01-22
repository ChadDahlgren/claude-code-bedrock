// AWS CLI wrapper functions

import { awsCli, awsCliInteractive, type ExecResult, type InteractiveResult } from './shell.js';
import { type AwsError } from './errors.js';
import { AWS_CRED_KEYS } from './constants.js';

export interface AwsProfile {
  name: string;
  region?: string;
}

export interface AwsIdentity {
  account: string;
  arn: string;
  userId: string;
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: string;
}

export interface InferenceProfile {
  profileId: string;
  profileName: string;
  modelId: string;
}

// AWS API response structure for list-inference-profiles
interface AwsInferenceProfileSummary {
  inferenceProfileId: string;
  inferenceProfileName: string;
  models?: Array<{ modelArn?: string }>;
}

/**
 * List all configured AWS profiles
 */
export function listProfiles(): string[] {
  const result = awsCli(['configure', 'list-profiles']);
  if (!result.success) {
    return [];
  }
  return result.stdout.split('\n').filter(p => p.length > 0);
}

export interface IdentityResult {
  identity: AwsIdentity | null;
  error?: AwsError;
}

/**
 * Get the caller identity for a profile (validates credentials work)
 */
export function getCallerIdentity(profile: string): IdentityResult {
  const result = awsCli(['sts', 'get-caller-identity', '--profile', profile, '--output', 'json']);
  if (!result.success) {
    return { identity: null, error: result.error };
  }
  try {
    const data = JSON.parse(result.stdout);
    return {
      identity: {
        account: data.Account,
        arn: data.Arn,
        userId: data.UserId
      }
    };
  } catch {
    return { identity: null };
  }
}

/**
 * Export credentials for a profile (checks if session is valid)
 */
export function exportCredentials(profile: string): AwsCredentials | null {
  const result = awsCli(['configure', 'export-credentials', '--profile', profile, '--format', 'env-no-export']);
  if (!result.success) {
    return null;
  }

  const creds: Partial<AwsCredentials> = {};
  for (const line of result.stdout.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    if (key === AWS_CRED_KEYS.ACCESS_KEY_ID) creds.accessKeyId = value;
    if (key === AWS_CRED_KEYS.SECRET_ACCESS_KEY) creds.secretAccessKey = value;
    if (key === AWS_CRED_KEYS.SESSION_TOKEN) creds.sessionToken = value;
    if (key === AWS_CRED_KEYS.EXPIRATION) creds.expiration = value;
  }

  if (creds.accessKeyId && creds.secretAccessKey) {
    return creds as AwsCredentials;
  }
  return null;
}

/**
 * Get a config value for a profile
 */
export function getConfigValue(profile: string, key: string): string | null {
  const result = awsCli(['configure', 'get', key, '--profile', profile]);
  if (!result.success) {
    return null;
  }
  return result.stdout || null;
}

/**
 * List Bedrock inference profiles in a region
 */
export function listInferenceProfiles(profile: string, region: string): InferenceProfile[] {
  const result = awsCli(['bedrock', 'list-inference-profiles', '--profile', profile, '--region', region, '--output', 'json']);
  if (!result.success) {
    return [];
  }
  try {
    const data = JSON.parse(result.stdout);
    return (data.inferenceProfileSummaries || []).map((p: AwsInferenceProfileSummary) => ({
      profileId: p.inferenceProfileId,
      profileName: p.inferenceProfileName,
      modelId: p.models?.[0]?.modelArn?.split('/').pop() || 'unknown'
    }));
  } catch {
    return [];
  }
}

/**
 * Check if profile has Bedrock access in a region
 */
export function hasBedrockAccess(profile: string, region: string): boolean {
  const profiles = listInferenceProfiles(profile, region);
  return profiles.length > 0;
}

export interface SsoLoginResult {
  success: boolean;
  error?: AwsError;
}

/**
 * Run SSO login for a profile (returns success/failure, user sees browser)
 */
export function ssoLogin(profile: string): SsoLoginResult {
  const result = awsCliInteractive(['sso', 'login', '--profile', profile]);
  return { success: result.success, error: result.error };
}

/**
 * Known AWS regions where Bedrock is available
 * This list is a starting point - the user's profile region is always checked first
 * even if not in this list, allowing new regions to work automatically.
 */
const KNOWN_BEDROCK_REGIONS = [
  // US regions
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-2',      // Oregon
  // Europe regions
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-west-3',      // Paris
  'eu-central-1',   // Frankfurt
  'eu-north-1',     // Stockholm
  // Asia Pacific regions
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-northeast-3', // Osaka
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-south-1',     // Mumbai
  // Other regions
  'ca-central-1',   // Canada
  'sa-east-1',      // Sao Paulo
  'me-south-1',     // Bahrain
  'me-central-1',   // UAE
  'af-south-1',     // Cape Town
];

/**
 * Get list of Bedrock regions to check, prioritized by user's profile region
 * IMPORTANT: User's profile region is ALWAYS included first, even if not in known list
 * This allows new AWS regions to work without code updates
 */
export function getBedrockRegions(profileDefaultRegion?: string | null): string[] {
  const regions = [...KNOWN_BEDROCK_REGIONS];

  if (profileDefaultRegion) {
    // Always prioritize user's region, even if not in known list
    // This allows new regions to work without code updates
    const filtered = regions.filter(r => r !== profileDefaultRegion);
    return [profileDefaultRegion, ...filtered];
  }

  return regions;
}

/**
 * Find regions where the profile has Bedrock access with Claude models
 * Returns up to maxResults regions to avoid long waits
 */
export function findBedrockRegions(
  profile: string,
  profileDefaultRegion?: string | null,
  maxResults: number = 3
): string[] {
  const regionsToCheck = getBedrockRegions(profileDefaultRegion);
  const workingRegions: string[] = [];

  for (const region of regionsToCheck) {
    const profiles = listInferenceProfiles(profile, region);
    // Check if there are Claude models available
    const hasClaudeModels = profiles.some(p =>
      p.profileId.includes('anthropic') ||
      p.profileName.toLowerCase().includes('claude')
    );

    if (hasClaudeModels) {
      workingRegions.push(region);
      if (workingRegions.length >= maxResults) {
        break;
      }
    }
  }

  return workingRegions;
}
