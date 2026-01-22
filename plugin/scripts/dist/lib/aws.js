// AWS CLI wrapper functions
import { awsCli, awsCliInteractive } from './shell.js';
import { AWS_CRED_KEYS } from './constants.js';
/**
 * List all configured AWS profiles
 */
export function listProfiles() {
    const result = awsCli(['configure', 'list-profiles']);
    if (!result.success) {
        return [];
    }
    return result.stdout.split('\n').filter(p => p.length > 0);
}
/**
 * Get the caller identity for a profile (validates credentials work)
 */
export function getCallerIdentity(profile) {
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
    }
    catch {
        return { identity: null };
    }
}
/**
 * Export credentials for a profile (checks if session is valid)
 */
export function exportCredentials(profile) {
    const result = awsCli(['configure', 'export-credentials', '--profile', profile, '--format', 'env-no-export']);
    if (!result.success) {
        return null;
    }
    const creds = {};
    for (const line of result.stdout.split('\n')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        if (key === AWS_CRED_KEYS.ACCESS_KEY_ID)
            creds.accessKeyId = value;
        if (key === AWS_CRED_KEYS.SECRET_ACCESS_KEY)
            creds.secretAccessKey = value;
        if (key === AWS_CRED_KEYS.SESSION_TOKEN)
            creds.sessionToken = value;
        if (key === AWS_CRED_KEYS.EXPIRATION)
            creds.expiration = value;
    }
    if (creds.accessKeyId && creds.secretAccessKey) {
        return creds;
    }
    return null;
}
/**
 * Get a config value for a profile
 */
export function getConfigValue(profile, key) {
    const result = awsCli(['configure', 'get', key, '--profile', profile]);
    if (!result.success) {
        return null;
    }
    return result.stdout || null;
}
/**
 * List Bedrock inference profiles in a region
 */
export function listInferenceProfiles(profile, region) {
    const result = awsCli(['bedrock', 'list-inference-profiles', '--profile', profile, '--region', region, '--output', 'json']);
    if (!result.success) {
        return [];
    }
    try {
        const data = JSON.parse(result.stdout);
        return (data.inferenceProfileSummaries || []).map((p) => ({
            profileId: p.inferenceProfileId,
            profileName: p.inferenceProfileName,
            modelId: p.models?.[0]?.modelArn?.split('/').pop() || 'unknown'
        }));
    }
    catch {
        return [];
    }
}
/**
 * Check if profile has Bedrock access in a region
 */
export function hasBedrockAccess(profile, region) {
    const profiles = listInferenceProfiles(profile, region);
    return profiles.length > 0;
}
/**
 * Run SSO login for a profile (returns success/failure, user sees browser)
 */
export function ssoLogin(profile) {
    const result = awsCliInteractive(['sso', 'login', '--profile', profile]);
    return { success: result.success, error: result.error };
}
/**
 * Known AWS regions where Bedrock is available
 * Updated list based on AWS documentation - checked at runtime for actual access
 */
const KNOWN_BEDROCK_REGIONS = [
    // US regions
    'us-east-1', // N. Virginia
    'us-east-2', // Ohio
    'us-west-2', // Oregon
    // Europe regions
    'eu-west-1', // Ireland
    'eu-west-2', // London
    'eu-west-3', // Paris
    'eu-central-1', // Frankfurt
    // Asia Pacific regions
    'ap-northeast-1', // Tokyo
    'ap-northeast-2', // Seoul
    'ap-southeast-1', // Singapore
    'ap-southeast-2', // Sydney
    'ap-south-1', // Mumbai
    // Other regions
    'ca-central-1', // Canada
    'sa-east-1', // Sao Paulo
];
/**
 * Get list of Bedrock regions to check, prioritized by user's profile region
 */
export function getBedrockRegions(profileDefaultRegion) {
    // If user has a default region and it's a known Bedrock region, prioritize it
    if (profileDefaultRegion && KNOWN_BEDROCK_REGIONS.includes(profileDefaultRegion)) {
        return [
            profileDefaultRegion,
            ...KNOWN_BEDROCK_REGIONS.filter(r => r !== profileDefaultRegion)
        ];
    }
    return [...KNOWN_BEDROCK_REGIONS];
}
/**
 * Find regions where the profile has Bedrock access with Claude models
 * Returns up to maxResults regions to avoid long waits
 */
export function findBedrockRegions(profile, profileDefaultRegion, maxResults = 3) {
    const regionsToCheck = getBedrockRegions(profileDefaultRegion);
    const workingRegions = [];
    for (const region of regionsToCheck) {
        const profiles = listInferenceProfiles(profile, region);
        // Check if there are Claude models available
        const hasClaudeModels = profiles.some(p => p.profileId.includes('anthropic') ||
            p.profileName.toLowerCase().includes('claude'));
        if (hasClaudeModels) {
            workingRegions.push(region);
            if (workingRegions.length >= maxResults) {
                break;
            }
        }
    }
    return workingRegions;
}
