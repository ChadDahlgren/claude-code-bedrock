// Structured error types for better error context and debugging

export enum ErrorCode {
  // AWS CLI errors
  AWS_CLI_NOT_FOUND = 'AWS_CLI_NOT_FOUND',
  AWS_CLI_ERROR = 'AWS_CLI_ERROR',

  // Authentication errors
  CREDENTIALS_EXPIRED = 'CREDENTIALS_EXPIRED',
  CREDENTIALS_INVALID = 'CREDENTIALS_INVALID',
  SSO_SESSION_EXPIRED = 'SSO_SESSION_EXPIRED',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',

  // Permission errors
  ACCESS_DENIED = 'ACCESS_DENIED',
  BEDROCK_ACCESS_DENIED = 'BEDROCK_ACCESS_DENIED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_CONFIG = 'MISSING_CONFIG',
  CONFIG_CORRUPTED = 'CONFIG_CORRUPTED',

  // Validation errors
  INVALID_REGION = 'INVALID_REGION',
  INVALID_MODEL = 'INVALID_MODEL',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',

  // General errors
  UNKNOWN = 'UNKNOWN'
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
export function parseAwsError(stderr: string, exitCode?: number): AwsError {
  const stderrLower = stderr.toLowerCase();

  // Check for specific AWS error patterns
  if (stderrLower.includes('command not found') || stderrLower.includes('not recognized')) {
    return {
      code: ErrorCode.AWS_CLI_NOT_FOUND,
      message: 'AWS CLI is not installed or not in PATH',
      details: stderr,
      suggestion: 'Install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html'
    };
  }

  if (stderrLower.includes('expiredtoken') || stderrLower.includes('token has expired')) {
    return {
      code: ErrorCode.SSO_SESSION_EXPIRED,
      message: 'SSO session has expired',
      details: stderr,
      suggestion: 'Run: aws sso login --profile <profile-name>'
    };
  }

  if (stderrLower.includes('the sso session') || stderrLower.includes('sso session')) {
    return {
      code: ErrorCode.SSO_SESSION_EXPIRED,
      message: 'SSO session has expired or is invalid',
      details: stderr,
      suggestion: 'Run: aws sso login --profile <profile-name>'
    };
  }

  if (stderrLower.includes('invalidclientid') || stderrLower.includes('invalid client')) {
    return {
      code: ErrorCode.CREDENTIALS_INVALID,
      message: 'Invalid SSO client configuration',
      details: stderr,
      suggestion: 'Check your AWS SSO configuration and try aws configure sso'
    };
  }

  if (stderrLower.includes('accessdenied') || stderrLower.includes('access denied')) {
    return {
      code: ErrorCode.ACCESS_DENIED,
      message: 'Access denied - insufficient permissions',
      details: stderr,
      suggestion: 'Check IAM permissions for this profile'
    };
  }

  if (stderrLower.includes('could not find profile') || stderrLower.includes('profile') && stderrLower.includes('not found')) {
    return {
      code: ErrorCode.PROFILE_NOT_FOUND,
      message: 'AWS profile not found',
      details: stderr,
      suggestion: 'Run: aws configure list-profiles to see available profiles'
    };
  }

  if (stderrLower.includes('unable to locate credentials') || stderrLower.includes('no credentials')) {
    return {
      code: ErrorCode.CREDENTIALS_INVALID,
      message: 'No valid credentials found for this profile',
      details: stderr,
      suggestion: 'Run: aws sso login --profile <profile-name>'
    };
  }

  if (stderrLower.includes('timeout') || stderrLower.includes('timed out')) {
    return {
      code: ErrorCode.TIMEOUT,
      message: 'Request timed out',
      details: stderr,
      suggestion: 'Check your network connection and try again'
    };
  }

  if (stderrLower.includes('network') || stderrLower.includes('connection') || stderrLower.includes('socket')) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Network error occurred',
      details: stderr,
      suggestion: 'Check your network connection and try again'
    };
  }

  if (stderrLower.includes('bedrock') && stderrLower.includes('denied')) {
    return {
      code: ErrorCode.BEDROCK_ACCESS_DENIED,
      message: 'Bedrock access denied in this region',
      details: stderr,
      suggestion: 'Try a different region or check IAM permissions for bedrock:*'
    };
  }

  if (stderrLower.includes('invalid region') || stderrLower.includes('region') && stderrLower.includes('not found')) {
    return {
      code: ErrorCode.INVALID_REGION,
      message: 'Invalid AWS region specified',
      details: stderr,
      suggestion: 'Use a valid AWS region (e.g., us-west-2, us-east-1, eu-west-1)'
    };
  }

  // Default unknown error
  return {
    code: ErrorCode.UNKNOWN,
    message: 'An unexpected error occurred',
    details: stderr || 'No error details available',
    suggestion: 'Check the error details above and try again'
  };
}

/**
 * Format an error for user display
 */
export function formatError(error: AwsError): string {
  let msg = error.message;
  if (error.suggestion) {
    msg += ` ${error.suggestion}`;
  }
  return msg;
}

/**
 * Create a structured error for settings file issues
 */
export function createConfigError(issue: 'corrupted' | 'missing' | 'invalid', details?: string): AwsError {
  switch (issue) {
    case 'corrupted':
      return {
        code: ErrorCode.CONFIG_CORRUPTED,
        message: 'Settings file is corrupted or invalid JSON',
        details,
        suggestion: 'Delete ~/.claude/settings.json and reconfigure, or manually fix the JSON syntax'
      };
    case 'missing':
      return {
        code: ErrorCode.MISSING_CONFIG,
        message: 'No Bedrock configuration found',
        details,
        suggestion: 'Run /bedrock:setup to configure Bedrock'
      };
    case 'invalid':
      return {
        code: ErrorCode.INVALID_CONFIG,
        message: 'Bedrock configuration is incomplete or invalid',
        details,
        suggestion: 'Run /bedrock:setup to reconfigure'
      };
  }
}
