// AWS CLI wrapper functions
import { awsCli, awsCliInteractive } from './shell.js';
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
        return null;
    }
    try {
        const data = JSON.parse(result.stdout);
        return {
            account: data.Account,
            arn: data.Arn,
            userId: data.UserId
        };
    }
    catch {
        return null;
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
        if (key === 'AWS_ACCESS_KEY_ID')
            creds.accessKeyId = value;
        if (key === 'AWS_SECRET_ACCESS_KEY')
            creds.secretAccessKey = value;
        if (key === 'AWS_SESSION_TOKEN')
            creds.sessionToken = value;
        if (key === 'AWS_CREDENTIAL_EXPIRATION')
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
    return awsCliInteractive(['sso', 'login', '--profile', profile]);
}
