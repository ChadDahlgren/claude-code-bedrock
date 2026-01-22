export declare enum ErrorCode {
    AWS_CLI_NOT_FOUND = "AWS_CLI_NOT_FOUND",
    AWS_CLI_ERROR = "AWS_CLI_ERROR",
    CREDENTIALS_EXPIRED = "CREDENTIALS_EXPIRED",
    CREDENTIALS_INVALID = "CREDENTIALS_INVALID",
    SSO_SESSION_EXPIRED = "SSO_SESSION_EXPIRED",
    PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND",
    ACCESS_DENIED = "ACCESS_DENIED",
    BEDROCK_ACCESS_DENIED = "BEDROCK_ACCESS_DENIED",
    NETWORK_ERROR = "NETWORK_ERROR",
    TIMEOUT = "TIMEOUT",
    INVALID_CONFIG = "INVALID_CONFIG",
    MISSING_CONFIG = "MISSING_CONFIG",
    CONFIG_CORRUPTED = "CONFIG_CORRUPTED",
    INVALID_REGION = "INVALID_REGION",
    INVALID_MODEL = "INVALID_MODEL",
    MODEL_NOT_FOUND = "MODEL_NOT_FOUND",
    UNKNOWN = "UNKNOWN"
}
export interface AwsError {
    code: ErrorCode;
    message: string;
    details?: string;
    suggestion?: string;
}
/**
 * Parse AWS CLI error output to determine error type
 */
export declare function parseAwsError(stderr: string, exitCode?: number): AwsError;
/**
 * Format an error for user display
 */
export declare function formatError(error: AwsError): string;
/**
 * Create a structured error for settings file issues
 */
export declare function createConfigError(issue: 'corrupted' | 'missing' | 'invalid', details?: string): AwsError;
