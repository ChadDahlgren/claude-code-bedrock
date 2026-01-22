# AWS Bedrock Reference

Reference material for configuring Claude Code with AWS Bedrock.

## Regions

Choose a region closest to you for best latency. Bedrock supports many regions — check AWS console or run:
```bash
aws bedrock list-foundation-models --region us-west-2 --query 'modelSummaries[0]'
```

Common choices: `us-west-2`, `us-east-1`, `eu-west-1`, `ap-northeast-1`

## Inference Profiles (CRITICAL for Claude 4.5)

Claude 4.5 models require **inference profiles**. You cannot use the raw model ID.

**Error without inference profile:**
```
400 Invocation of model ID anthropic.claude-opus-4-5-20251101-v1:0 with on-demand throughput isn't supported.
```

**Solution:** Use an inference profile with region prefix:

| Prefix | Coverage | Notes |
|--------|----------|-------|
| `global.` | All regions | **Recommended** - best availability, dynamic routing |
| `us.` | US cross-region | US-only routing |
| `eu.` | EU cross-region | EU-only routing |
| `apac.` | Asia-Pacific | APAC-only routing |

**Example:**
```
# Wrong (won't work for Claude 4.5)
anthropic.claude-opus-4-5-20251101-v1:0

# Correct (inference profile with global routing)
global.anthropic.claude-opus-4-5-20251101-v1:0
```

**Query available inference profiles:**
```bash
aws bedrock list-inference-profiles --region us-west-2 --output json | \
  jq -r '.inferenceProfileSummaries[] | select(.inferenceProfileArn | contains("anthropic")) | [.inferenceProfileId, .inferenceProfileName] | @tsv'
```

Always use the exact IDs returned by AWS.

## AWS SSO Configuration

### SSO Start URL Format
```
https://{company-identifier}.awsapps.com/start
```

### Session Duration: 8 Hours vs 90 Days

AWS SSO supports two configuration formats with very different session durations:

| Format | Session Duration | Refresh Tokens |
|--------|------------------|----------------|
| Legacy (inline) | ~8 hours | No |
| SSO Session (recommended) | Up to 90 days | Yes |

**Why this matters:** With legacy format, you must re-authenticate every 8 hours. With SSO Session format, the AWS SDK automatically refreshes your credentials using a refresh token, so you only re-authenticate when the portal session expires (up to 90 days, admin-configurable).

### Legacy Format (8-hour sessions)
```ini
# ~/.aws/config - Legacy format (NOT recommended)
[profile my-profile]
sso_start_url = https://company.awsapps.com/start
sso_region = us-west-2
sso_account_id = 111122223333
sso_role_name = MyRole
region = us-west-2
```

### SSO Session Format (90-day sessions) - RECOMMENDED
```ini
# ~/.aws/config - SSO Session format with refresh tokens
[profile my-profile]
sso_session = my-sso
sso_account_id = 111122223333
sso_role_name = MyRole
region = us-west-2

[sso-session my-sso]
sso_start_url = https://company.awsapps.com/start
sso_region = us-west-2
sso_registration_scopes = sso:account:access
```

**Key line:** `sso_registration_scopes = sso:account:access` enables refresh tokens.

### How Refresh Tokens Work

1. Initial login: `aws sso login --profile my-profile` opens browser
2. AWS returns access token (1 hour) + refresh token (90 days)
3. When access token expires, AWS SDK automatically uses refresh token to get a new one
4. No browser interaction needed until refresh token expires
5. Result: Uninterrupted sessions for up to 90 days

### Interactive Setup Flow (Creates SSO Session Format)
```bash
aws configure sso
```

Prompts for:
1. SSO session name (e.g., `work-dev`)
2. SSO start URL (your company's SSO portal)
3. SSO region (usually `us-east-1`)
4. SSO registration scopes — **enter `sso:account:access` for refresh tokens**
5. *Browser auth - user selects account/role*
6. Default client region (e.g., `us-west-2`)
7. Default output format (`json`)
8. CLI profile name (e.g., `work-dev`)

### Checking Your Configuration

Check if your profile uses SSO Session format:
```bash
grep -A5 "\[profile" ~/.aws/config | grep -E "(sso_session|sso_start_url)"
```

- If you see `sso_session = ...`: You have refresh tokens (good)
- If you see `sso_start_url = ...` directly under profile: Legacy format (8-hour sessions)

### SSO Login
```bash
aws sso login --profile <profile-name>
```

Opens browser for authentication.

## Required IAM Permissions

Minimum:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
      "bedrock:ListFoundationModels",
      "bedrock:ListInferenceProfiles"
    ],
    "Resource": "*"
  }]
}
```

Or use AWS managed policy: `AmazonBedrockFullAccess`

## Claude Code Configuration

**Settings file:** `~/.claude/settings.json`

```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "my-profile-name",
    "AWS_REGION": "us-west-2",
    "ANTHROPIC_MODEL": "global.anthropic.claude-opus-4-5-20251101-v1:0"
  },
  "awsAuthRefresh": "aws sso login --profile my-profile-name"
}
```

**Critical values:**
- `CLAUDE_CODE_USE_BEDROCK`: Must be `"1"` (string)
- `ANTHROPIC_MODEL`: Use inference profile ID for Claude 4.5

**Always merge, never overwrite** - users may have MCP servers, hooks, etc.

## Troubleshooting

| Error | Fix |
|-------|-----|
| Token expired | `aws sso login --profile <profile>` |
| Profile not found | `aws configure list-profiles` to list, `aws configure sso` to create |
| Access denied | Ask admin for `AmazonBedrockFullAccess` policy |
| Model not available | Use inference profile format (`global.anthropic...`), check region supports it |
| Network timeout | Check internet connection, VPN, or corporate firewall |
| "on-demand throughput isn't supported" | Must use inference profile (add `global.` prefix) |
| Region not supported | Try `us-west-2` or `us-east-1` (best Bedrock availability) |

## AWS CLI Installation

**macOS:**
```bash
brew install awscli
```

**Verify:**
```bash
aws --version
```

## Useful Commands

```bash
# List profiles
aws configure list-profiles

# Check session
aws sts get-caller-identity --profile <profile>

# List Claude models
aws bedrock list-inference-profiles --region us-west-2 --output json | \
  jq '.inferenceProfileSummaries[] | select(.inferenceProfileArn | contains("anthropic"))'

# Login
aws sso login --profile <profile>

# Logout all sessions
aws sso logout
```

## Resources

- [AWS Bedrock](https://aws.amazon.com/bedrock/)
- [Claude on Bedrock](https://docs.anthropic.com/claude/docs/bedrock)
- [AWS CLI](https://aws.amazon.com/cli/)
