import { type AwsError } from './errors.js';
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
/**
 * List all configured AWS profiles
 */
export declare function listProfiles(): string[];
export interface IdentityResult {
    identity: AwsIdentity | null;
    error?: AwsError;
}
/**
 * Get the caller identity for a profile (validates credentials work)
 */
export declare function getCallerIdentity(profile: string): IdentityResult;
/**
 * Export credentials for a profile (checks if session is valid)
 */
export declare function exportCredentials(profile: string): AwsCredentials | null;
/**
 * Get a config value for a profile
 */
export declare function getConfigValue(profile: string, key: string): string | null;
/**
 * List Bedrock inference profiles in a region
 */
export declare function listInferenceProfiles(profile: string, region: string): InferenceProfile[];
/**
 * Check if profile has Bedrock access in a region
 */
export declare function hasBedrockAccess(profile: string, region: string): boolean;
export interface SsoLoginResult {
    success: boolean;
    error?: AwsError;
}
/**
 * Run SSO login for a profile (returns success/failure, user sees browser)
 */
export declare function ssoLogin(profile: string): SsoLoginResult;
/**
 * Get list of Bedrock regions to check, prioritized by user's profile region
 */
export declare function getBedrockRegions(profileDefaultRegion?: string | null): string[];
/**
 * Find regions where the profile has Bedrock access with Claude models
 * Returns up to maxResults regions to avoid long waits
 */
export declare function findBedrockRegions(profile: string, profileDefaultRegion?: string | null, maxResults?: number): string[];
