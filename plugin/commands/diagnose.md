---
description: Run diagnostics to identify configuration or authentication issues
---

# Provider Diagnose Command

Run comprehensive diagnostics on the current provider configuration and identify any issues.

## Your Role

Systematically check all components of the provider setup:
1. System dependencies (AWS CLI)
2. Configuration files
3. Authentication status
4. Provider access (Bedrock availability)
5. Claude Code settings

Provide clear, actionable fixes for any problems found.

## Design Rules

- **No decorative emojis** — Only use ✓ ✗ for pass/fail
- **Group checks logically** — System, Authentication, Bedrock Access, Claude Code
- **Stop at first critical failure** — No point checking Bedrock if AWS CLI is missing
- **Actionable fixes** — Tell user exactly what command to run

## Output Format

### When All Checks Pass

```
❯ /provider:diagnose

Running diagnostics...

System
  ✓ AWS CLI installed (v2.15.0)
  ✓ Profile exists (cricut-dev)

Authentication
  ✓ SSO session valid
  ✓ Credentials not expired (6h 23m remaining)
  ✓ Auto-refresh configured

Bedrock Access
  ✓ Region us-west-2 supports Bedrock
  ✓ Claude Sonnet available
  ✓ Claude Opus available
  ✓ Claude Haiku available

Claude Code
  ✓ Bedrock mode enabled
  ✓ Profile configured
  ✓ Region configured

✓ All checks passed
```

### When Issues Found (Example: Expired Session)

```
❯ /provider:diagnose

Running diagnostics...

System
  ✓ AWS CLI installed (v2.15.0)
  ✓ Profile exists (cricut-dev)

Authentication
  ✗ SSO session expired

Issue found
Your SSO session has expired.

To fix:
  aws sso login --profile cricut-dev

Or run /provider:refresh to re-authenticate.
```

### When Critical Failure (No AWS CLI)

```
❯ /provider:diagnose

Running diagnostics...

System
  ✗ AWS CLI not installed

Issue found
AWS CLI is required but not installed.

To fix: Run /provider to install AWS CLI
```

### When No Provider Configured

```
❯ /provider:diagnose

No provider configured

Claude Code is using the default Anthropic API.
Nothing to diagnose.

To configure a provider, run: /provider
```

## Implementation Steps

### Step 0: Check if Provider is Configured

Read `~/.claude/settings.json`. If no `CLAUDE_CODE_USE_BEDROCK` is set, show "No provider configured" and exit.

### Step 1: System Checks

#### Check AWS CLI Installation
```bash
which aws && aws --version
```

Expected output: `aws-cli/2.15.0 ...`

- ✓ If installed, show version
- ✗ If not found, fail with installation instructions

#### Check Profile Exists
Parse `~/.aws/config` for the configured profile.

```bash
grep -q "^\[profile ${AWS_PROFILE}\]" ~/.aws/config
```

- ✓ If found
- ✗ If not found, suggest reconfiguring with `/provider`

### Step 2: Authentication Checks

#### Check SSO Session Validity
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-sso-session.sh <profile-name>
```

Returns: `valid <seconds>` or `expired` or `error <message>`

- ✓ If valid, show time remaining
- ✗ If expired, show fix command

#### Check Credentials
Try to get caller identity:
```bash
aws sts get-caller-identity --profile <profile-name> 2>&1
```

- ✓ If successful, credentials work
- ✗ If fails, show error and suggest re-login

#### Check Auto-Refresh
Look for `awsAuthRefresh` in settings.json:
- ✓ If present and non-empty
- ✗ If missing (suggest running `/provider` again)

### Step 3: Bedrock Access Checks

#### Check Region Supports Bedrock
Verify the configured region is in the supported list:
- `us-east-1`, `us-west-2`, `eu-west-1`, `eu-central-1`, `ap-northeast-1`, `ap-southeast-2`

- ✓ If region is supported
- ✗ If not, suggest selecting a different region

#### Check Claude Model Availability
Test access to Bedrock models (only if credentials are valid):

```bash
aws bedrock list-foundation-models --region <region> --by-provider anthropic --query 'modelSummaries[*].modelId' 2>&1
```

Look for:
- `anthropic.claude-sonnet-*`
- `anthropic.claude-opus-*`
- `anthropic.claude-haiku-*`

- ✓ For each model family found
- ! If no models found (might be IAM permissions issue)

### Step 4: Claude Code Configuration Checks

#### Check CLAUDE_CODE_USE_BEDROCK
Look in `~/.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1"
  }
}
```

- ✓ If set to "1"
- ✗ If missing or wrong value

#### Check AWS_PROFILE
- ✓ If set in env
- ✗ If missing

#### Check AWS_REGION
- ✓ If set in env
- ✗ If missing

### Step 5: Summary

If all checks pass:
```
✓ All checks passed
```

If any check fails, stop at the first failure and show:
```
Issue found
<Description of problem>

To fix:
  <Specific command or action>
```

---

## GOOGLE VERTEX AI DIAGNOSTICS

When Google Vertex AI is configured (`CLAUDE_CODE_USE_VERTEX=1`), run these checks:

### Vertex Check 1: System

#### Check gcloud CLI Installation
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-gcloud.sh
```

- ✓ If installed, show version
- ✗ If not found, fail with installation instructions

#### Check Project Exists
Verify the configured project is accessible:
```bash
gcloud projects describe <project-id> 2>&1
```

- ✓ If found
- ✗ If not found, suggest reconfiguring

### Vertex Check 2: Authentication

#### Check ADC Status
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-gcloud-auth.sh
```

- ✓ If valid
- ✗ If not configured or expired, show fix command

#### Check Access Token
Try to get an access token:
```bash
gcloud auth application-default print-access-token 2>&1
```

- ✓ If successful
- ✗ If fails, show error and suggest re-login

#### Check Auto-Refresh
Look for `vertexAuthRefresh` in settings.json:
- ✓ If present and non-empty
- ✗ If missing

### Vertex Check 3: Vertex AI Access

#### Check API Enabled
```bash
gcloud services list --enabled --filter="name:aiplatform.googleapis.com" --project=<project-id> 2>&1
```

- ✓ If enabled
- ✗ If not enabled, suggest enabling it

#### Check Region Support
Verify the configured region is supported:
- `us-central1`, `us-east5`, `europe-west1`, `europe-west4`, `asia-southeast1`

- ✓ If region is supported
- ✗ If not, suggest selecting a different region

#### Check Model Access
Test access to Vertex AI (optional, can be slow):
```bash
gcloud ai models list --region=<region> --project=<project-id> 2>&1
```

- ✓ If can list models
- ! If permission denied (might be IAM issue)

### Vertex Check 4: Claude Code Configuration

#### Check CLAUDE_CODE_USE_VERTEX
- ✓ If set to "1"
- ✗ If missing or wrong value

#### Check GOOGLE_PROJECT_ID
- ✓ If set in env
- ✗ If missing

#### Check ANTHROPIC_VERTEX_REGION
- ✓ If set in env
- ✗ If missing

### Vertex Output Example (Success)

```
❯ /provider:diagnose

Running diagnostics...

System
  ✓ gcloud CLI installed (v462.0.1)
  ✓ Project exists (my-personal-project)

Authentication
  ✓ Application-default credentials configured
  ✓ Access token valid
  ✓ Auto-refresh configured

Vertex AI Access
  ✓ Vertex AI API enabled
  ✓ Region us-central1 supports Vertex AI
  ✓ Can access Vertex AI APIs

Claude Code
  ✓ Vertex AI mode enabled
  ✓ Project configured
  ✓ Region configured

✓ All checks passed
```

### Vertex Output Example (Error)

```
❯ /provider:diagnose

Running diagnostics...

System
  ✓ gcloud CLI installed (v462.0.1)
  ✓ Project exists (my-personal-project)

Authentication
  ✗ Application-default credentials not configured

Issue found
Google Cloud authentication is not set up.

To fix:
  gcloud auth application-default login

Or run /provider:refresh to re-authenticate.
```

---

## Helper Scripts

### AWS Bedrock Scripts

**Check AWS CLI:**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-aws-cli.sh
```

**Check SSO Session:**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-sso-session.sh <profile-name>
```

### Google Vertex AI Scripts

**Check gcloud CLI:**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-gcloud.sh
```

**Check gcloud Auth:**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-gcloud-auth.sh
```

**Get Projects:**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/get-gcloud-projects.sh
```

## Error Messages by Issue Type

### AWS CLI Not Installed
```
Issue found
AWS CLI is required but not installed.

To fix: Run /provider to install AWS CLI
```

### Profile Doesn't Exist
```
Issue found
Profile "cricut-dev" not found in ~/.aws/config

To fix:
  1. Run /provider to reconfigure
  2. Or run: aws configure sso --profile cricut-dev
```

### SSO Session Expired
```
Issue found
Your SSO session has expired.

To fix:
  aws sso login --profile cricut-dev

Or run /provider:refresh to re-authenticate.
```

### Invalid Credentials
```
Issue found
Credentials are invalid or expired.

To fix:
  aws sso login --profile cricut-dev
```

### Region Not Supported
```
Issue found
Region "us-west-1" does not support Claude on Bedrock.

Supported regions:
  • us-east-1 (N. Virginia)
  • us-west-2 (Oregon)
  • eu-west-1 (Ireland)
  • eu-central-1 (Frankfurt)
  • ap-northeast-1 (Tokyo)
  • ap-southeast-2 (Sydney)

To fix: Run /provider and select a supported region
```

### No Bedrock Access (IAM Issue)
```
Issue found
Cannot access Bedrock models in us-west-2.

This is likely an IAM permissions issue.
Your AWS role needs these permissions:
  • bedrock:ListFoundationModels
  • bedrock:InvokeModel

Contact your AWS administrator.
```

### Missing Configuration
```
Issue found
Claude Code configuration is incomplete.

Missing: AWS_PROFILE in ~/.claude/settings.json

To fix: Run /provider to reconfigure
```

### Google Vertex AI Error Messages

### gcloud CLI Not Installed
```
Issue found
gcloud CLI is required but not installed.

To fix: Run /provider to install gcloud CLI
```

### ADC Not Configured
```
Issue found
Google Cloud authentication is not set up.

To fix:
  gcloud auth application-default login

Or run /provider:refresh to authenticate.
```

### Project Not Found
```
Issue found
Project "my-project-id" not found or not accessible.

To fix:
  1. Verify project ID is correct
  2. Check you have access to the project
  3. Run: gcloud projects list
  4. Or run /provider to reconfigure
```

### Vertex AI API Not Enabled
```
Issue found
Vertex AI API is not enabled for project "my-project-id".

To fix:
  gcloud services enable aiplatform.googleapis.com --project=my-project-id

Or run /provider to enable it interactively.
```

### Region Not Supported (Vertex)
```
Issue found
Region "us-west1" does not support Claude on Vertex AI.

Supported regions:
  • us-central1 (Iowa)
  • us-east5 (Columbus)
  • europe-west1 (Belgium)
  • europe-west4 (Netherlands)
  • asia-southeast1 (Singapore)

To fix: Run /provider and select a supported region
```

### No Vertex Access (IAM Issue)
```
Issue found
Cannot access Vertex AI in project "my-project-id".

This is likely an IAM permissions issue.
Your account needs this role:
  • Vertex AI User (roles/aiplatform.user)

Contact your Google Cloud administrator.
```

### Billing Not Enabled
```
Issue found
Billing is not enabled for project "my-project-id".

Vertex AI requires an active billing account.

To fix:
  1. Visit: console.cloud.google.com/billing
  2. Enable billing for your project
  3. Run /provider again
```

---

## Performance Notes

- **Short-circuit on critical failures** — If AWS CLI is missing, don't continue checking
- **Cache results** — Don't re-check the same thing multiple times
- **Parallel checks where possible** — System checks can run in parallel
- **Graceful degradation** — If one non-critical check fails, continue to others

## Exit Conditions

- If no provider configured → Show message and exit
- If critical failure (AWS CLI, profile) → Show fix and exit
- If auth expired → Show fix but could continue to config checks
- If all pass → Show success summary
