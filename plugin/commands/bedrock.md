---
description: Configure and manage AWS Bedrock integration for Claude Code
---

# /bedrock

Manage AWS Bedrock configuration for Claude Code. Provides setup, status monitoring, authentication refresh, and configuration reset.

## Step 1: Check Current State

First, check if Bedrock is already configured:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js test-bedrock
```

## Step 2: Show Menu

Use `AskUserQuestion` to present the menu. Adapt based on current state.

**If NOT configured (`configured: false`):**

```
AWS Bedrock
============================================

Status: Not configured

Select an option:
```

Options:
- **Setup Bedrock** - "Configure AWS Bedrock for Claude API access"
- **Check Status** - "View configuration and run health checks"

**If configured (`configured: true`):**

To get session expiration, also run:
```bash
aws configure export-credentials --profile <profile> --format process 2>/dev/null | jq -r '.Expiration // "unknown"'
```

Display with expiration info:
```
AWS Bedrock
============================================

  Profile:  <profile>
  Region:   <region>
  Model:    <model>
  Auth:     <✓ valid | ✗ expired>
  Expires:  <expiration time or "~Xh remaining">

Tip: Use /model to quickly switch between available models

Select an option:
```

Options:
- **Check Status** - "View configuration and run health checks"
- **Thinking Mode** - "Adjust reasoning depth for different tasks"
- **Refresh Auth** - "Re-authenticate your AWS SSO session"
- **Reconfigure** - "Change profile, region, or model settings"
- **Reset** - "Remove Bedrock config and use default API"

---

## Option: Setup Bedrock

Configure Claude Code to use AWS Bedrock for Claude API access.

### Step 1: Check Prerequisites

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js check-prerequisites
```

**If `ready: false`:**
- Show which tools are missing
- Use `AskUserQuestion`: "Install missing tools with Homebrew?"
- If yes: `brew install awscli`

### Step 2: Get AWS Context

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js get-aws-context
```

**If `needsSsoSetup: true` (no valid profiles):**

Tell user to run in their terminal:

```
Run: aws configure sso

Enter these values when prompted:
  SSO session name:        <profile_name>
  SSO start URL:           <sso_url>
  SSO region:              <sso_region>
  SSO registration scopes: sso:account:access   ← IMPORTANT for 90-day sessions!

Complete browser auth, then return here.
```

After user confirms, re-run `get-aws-context` to verify.

**If profiles exist:**
- Use `AskUserQuestion` to select profile
- Recommend the `recommended` profile if available

### Step 3: Check Bedrock Access

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js get-aws-context --check-bedrock --region=us-west-2
```

**If `bedrockAccess: true`:**
- Show available `inferenceProfiles`
- Use `AskUserQuestion` to select model

**If `bedrockAccess: false`:**
- May need SSO login: `aws sso login --profile <profile>`
- Or check IAM permissions
- Try other regions

### Step 4: Apply Configuration

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js apply-config --profile=<profile> --region=<region> --model=<model-id>
```

### Step 5: Done

```
✓ AWS Bedrock configured

  Profile:  <profile>
  Region:   <region>
  Model:    <model>

⚠ RESTART REQUIRED
  Exit and restart Claude Code for changes to take effect.
```

---

## Option: Check Status

View current configuration and run comprehensive health checks.

### Run Diagnostics

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js check-prerequisites
```

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js test-bedrock
```

### Display Results

```
Bedrock Status
============================================

  Profile:  <profile>
  Region:   <region>
  Model:    <model>

System
  [OK] AWS CLI installed (<version>)
  [OK] Node installed (<version>)

Authentication
  [OK/FAIL] <credentials.message>

Access
  [OK/FAIL] <bedrockAccess.message>
  [OK/FAIL] <modelAvailable.message>

Status: <All checks passed | X issue(s) detected>
```

### Offer Fixes

If issues found, offer to fix them:

| Issue | Offer |
|-------|-------|
| `credentials.passed: false` | "Re-authenticate AWS SSO?" |
| `bedrockAccess.passed: false` | "Try different region?" or check IAM |
| `modelAvailable.passed: false` | "Model changed. Reconfigure?" |

---

## Option: Thinking Mode

Adjust how deeply Claude reasons before responding. These settings control REASONING time - how long Claude deliberates. This is NOT context window or how much of the codebase Claude can see.

### Step 1: Get Current Config

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js inference-config
```

### Step 2: Show Settings

Use `AskUserQuestion` to present the presets:

```
Thinking Mode
============================================

These settings control REASONING time - how long Claude
deliberates before responding. This is NOT context window
or how much of your codebase Claude can see.

Current: <current.preset> (Reasoning: <thinkingTokens> | Output: <outputTokens>)

Select a preset:
```

Options (from `presets` array):
- **Balanced (Recommended)** - "Solid reasoning without overthinking. Reasoning: 8192 | Output: 8192"
- **Focused** - "Quick deliberation. Best for routine tasks. ⚠ May not fully analyze complex tradeoffs. Reasoning: 4096 | Output: 4096"
- **Thorough** - "Extended deliberation for architectural decisions. ⚠ May over-engineer straightforward problems. Reasoning: 16384 | Output: 16384"
- **Custom** - "Specify your own values (4096-16384)"

### Step 3: Apply Configuration

**If preset selected (focused, balanced, thorough):**

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js inference-config --preset=<preset>
```

**If custom selected:**

Use `AskUserQuestion` to get custom values:
- "Reasoning tokens (4096-16384)?"
- "Output tokens (4096-16384)?"

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js inference-config --preset=custom --thinking=<value> --output=<value>
```

### Step 4: Done

```
✓ Thinking mode updated

  Mode:      <preset>
  Reasoning: <thinkingTokens>
  Output:    <outputTokens>

⚠ RESTART REQUIRED
  Exit and restart Claude Code for changes to take effect.
```

---

## Option: Refresh Auth

Re-authenticate the AWS SSO session.

### Confirm

Use `AskUserQuestion`:
- "Re-authenticate AWS Bedrock? This will open your browser."
- Options: "Yes, open browser" / "Cancel"

### Run SSO Login

```bash
aws sso login --profile <profile>
```

**Note:** Opens browser for user interaction.

### Verify

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js test-bedrock
```

**Success:**
```
✓ Authentication successful

Your SSO session is now active.
```

**Failure:**
```
✗ Authentication may not have completed

Return to /bedrock and try again, or check Status for details.
```

---

## Option: Reconfigure

Same flow as Setup, but pre-populated with current values.

---

## Option: Reset

Remove AWS Bedrock configuration and return to the default Anthropic API.

### Confirm

Use `AskUserQuestion`:
- "Remove AWS Bedrock configuration? This will switch back to the default Anthropic API."
- Options: "Yes, reset" / "Cancel"

### Remove Configuration

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js apply-config --remove
```

### Done

```
✓ Bedrock configuration removed

Claude Code will now use the default Anthropic API.

⚠ RESTART REQUIRED
  Exit and restart Claude Code for changes to take effect.
```

---

## Manual Recovery

**Include when issues are detected or user requests help:**

```
────────────────────────────────────────────
Manual Recovery (if Claude becomes unresponsive)

If you can't use Claude commands due to API errors:
1. Edit ~/.claude/settings.json
2. Delete these keys from "env":
   CLAUDE_CODE_USE_BEDROCK, AWS_PROFILE, AWS_REGION, ANTHROPIC_MODEL
3. Delete "awsAuthRefresh" and "model" (if present)
4. Restart Claude Code
```

---

## Error Reference

| Error | Fix |
|-------|-----|
| `ready: false` | Install missing tools (aws-cli) |
| `needsSsoSetup: true` | Run `aws configure sso` in terminal |
| `credentials.passed: false` | Select "Refresh Auth" option |
| `bedrockAccess.passed: false` | Check IAM permissions or try different region |
| `modelAvailable.passed: false` | Select "Reconfigure" to pick new model |
| Sessions expire quickly | Reconfigure SSO with `sso:account:access` scope |
