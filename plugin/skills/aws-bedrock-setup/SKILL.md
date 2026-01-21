# AWS Bedrock Setup Skill

This skill provides comprehensive knowledge about configuring Claude Code to use AWS Bedrock.

## Bedrock Region Availability

As of January 2025, Claude models are available in these AWS regions:

### Recommended Region
- **us-west-2** (Oregon) — Best availability for all Claude models, lowest latency for US users

### Other Supported Regions
- **us-east-1** (N. Virginia) — Good availability, east coast latency
- **eu-west-1** (Ireland) — For European users
- **eu-central-1** (Frankfurt) — For European users
- **ap-northeast-1** (Tokyo) — For Asia-Pacific users
- **ap-southeast-2** (Sydney) — For Australia/New Zealand users

## Claude Model Naming in Bedrock

Bedrock uses different model names than the Anthropic API, and Claude 4.5 models require **inference profiles**.

### Inference Profiles (CRITICAL for Claude 4.5)

Claude 4.5 models cannot be invoked directly with on-demand throughput. You must use an **inference profile**.

**Error you'll see without inference profile:**
```
400 Invocation of model ID anthropic.claude-opus-4-5-20251101-v1:0 with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile that contains this model.
```

### Inference Profile Format

Add a region prefix to the model ID:

| Region Prefix | Description |
|--------------|-------------|
| `us.` | US inference profile (cross-region in US) |
| `eu.` | EU inference profile (cross-region in EU) |
| `apac.` | Asia-Pacific inference profile |

### Query Available Models

**Always query AWS directly for current inference profiles:**

```bash
# List Claude inference profiles
aws bedrock list-inference-profiles --region us-west-2 \
  --query "inferenceProfileSummaries[?contains(modelArn, 'anthropic')].[inferenceProfileId,inferenceProfileName]" \
  --output table
```

This returns the actual inference profile IDs you can use, like:
- `us.anthropic.claude-opus-4-5-20251101-v1:0`
- `us.anthropic.claude-sonnet-4-5-20250929-v1:0`

**Use the exact IDs returned by AWS** - don't hardcode or construct them manually, as they may change.

### Why Inference Profiles?

Inference profiles provide:
- Cross-region load balancing for higher throughput
- Automatic failover during peak demand
- Required for Claude 4.5 on-demand access

Claude Code uses the `ANTHROPIC_MODEL` environment variable - set it to the inference profile ID.

## AWS SSO Configuration

### SSO Start URL Format
```
https://{company-identifier}.awsapps.com/start
```

Examples:
- `https://cricut.awsapps.com/start`
- `https://my-company.awsapps.com/start`
- `https://acme-corp.awsapps.com/start`

### SSO Regions
The SSO region is where your organization's SSO portal is hosted (not where Bedrock runs).

Most common: **us-east-1**

This is independent of your Bedrock region selection.

### AWS SSO Browser Flow

When running `aws sso login`, AWS handles:
1. Opening browser to device authorization page
2. User enters code (or it's pre-filled)
3. User selects AWS account from their list
4. User selects IAM role for that account
5. Browser confirms success
6. CLI receives credentials

**We don't ask for account ID or role name** because AWS SSO handles this in the browser.

### Interactive `aws configure sso` Flow (Real-World Example)

When running `aws configure sso` for the first time, here's the actual sequence of prompts:

```
$ aws configure sso

SSO session name (Recommended): cricut-dev
SSO start URL [None]: https://cricutawssso.awsapps.com/start
SSO region [None]: us-west-2
SSO registration scopes [sso:account:access]: <enter to accept default>

Attempting to automatically open the SSO authorization page in your default browser.
If the browser does not open or you wish to use a different device to authorize this request,
open the following URL: https://device.sso.us-west-2.amazonaws.com/

<browser opens - user authenticates>

There are 18 AWS accounts available to you.
Using the account ID 237489059256
There are 2 roles available to you.
Using the role name "Dev_Access_Non_Prod"

CLI default client Region [None]: us-west-2
CLI default output format [None]: json
CLI profile name [Dev_Access_Non_Prod-237489059256]: cricut-dev

To use this profile, specify the profile name using --profile, as shown:

aws s3 ls --profile cricut-dev
```

### Prompt-by-Prompt Breakdown

| Prompt | Description | Example Value |
|--------|-------------|---------------|
| SSO session name | Friendly name for this SSO session | `cricut-dev`, `company-sso` |
| SSO start URL | Your company's AWS SSO portal URL | `https://company.awsapps.com/start` |
| SSO region | Region where your SSO is configured | `us-west-2`, `us-east-1` |
| SSO registration scopes | OAuth scopes (usually accept default) | `sso:account:access` |
| *Browser auth* | Opens browser for authentication | *User clicks through* |
| Account selection | AWS auto-selects or prompts | Shown as account ID |
| Role selection | Role for that account | `Dev_Access_Non_Prod`, `PowerUser` |
| Default client Region | Region for AWS CLI commands | `us-west-2` |
| Default output format | CLI output format | `json`, `text`, `table` |
| Profile name | Name to reference this profile | `cricut-dev`, `work-sandbox` |

### Notes on the Interactive Flow

1. **SSO session vs Profile**: The "SSO session name" can differ from the "CLI profile name" - session is for the SSO connection, profile is what you use with `--profile`
2. **Account/Role selection**: If you have access to multiple accounts/roles, AWS will prompt you to choose
3. **Browser authentication**: The CLI waits for you to complete auth in the browser before continuing
4. **Profile name default**: AWS suggests a long default name like `RoleName-AccountId` - you can (and should) use a shorter custom name

## Required IAM Permissions

For Claude Code to work with Bedrock, the IAM role needs:

### Minimum Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    }
  ]
}
```

### Recommended Policy
Use AWS managed policy: `AmazonBedrockFullAccess`

Or create a custom policy with just the model invocation permissions above.

### Common Permission Issues

**Error:** `AccessDeniedException: User is not authorized to perform: bedrock:InvokeModel`

**Cause:** IAM role lacks Bedrock permissions

**Fix:** Ask AWS administrator to attach the Bedrock policy to your SSO role

## AWS CLI Configuration Files

### Profile Location
`~/.aws/config`

### SSO Profile Format
```ini
[profile my-profile-name]
sso_start_url = https://company.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = PowerUserAccess
region = us-west-2
output = json
```

### Credentials Cache
`~/.aws/sso/cache/*.json`

Contains cached SSO session tokens with expiration times.

## Claude Code Configuration

### Settings File Location
`~/.claude/settings.json`

### Required Configuration
```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "my-profile-name",
    "AWS_REGION": "us-west-2"
  },
  "awsAuthRefresh": "aws sso login --profile my-profile-name"
}
```

### How Auto-Refresh Works

When `awsAuthRefresh` is configured:
1. Claude Code detects expired credentials
2. Automatically runs the specified command
3. Opens browser for re-authentication
4. Continues working after auth completes

This prevents "credentials expired" errors mid-session.

### Configuration Merging

**CRITICAL:** Always merge, never overwrite settings.json.

Users may have:
- MCP server configurations
- Custom hooks
- Other environment variables
- Plugin settings

Always:
1. Read existing settings.json
2. Merge new provider settings
3. Write complete configuration back

## Common Issues and Fixes

### Issue: "Token has expired" Error

**Symptoms:** `aws sts get-caller-identity` fails with token error

**Cause:** SSO session expired (default 12 hours)

**Fix:**
```bash
aws sso login --profile <profile-name>
```

Or use `/provider:refresh` command.

### Issue: "Could not connect to the endpoint URL"

**Symptoms:** Bedrock API calls fail with connection error

**Cause:** Wrong region or region doesn't support Bedrock

**Fix:** Verify region is in supported list, reconfigure if needed

### Issue: "No such profile"

**Symptoms:** AWS CLI can't find the profile

**Cause:** Profile not in ~/.aws/config or wrong name

**Fix:**
```bash
# List available profiles
aws configure list-profiles

# Reconfigure if needed
aws configure sso --profile <profile-name>
```

### Issue: Model Not Available

**Symptoms:** "Model not found" error in Claude Code

**Cause:** Model not available in selected region or account doesn't have access

**Fix:**
1. Verify region supports the model:
   ```bash
   aws bedrock list-foundation-models --region us-west-2 --by-provider anthropic
   ```
2. If model not listed, try different region
3. Contact AWS support to request model access

### Issue: "On-demand throughput isn't supported"

**Symptoms:** Error message like:
```
400 Invocation of model ID anthropic.claude-opus-4-5-20251101-v1:0 with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile that contains this model.
```

**Cause:** Claude 4.5 models require inference profiles for on-demand access

**Fix:**
Change your `ANTHROPIC_MODEL` in `~/.claude/settings.json` to use the inference profile format:

```diff
- "ANTHROPIC_MODEL": "anthropic.claude-opus-4-5-20251101-v1:0"
+ "ANTHROPIC_MODEL": "us.anthropic.claude-opus-4-5-20251101-v1:0"
```

The `us.` prefix is the US inference profile. Valid prefixes:
- `us.` - US cross-region
- `eu.` - EU cross-region
- `apac.` - Asia-Pacific cross-region

### Issue: Slow Responses

**Cause:** Region is geographically far from user

**Fix:** Choose a region closer to your location:
- US: us-west-2 or us-east-1
- Europe: eu-west-1 or eu-central-1
- Asia: ap-northeast-1 or ap-southeast-2

## AWS CLI Installation

### macOS (Homebrew)
```bash
brew install awscli
```

### Manual Installation
Download from: https://aws.amazon.com/cli/

Verify installation:
```bash
aws --version
```

Should show: `aws-cli/2.x.x ...`

## SSO Session Management

### Check Session Status
```bash
aws sts get-caller-identity --profile <profile-name>
```

Success = session valid
Error = session expired

### Session Duration
Default: 12 hours

Can be configured by AWS administrator in SSO settings.

### Manual Session Refresh
```bash
aws sso login --profile <profile-name>
```

### Logout (Invalidate Session)
```bash
aws sso logout
```

Note: This logs out ALL SSO sessions, not just one profile.

## Bedrock vs Anthropic API Differences

### Model Naming
- Anthropic API: `claude-3-5-sonnet-20241022`
- Bedrock: `anthropic.claude-3-5-sonnet-v2:0`

### Authentication
- Anthropic API: API key in `ANTHROPIC_API_KEY`
- Bedrock: AWS credentials via SSO or IAM

### Pricing
- Check AWS Bedrock pricing page (varies by region and model)
- Generally competitive with Anthropic API
- Can use AWS credits and enterprise agreements

### Features
- Both support streaming
- Both support tool use (function calling)
- Bedrock may have region-specific availability delays for new models

## Troubleshooting Checklist

When things don't work, check in order:

1. **AWS CLI installed?**
   ```bash
   which aws
   ```

2. **Profile exists?**
   ```bash
   grep "^\[profile <name>\]" ~/.aws/config
   ```

3. **SSO session valid?**
   ```bash
   aws sts get-caller-identity --profile <profile>
   ```

4. **Bedrock permissions?**
   ```bash
   aws bedrock list-foundation-models --region <region>
   ```

5. **Claude Code configured?**
   ```bash
   cat ~/.claude/settings.json | grep BEDROCK
   ```

6. **Settings correct?**
   Changes to settings.json take effect immediately (no restart needed).

## Best Practices

### Profile Naming
Use descriptive names that indicate purpose and environment:
- Good: `company-dev`, `company-prod`, `personal-sandbox`
- Avoid: `profile1`, `test`, `temp`

### Region Selection
Choose based on:
1. Geographic proximity (latency)
2. Data residency requirements
3. Model availability
4. Cost (varies slightly by region)

### Security
- Never share SSO tokens or credentials
- Use short-lived SSO sessions (default 12 hours)
- Enable MFA on AWS account
- Use least-privilege IAM roles

### Credential Management
- Let auto-refresh handle expiration
- Don't hardcode credentials in code
- Use SSO for team environments
- Use IAM roles for production systems

## Advanced Configuration

### Multiple Profiles
You can have multiple profiles for different AWS accounts:

```ini
[profile work-dev]
sso_start_url = https://work.awsapps.com/start
sso_region = us-east-1
region = us-west-2

[profile work-prod]
sso_start_url = https://work.awsapps.com/start
sso_region = us-east-1
region = us-west-2

[profile personal]
sso_start_url = https://personal.awsapps.com/start
sso_region = us-east-1
region = us-east-1
```

Switch between them by changing `AWS_PROFILE` in settings.json.

### Custom Model Selection
Override the default model (use inference profile format for Claude 4.5):
```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "my-profile",
    "AWS_REGION": "us-west-2",
    "ANTHROPIC_MODEL": "us.anthropic.claude-opus-4-5-20251101-v1:0"
  }
}
```

### Environment-Specific Settings
Use different profiles for dev/staging/prod:
- Dev: `company-dev` in us-west-2
- Staging: `company-staging` in us-west-2
- Prod: `company-prod` in us-east-1 (for redundancy)

## Resources

### Official Documentation
- AWS Bedrock: https://aws.amazon.com/bedrock/
- Claude on Bedrock: https://docs.anthropic.com/claude/docs/bedrock
- AWS CLI: https://aws.amazon.com/cli/
- AWS SSO: https://aws.amazon.com/single-sign-on/

### Claude Code Documentation
- https://code.claude.com/docs/en/amazon-bedrock

### Support
- AWS Support: Via AWS Console
- Anthropic Support: support@anthropic.com
- Plugin Issues: https://github.com/ChadDahlgren/claude-code-provider/issues
