// Test Bedrock connection - verify API access works

import { execSync } from 'child_process';
import { success, failure } from '../lib/output.js';
import { getBedrockConfig } from '../lib/config.js';
import { getCallerIdentity, listInferenceProfiles } from '../lib/aws.js';

interface TestResult {
  configured: boolean;
  profile: string | null;
  region: string | null;
  model: string | null;
  checks: {
    credentials: { passed: boolean; message: string };
    bedrockAccess: { passed: boolean; message: string };
    modelAvailable: { passed: boolean; message: string };
  };
  allPassed: boolean;
}

export function testBedrock(): void {
  const config = getBedrockConfig();

  if (!config) {
    success<TestResult>({
      configured: false,
      profile: null,
      region: null,
      model: null,
      checks: {
        credentials: { passed: false, message: 'Bedrock not configured' },
        bedrockAccess: { passed: false, message: 'Bedrock not configured' },
        modelAvailable: { passed: false, message: 'Bedrock not configured' }
      },
      allPassed: false
    });
    return;
  }

  const { profile, region, model } = config;
  const checks: TestResult['checks'] = {
    credentials: { passed: false, message: '' },
    bedrockAccess: { passed: false, message: '' },
    modelAvailable: { passed: false, message: '' }
  };

  // Check 1: Credentials are valid
  if (profile) {
    const identityResult = getCallerIdentity(profile);
    if (identityResult.identity) {
      checks.credentials = {
        passed: true,
        message: `Authenticated as ${identityResult.identity.arn}`
      };
    } else {
      // Use error context for better message
      const errorMsg = identityResult.error?.suggestion || `Run: aws sso login --profile ${profile}`;
      checks.credentials = {
        passed: false,
        message: identityResult.error?.message || `Credentials expired. ${errorMsg}`
      };
    }
  } else {
    checks.credentials = {
      passed: false,
      message: 'No AWS profile configured'
    };
  }

  // Check 2: Bedrock access
  if (checks.credentials.passed && profile && region) {
    const profiles = listInferenceProfiles(profile, region);
    if (profiles.length > 0) {
      checks.bedrockAccess = {
        passed: true,
        message: `Access to ${profiles.length} inference profile(s) in ${region}`
      };

      // Check 3: Specific model available
      if (model) {
        const modelFound = profiles.some(p =>
          p.profileId === model ||
          p.profileId.includes(model)
        );
        if (modelFound) {
          checks.modelAvailable = {
            passed: true,
            message: `Model ${model} is available`
          };
        } else {
          checks.modelAvailable = {
            passed: false,
            message: `Model ${model} not found. Available: ${profiles.map(p => p.profileId).join(', ')}`
          };
        }
      } else {
        checks.modelAvailable = {
          passed: false,
          message: 'No model configured'
        };
      }
    } else {
      checks.bedrockAccess = {
        passed: false,
        message: `No Bedrock access in ${region}. Check IAM permissions.`
      };
      checks.modelAvailable = {
        passed: false,
        message: 'Cannot check model - no Bedrock access'
      };
    }
  } else if (!checks.credentials.passed) {
    checks.bedrockAccess = {
      passed: false,
      message: 'Cannot check - credentials invalid'
    };
    checks.modelAvailable = {
      passed: false,
      message: 'Cannot check - credentials invalid'
    };
  }

  const allPassed = checks.credentials.passed &&
    checks.bedrockAccess.passed &&
    checks.modelAvailable.passed;

  success<TestResult>({
    configured: true,
    profile: profile || null,
    region: region || null,
    model: model || null,
    checks,
    allPassed
  });
}
