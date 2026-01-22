import { describe, it, expect } from 'vitest';
import { parseAwsError, formatError, createConfigError, ErrorCode } from './errors.js';

describe('errors', () => {
  describe('parseAwsError', () => {
    it('detects AWS CLI not found', () => {
      const error = parseAwsError('aws: command not found');
      expect(error.code).toBe(ErrorCode.AWS_CLI_NOT_FOUND);
      expect(error.suggestion).toContain('Install AWS CLI');
    });

    it('detects SSO session expired (expiredtoken)', () => {
      const error = parseAwsError('Error: ExpiredToken - The security token has expired');
      expect(error.code).toBe(ErrorCode.SSO_SESSION_EXPIRED);
      expect(error.suggestion).toContain('aws sso login');
    });

    it('detects SSO session expired (token has expired)', () => {
      const error = parseAwsError('The SSO token has expired');
      expect(error.code).toBe(ErrorCode.SSO_SESSION_EXPIRED);
    });

    it('detects SSO session issues', () => {
      const error = parseAwsError('The SSO session associated with this profile has expired');
      expect(error.code).toBe(ErrorCode.SSO_SESSION_EXPIRED);
    });

    it('detects invalid client', () => {
      const error = parseAwsError('InvalidClientId: Client id is not valid');
      expect(error.code).toBe(ErrorCode.CREDENTIALS_INVALID);
      expect(error.suggestion).toContain('aws configure sso');
    });

    it('detects access denied', () => {
      const error = parseAwsError('AccessDenied: User is not authorized');
      expect(error.code).toBe(ErrorCode.ACCESS_DENIED);
      expect(error.suggestion).toContain('IAM permissions');
    });

    it('detects profile not found', () => {
      const error = parseAwsError('Could not find profile named "myprofile"');
      expect(error.code).toBe(ErrorCode.PROFILE_NOT_FOUND);
      expect(error.suggestion).toContain('aws configure list-profiles');
    });

    it('detects missing credentials', () => {
      const error = parseAwsError('Unable to locate credentials');
      expect(error.code).toBe(ErrorCode.CREDENTIALS_INVALID);
    });

    it('detects timeout', () => {
      const error = parseAwsError('Connection timed out');
      expect(error.code).toBe(ErrorCode.TIMEOUT);
      expect(error.suggestion).toContain('network');
    });

    it('detects network errors', () => {
      const error = parseAwsError('Network connection failed');
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('detects Bedrock access denied', () => {
      // Note: The string must include "bedrock" AND "denied" but NOT "access denied" together
      // because "access denied" is caught by an earlier check
      const error = parseAwsError('bedrock service denied your request');
      expect(error.code).toBe(ErrorCode.BEDROCK_ACCESS_DENIED);
      expect(error.suggestion).toContain('region');
    });

    it('detects invalid region', () => {
      const error = parseAwsError('Invalid region specified: us-invalid-1');
      expect(error.code).toBe(ErrorCode.INVALID_REGION);
    });

    it('returns unknown for unrecognized errors', () => {
      const error = parseAwsError('Some random error message');
      expect(error.code).toBe(ErrorCode.UNKNOWN);
      expect(error.details).toBe('Some random error message');
    });

    it('handles empty stderr', () => {
      const error = parseAwsError('');
      expect(error.code).toBe(ErrorCode.UNKNOWN);
      expect(error.details).toBe('No error details available');
    });

    it('is case insensitive', () => {
      const error1 = parseAwsError('ACCESSDENIED');
      const error2 = parseAwsError('accessdenied');
      expect(error1.code).toBe(ErrorCode.ACCESS_DENIED);
      expect(error2.code).toBe(ErrorCode.ACCESS_DENIED);
    });
  });

  describe('formatError', () => {
    it('formats error with suggestion', () => {
      const error = {
        code: ErrorCode.SSO_SESSION_EXPIRED,
        message: 'Session expired',
        suggestion: 'Run aws sso login'
      };
      const formatted = formatError(error);
      expect(formatted).toBe('Session expired Run aws sso login');
    });

    it('formats error without suggestion', () => {
      const error = {
        code: ErrorCode.UNKNOWN,
        message: 'Unknown error'
      };
      const formatted = formatError(error);
      expect(formatted).toBe('Unknown error');
    });
  });

  describe('createConfigError', () => {
    it('creates corrupted config error', () => {
      const error = createConfigError('corrupted', 'Invalid JSON at line 5');
      expect(error.code).toBe(ErrorCode.CONFIG_CORRUPTED);
      expect(error.details).toBe('Invalid JSON at line 5');
      expect(error.suggestion).toContain('settings.json');
    });

    it('creates missing config error', () => {
      const error = createConfigError('missing');
      expect(error.code).toBe(ErrorCode.MISSING_CONFIG);
      expect(error.suggestion).toContain('/bedrock');
    });

    it('creates invalid config error', () => {
      const error = createConfigError('invalid', 'Missing profile');
      expect(error.code).toBe(ErrorCode.INVALID_CONFIG);
      expect(error.details).toBe('Missing profile');
    });
  });
});
