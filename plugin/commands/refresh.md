---
description: Re-authenticate your cloud provider session
---

# Provider Refresh Command

Re-authenticate the current provider's SSO session.

## Your Role

This is a convenience command that runs the SSO login flow for the currently configured profile. It's faster than running `/provider` again when you just need to refresh expired credentials.

## Design Rules

- **Simple and focused** — Just re-run SSO login
- **No decorative emojis** — Only use ✓ ✗ for status
- **Show what's happening** — Display the command being run
- **Handle errors gracefully** — If no provider configured, tell user what to do

## Output Format

### AWS Bedrock Refresh

```
❯ /provider:refresh

Re-authenticating AWS Bedrock
Profile: cricut-dev

Running: aws sso login --profile cricut-dev

Opening browser for SSO login...

If the browser doesn't open, visit:
  https://device.sso.us-east-1.amazonaws.com/?user_code=BMHT-GRXP

Waiting for authentication...
```

After successful authentication:

```
✓ Authentication successful

Your SSO session is now active.
Credentials expire in: 12h 0m

Run /provider:status to verify configuration.
```

### When No Provider Configured

```
❯ /provider:refresh

No provider configured

There's nothing to refresh.
Claude Code is currently using the default Anthropic API.

To configure a provider, run: /provider
```

### When Authentication Fails

```
❯ /provider:refresh

Re-authenticating AWS Bedrock
Profile: cricut-dev

Running: aws sso login --profile cricut-dev

✗ Authentication failed

Possible causes:
  • Network connectivity issues
  • SSO portal unavailable
  • Browser didn't complete authorization

To troubleshoot:
  1. Check your internet connection
  2. Try again: /provider:refresh
  3. Or reconfigure: /provider
```

### Google Vertex AI Refresh

```
❯ /provider:refresh

Re-authenticating Google Vertex AI
Project: my-personal-project

Running: gcloud auth application-default login

Opening browser for Google authentication...

If the browser doesn't open, visit the URL displayed by gcloud.

Waiting for authentication...
```

After successful authentication:

```
✓ Authentication successful

Your application-default credentials are now configured.

Run /provider:status to verify configuration.
```

### When Vertex Authentication Fails

```
❯ /provider:refresh

Re-authenticating Google Vertex AI
Project: my-personal-project

Running: gcloud auth application-default login

✗ Authentication failed

Possible causes:
  • Network connectivity issues
  • Google authentication unavailable
  • Browser didn't complete authorization

To troubleshoot:
  1. Check your internet connection
  2. Try again: /provider:refresh
  3. Or reconfigure: /provider
```

## Implementation Steps

### Step 1: Check if Provider is Configured

Read `~/.claude/settings.json` to determine which provider is active:

**AWS Bedrock:**
```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "profile-name"
  }
}
```

**Google Vertex AI:**
```json
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "1",
    "GOOGLE_PROJECT_ID": "project-id"
  }
}
```

If neither is configured:
- Show "No provider configured" message
- Exit

### Step 2: Run Authentication Command

**For AWS Bedrock:**

Extract profile name from `AWS_PROFILE` and run:
```bash
aws sso login --profile <profile-name>
```

Then verify with:
```bash
aws sts get-caller-identity --profile <profile-name> 2>&1
```

**For Google Vertex AI:**

Run:
```bash
gcloud auth application-default login
```

Then verify with:
```bash
gcloud auth application-default print-access-token 2>&1
```

### Step 3: Display Results

**For AWS Bedrock:**

If successful, calculate expiration time:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-sso-session.sh <profile-name>
```

Convert seconds to friendly format:
- `43200` → "12h 0m"
- `23400` → "6h 30m"
- `3600` → "1h 0m"

**For Google Vertex AI:**

If successful, show success message. ADC tokens are auto-refreshed by gcloud, so no expiration display needed.

## Helper Scripts

### AWS Bedrock

**Check SSO Session:**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-sso-session.sh <profile-name>
```
Returns: `valid <seconds>` or `expired` or `error <message>`

### Google Vertex AI

**Check gcloud Auth:**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-gcloud-auth.sh
```
Returns: `valid` or `not-configured` or `expired` or `error <message>`

## Error Handling

### AWS CLI Not Found
```
✗ AWS CLI not found

To fix: Run /provider to install and configure AWS CLI
```

### Profile Doesn't Exist
```
✗ Profile "cricut-dev" not found

Your configuration references a profile that doesn't exist.

To fix: Run /provider to reconfigure
```

### Network Error
```
✗ Authentication failed

Could not connect to AWS SSO service.
Check your internet connection and try again.
```

### Browser Authorization Timeout
```
✗ Authentication timed out

You didn't complete authorization in the browser.

To try again: /provider:refresh
```

## Alternative Usage

Users can also refresh manually without this command:
```bash
aws sso login --profile <profile-name>
```

But this command provides:
1. Automatic profile detection
2. Friendly output formatting
3. Verification of success
4. Expiration time display

## Future Enhancements

When multiple providers are supported (Vertex, Azure):
- Detect which provider is active
- Run the appropriate refresh command for that provider
  - AWS: `aws sso login`
  - Vertex: `gcloud auth application-default login`
  - Azure: `az login`
