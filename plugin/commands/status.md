---
description: Show current provider configuration and authentication status
---

# Provider Status Command

Show the current Claude Code provider configuration status.

## Your Role

Display a clear, at-a-glance view of:
- Which provider is active (if any)
- Profile and region configuration
- Authentication status and time remaining
- Auto-refresh configuration
- All configured providers (for future multi-provider support)

## Design Rules

- **No decorative emojis** — Only use ✓ ✗ ● ○ for status indicators
- **Friendly language** — "Auth: valid" not "SSO session status: ACTIVE"
- **Clear time formatting** — "6h 23m remaining" not raw timestamps
- **Show actionable commands** — List relevant commands at the bottom

## Output Format

### When Bedrock is Configured

```
❯ /provider:status

Claude Provider Status
────────────────────────────────────────────

Active Provider
  Provider:     AWS Bedrock ● active
  Profile:      cricut-dev
  Region:       us-west-2
  Auth:         ✓ valid (6h 23m remaining)
  Auto-refresh: on

Configured Providers
  ● AWS Bedrock - cricut-dev
  ○ Google Vertex AI - not configured
  ○ Azure Foundry - not configured

Commands: /provider:diagnose • /provider:switch • /provider
```

### When Vertex AI is Configured

```
❯ /provider:status

Claude Provider Status
────────────────────────────────────────────

Active Provider
  Provider:     Google Vertex AI ● active
  Project:      my-personal-project
  Region:       us-central1
  Auth:         ✓ valid
  Auto-refresh: on

Configured Providers
  ○ AWS Bedrock - not configured
  ● Google Vertex AI - my-personal-project
  ○ Azure Foundry - not configured

Commands: /provider:diagnose • /provider:switch • /provider
```

### When Nothing is Configured

```
❯ /provider:status

Claude Provider Status
────────────────────────────────────────────

No provider configured

Claude Code is currently using the default Anthropic API.

To configure a provider, run: /provider

Supported providers:
  • AWS Bedrock
  • Google Vertex AI (coming soon)
  • Azure Foundry (coming soon)
```

### When Auth is Expired

```
❯ /provider:status

Claude Provider Status
────────────────────────────────────────────

Active Provider
  Provider:     AWS Bedrock ● active
  Profile:      cricut-dev
  Region:       us-west-2
  Auth:         ✗ expired
  Auto-refresh: on

⚠ Your SSO session has expired

To re-authenticate:
  /provider:refresh

Or run manually:
  aws sso login --profile cricut-dev

Commands: /provider:diagnose • /provider:refresh • /provider
```

## Implementation Steps

### Step 1: Read Configuration

Read `~/.claude/settings.json` to check for providers:

**AWS Bedrock:**
```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "profile-name",
    "AWS_REGION": "us-west-2"
  },
  "awsAuthRefresh": "aws sso login --profile profile-name"
}
```

**Google Vertex AI:**
```json
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "1",
    "GOOGLE_PROJECT_ID": "my-project-id",
    "ANTHROPIC_VERTEX_REGION": "us-central1"
  },
  "vertexAuthRefresh": "gcloud auth application-default login"
}
```

If neither provider is configured, show "No provider configured".

### Step 2: Check Auth Status

**If AWS Bedrock is configured:**

Check SSO session validity:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-sso-session.sh <profile-name>
```

Returns:
- `valid <expiration-time>` — Session is active
- `expired` — Session needs renewal
- `error <message>` — Something went wrong

**If Google Vertex AI is configured:**

Check ADC status:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-gcloud-auth.sh
```

Returns:
- `valid` — ADC is configured and working
- `not-configured` — ADC not set up
- `expired` — Credentials need renewal
- `error <message>` — Something went wrong

### Step 3: Calculate Time Remaining

If session is valid, parse the expiration time and calculate hours/minutes remaining.

Example:
- `7200` seconds → "2h 0m remaining"
- `23400` seconds → "6h 30m remaining"
- `3600` seconds → "1h 0m remaining"
- `300` seconds → "5m remaining"

### Step 4: Check Auto-Refresh

Look for `awsAuthRefresh` field in settings.json:
- If present and non-empty → "on"
- If missing or empty → "off"

### Step 5: Display Output

Format the output according to the templates above based on:
- Is anything configured?
- Is auth valid or expired?
- Is auto-refresh enabled?

## Helper Scripts

Use these scripts:

### Check SSO Session
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-sso-session.sh <profile-name>
```
Returns: `valid <seconds>` or `expired` or `error <message>`

## Variables to Extract

From `~/.claude/settings.json`:
- `CLAUDE_CODE_USE_BEDROCK` (if "1", Bedrock is active)
- `AWS_PROFILE` (profile name)
- `AWS_REGION` (Bedrock region)
- `awsAuthRefresh` (if present, auto-refresh is on)

## Error Handling

### Can't Read settings.json
```
✗ Could not read Claude Code settings

Make sure ~/.claude/settings.json exists.
To configure a provider, run: /provider
```

### Profile No Longer Exists
```
⚠ Configuration issue

Profile "cricut-dev" is configured but not found in ~/.aws/config

To fix:
  1. Run /provider to reconfigure
  2. Or run: aws configure sso --profile cricut-dev
```

### AWS CLI Not Available
```
⚠ AWS CLI not found

Your configuration references AWS Bedrock, but AWS CLI is not installed.

To fix: /provider
```

## Future: Multi-Provider Display

When Vertex AI and Azure are added, the "Configured Providers" section will show:

```
Configured Providers
  ● AWS Bedrock - cricut-dev (us-west-2)
  ● Google Vertex AI - my-project (us-central1)
  ○ Azure Foundry - not configured
```

The `●` (filled circle) means configured, `○` (empty circle) means not configured.
The first one with `● active` is the currently active provider.
