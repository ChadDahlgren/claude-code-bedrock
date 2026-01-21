---
description: Configure Claude Code to use AWS Bedrock or Google Vertex AI
---

# Provider Setup Command

You are helping the user configure Claude Code to use an enterprise cloud provider (AWS Bedrock, Google Vertex AI, or Azure Foundry).

## Your Role

Guide the user through an interactive setup wizard. **Follow this document as a script - execute each screen in order.**

## CRITICAL INSTRUCTIONS

1. **Follow the screens in order** - Do not skip steps or combine steps
2. **Use AskUserQuestion tool** for all user choices - Do not use markdown menus
3. **One step at a time** - Complete each screen before moving to the next
4. **No interactive terminal commands** - Use the cheat sheet approach for `aws configure sso`
5. **Verify after each action** - Run verification commands before proceeding
6. **Use exact values** - When writing to settings.json, use `"1"` not `"01"`, use exact model IDs from the tables

## Design Rules

**CRITICAL**: Follow these rules exactly:
- **No decorative emojis** — Only use ✓ ✗ ● ○ for status indicators
- **Defaults in brackets** — e.g., `Region [2]: ` means option 2 is default (user can press Enter)
- **Numbered choices** — [1], [2], [3] for selection, [y/n/q] for yes/no/cancel
- **No env var exposure** — Don't show `CLAUDE_CODE_USE_BEDROCK=1`, just say "Bedrock mode enabled"
- **Friendly language** — "Auth: valid" not "SSO session status: ACTIVE"
- **Consistent structure** — Title, context line, content, choices, prompt

## Flow Overview

### Screen 1: Provider Selection

Start with this screen:

```
❯ /provider

Claude Provider Setup
Configure Claude Code to use enterprise cloud providers

Select a provider:

  [1] AWS Bedrock
  [2] Google Vertex AI
  [3] Azure Foundry (coming soon)

  [s] View status
  [q] Cancel

Choice:
```

Ask the user to choose. If they select:
- `1` → Continue to AWS Bedrock setup (see AWS Setup Flow below)
- `2` → Continue to Google Vertex AI setup (see Vertex Setup Flow below)
- `3` → Tell them it's coming soon, stay on this screen
- `s` → Jump to status view (see provider-status.md behavior)
- `q` → Cancel and exit

---

## AWS BEDROCK SETUP FLOW

This section covers the complete flow for AWS Bedrock setup (when user selects option [1]).

**IMPORTANT**: Use direct AWS CLI commands, not wrapper scripts. Use the `AskUserQuestion` tool for user choices when possible.

### Screen 2: Check AWS CLI

Once user selects AWS Bedrock, check if AWS CLI is installed:

```bash
which aws && aws --version
```

**If AWS CLI is NOT installed:**

Use `AskUserQuestion` tool:
- Question: "AWS CLI is required but not installed. How would you like to proceed?"
- Options:
  - "Install with Homebrew" (runs `brew install awscli`)
  - "I'll install it manually"

**After successful installation (or if already installed):**

Continue to Screen 3.

### Screen 3: Check for Existing SSO Profiles

Check for existing SSO profiles using AWS CLI:

```bash
aws configure list-profiles
```

For each profile found, get its region:
```bash
aws configure get region --profile <profile-name>
```

**If profiles found:**

Use `AskUserQuestion` tool with the profiles as options:
- Question: "Select an AWS profile to use with Bedrock"
- Options: List each profile found (e.g., "cricut-dev (us-west-2)", "cricut-prod (us-east-1)")
- Add option: "Configure a new profile"

**If NO profiles found:**

Tell the user: "No SSO profiles found. Let's set up AWS SSO."

Continue to Fresh SSO Setup flow (Screen 3b).

### Screen 3b: Fresh SSO Setup (If No Profiles)

**IMPORTANT**: Claude Code cannot run interactive terminal commands. Instead, give the user a "cheat sheet" to run in their own terminal.

Use `AskUserQuestion` tool to collect the following information:
- Question 1: "What is your AWS SSO start URL?" (e.g., `https://company.awsapps.com/start`)
- Question 2: "What AWS region is your SSO configured in?" (Options: us-west-2, us-east-1, eu-west-1)
- Question 3: "What would you like to name this profile?" (e.g., `work-dev`, `company-sso`)

Then display this cheat sheet for the user to run in their terminal:

```
I can't run interactive AWS commands directly. Please run this in your terminal:

┌─────────────────────────────────────────────────────────────────┐
│  aws configure sso                                              │
│                                                                 │
│  When prompted, enter:                                          │
│    SSO session name: {profile_name}                             │
│    SSO start URL: {sso_url}                                     │
│    SSO region: {sso_region}                                     │
│    SSO registration scopes: (press Enter for default)           │
│                                                                 │
│  Then complete authentication in your browser.                  │
│                                                                 │
│  When prompted for remaining options:                           │
│    Default client Region: us-west-2 (or your preferred region)  │
│    CLI default output format: json                              │
│    CLI profile name: {profile_name}                             │
└─────────────────────────────────────────────────────────────────┘

Type 'done' when you've completed the setup, or 'cancel' to abort.
```

Wait for user to confirm they've completed it.

Then verify the profile was created:
```bash
aws configure list-profiles | grep -w "{profile_name}"
```

If profile exists, continue to Screen 4. If not, ask user to try again.

### Screen 4: Select Bedrock Region

Use `AskUserQuestion` tool:
- Question: "Select a Bedrock region"
- Options:
  - "us-west-2 (Oregon) - Recommended"
  - "us-east-1 (N. Virginia)"
  - "eu-west-1 (Ireland)"
  - "ap-northeast-1 (Tokyo)"

### Screen 5: Authenticate (Existing Profile)

If using an existing profile, run SSO login:

```bash
aws sso login --profile <profile-name>
```

Tell user: "Opening browser for SSO login. Complete the authentication in your browser."

Wait for the command to complete successfully.

### Screen 6: Select Model

**Query available Claude inference profiles directly from AWS:**

```bash
aws bedrock list-inference-profiles --region <region> --query "inferenceProfileSummaries[?contains(modelArn, 'anthropic')].[inferenceProfileId,inferenceProfileName]" --output text
```

This returns the actual inference profile IDs you can use, like:
```
us.anthropic.claude-opus-4-5-20251101-v1:0    US Anthropic Claude Opus 4.5
us.anthropic.claude-sonnet-4-5-20250929-v1:0  US Anthropic Claude Sonnet 4.5
us.anthropic.claude-haiku-4-5-20251001-v1:0   US Anthropic Claude Haiku 4.5
```

Use `AskUserQuestion` tool with the models returned by the query:
- Question: "Select a Claude model for Bedrock"
- Options: List the inference profiles returned (show the friendly name, store the ID)

**Use the exact `inferenceProfileId` from the query** - don't modify or construct it manually.

### Screen 7: Show Undo Instructions (CRITICAL)

**Before applying any configuration**, show the user how to manually undo:

```
Before we switch to Bedrock, here's how to undo if needed:

Settings file: ~/.claude/settings.json

To revert manually, change these values:
  "CLAUDE_CODE_USE_BEDROCK": "0"

Or delete these lines from the "env" section:
  - CLAUDE_CODE_USE_BEDROCK
  - AWS_PROFILE
  - AWS_REGION
  - ANTHROPIC_MODEL

You will need to restart Claude Code after setup for changes to take effect.

Ready to proceed? [y/n]
```

Wait for user confirmation before applying.

### Screen 8: Apply Configuration

After user confirms:

```
Applying configuration...

✓ Enabled Bedrock mode
✓ Set profile to <profile>
✓ Set region to <region>
✓ Set model to <model>
✓ Configured auto-refresh

Saved to ~/.claude/settings.json
```

**Write to `~/.claude/settings.json`:**

Read existing settings, merge new config (don't overwrite existing keys like permissions!):

**EXACT values to write** (copy these exactly):

```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "CLAUDE_CODE_USE_VERTEX": "0",
    "AWS_PROFILE": "<profile>",
    "AWS_REGION": "<region>",
    "ANTHROPIC_MODEL": "<model-id-from-table>"
  },
  "bedrockAuthRefresh": "aws sso login --profile <profile>"
}
```

**VALUE REQUIREMENTS**:
- `CLAUDE_CODE_USE_BEDROCK`: Must be exactly `"1"` (not `"01"`, not `1`, not `true`)
- `CLAUDE_CODE_USE_VERTEX`: Must be exactly `"0"`
- `ANTHROPIC_MODEL`: Use the exact `inferenceProfileId` returned by `aws bedrock list-inference-profiles`

The inference profile IDs from AWS already have the correct format (e.g., `us.anthropic.claude-*`).
```

### Screen 9: Success

Display this summary:

```
────────────────────────────────────────────
  ✓ AWS Bedrock configured
────────────────────────────────────────────

  Provider:     AWS Bedrock
  Profile:      <profile>
  Region:       <region>
  Model:        <model>
  Auto-refresh: on

⚠ RESTART REQUIRED
  Please exit Claude Code and restart it for Bedrock to take effect.
  Run: claude --plugin-dir <plugin-path>

If something breaks after restart, edit ~/.claude/settings.json and set:
  "CLAUDE_CODE_USE_BEDROCK": "0"

Run /provider:status after restart to verify configuration.
```

**IMPORTANT**: End the setup by using `AskUserQuestion` tool:
- Question: "Setup complete. Please restart Claude Code for changes to take effect. What would you like to do?"
- Options:
  - "Exit now (I'll restart Claude Code)"
  - "Something went wrong, help me troubleshoot"

This confirms the user understands they need to restart.

## Direct CLI Commands Reference

Use these commands directly - no wrapper scripts needed.

### AWS Commands
```bash
# Check AWS CLI
which aws && aws --version

# List SSO profiles
aws configure list-profiles

# Get profile region
aws configure get region --profile <profile-name>

# Login with SSO
aws sso login --profile <profile-name>

# List available Claude inference profiles on Bedrock
aws bedrock list-inference-profiles --region <region> \
  --query "inferenceProfileSummaries[?contains(modelArn, 'anthropic')].[inferenceProfileId,inferenceProfileName]" \
  --output text

# Check identity
aws sts get-caller-identity --profile <profile-name>
```

### GCP Commands
```bash
# Check gcloud CLI
which gcloud && gcloud --version | head -1

# Check authentication
gcloud auth application-default print-access-token

# Authenticate
gcloud auth application-default login

# List projects
gcloud projects list --format="value(projectId)"

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com --project=<project-id>

# Check enabled APIs
gcloud services list --enabled --project=<project-id> | grep aiplatform
```

### Check SSO Session
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-sso-session.sh <profile-name>
```
Returns: valid/expired/error

### Apply Configuration
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/apply-config.sh <profile> <region>
```
Merges configuration into ~/.claude/settings.json safely

## Error Handling

### AWS CLI Missing
Offer to install with Homebrew or let user install manually.

### Profile Parsing Fails
If `~/.aws/config` is malformed, show error:
```
✗ Error reading AWS configuration
  Your ~/.aws/config file may be malformed.

To fix: Check the file or configure a new profile with [n]
```

### SSO Login Fails
If `aws sso login` fails:
```
✗ Authentication failed

Check that:
  - Your SSO URL is correct
  - You have network access
  - You selected an account/role in the browser

Try again with /provider or run: aws sso login --profile <profile>
```

### Settings.json Write Fails
If can't write to `~/.claude/settings.json`:
```
✗ Could not save configuration

Make sure ~/.claude directory exists and is writable.
Try: mkdir -p ~/.claude
```

---

## GOOGLE VERTEX AI SETUP FLOW

This section covers the complete flow for Google Vertex AI setup (when user selects option [2]).

### Vertex Screen 1: Check gcloud CLI

Once user selects Google Vertex AI, check if gcloud CLI is installed:

```bash
which gcloud && gcloud --version | head -1
```

**If gcloud CLI is NOT installed:**

Use `AskUserQuestion` tool:
- Question: "gcloud CLI is required but not installed. How would you like to proceed?"
- Options:
  - "Install with Homebrew" (runs `brew install google-cloud-sdk`)
  - "I'll install it manually"

**After successful installation (or if already installed):**

Continue to Vertex Screen 2.

### Vertex Screen 2: Check Authentication

Check if user has configured application-default credentials:

```bash
gcloud auth application-default print-access-token 2>/dev/null
```

If this returns a token, they're authenticated. If it fails, they need to authenticate.

**If NOT authenticated:**

Tell user: "Let's authenticate with Google Cloud. This will open your browser."

Run:
```bash
gcloud auth application-default login
```

Wait for completion.

Continue to Vertex Screen 3.

### Vertex Screen 3: Select Project

Get list of available projects:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/get-gcloud-projects.sh
```

**If projects found:**

```
❯ /provider
Selected: Google Vertex AI

✓ gcloud CLI installed
✓ Authenticated
✓ Found Google Cloud projects

Select a project to use with Vertex AI:

  [1] my-personal-project
  [2] company-dev-project
  [3] ai-experiments-proj

  [q] Cancel

Choice:
```

List all projects found (up to 10, or paginate if more).

**If NO projects found:**

```
❯ /provider
Selected: Google Vertex AI

✓ gcloud CLI installed
✓ Authenticated
! No Google Cloud projects found

You need a Google Cloud project to use Vertex AI.

To create a project:
  1. Visit: https://console.cloud.google.com/projectcreate
  2. Create a new project
  3. Run /provider again

Or contact your Google Cloud administrator for access.

Press Enter to continue to console or [q] to cancel:
```

If they press Enter, you can mention opening the browser, but they need to do this manually and come back.

### Vertex Screen 4: Select Vertex Region

Show Vertex AI region selection:

```
❯ /provider
Project: my-personal-project

Select Vertex AI region

  [1] us-central1 (Iowa) ← recommended
  [2] us-east5 (Columbus)
  [3] europe-west1 (Belgium)
  [4] europe-west4 (Netherlands)
  [5] asia-southeast1 (Singapore)

Region [1]:
```

Default to option `[1]` (us-central1) as it has best Claude availability.

### Vertex Screen 5: Enable Vertex AI API

Before finalizing, check if Vertex AI API is enabled:

```bash
gcloud services list --enabled --filter="name:aiplatform.googleapis.com" --project=<project-id> 2>&1
```

**If API not enabled:**

```
❯ /provider
Project: my-personal-project • Region: us-central1

Checking Vertex AI access...

! Vertex AI API not enabled

The Vertex AI API needs to be enabled for your project.
This is a one-time setup.

Enable it now?

  [y] Yes, enable Vertex AI API
  [m] I'll enable it manually
  [q] Cancel

Choice [y]:
```

If user chooses `y`:
```bash
gcloud services enable aiplatform.googleapis.com --project=<project-id>
```

Show progress:
```
Enabling Vertex AI API...
This may take a minute...

✓ Vertex AI API enabled
```

**If API already enabled:**
Continue to Vertex Screen 6.

### Vertex Screen 6: Check Claude Model Access

After the API is enabled, check if Claude models are accessible by making a test API call:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  "https://global-aiplatform.googleapis.com/v1/projects/<project-id>/locations/global/publishers/anthropic/models/claude-sonnet-4-5@20250929:rawPredict" \
  -d '{"anthropic_version":"vertex-2023-10-16","messages":[{"role":"user","content":"hi"}],"max_tokens":1}'
```

If this returns 404, Claude models need to be enabled in Model Garden.

**If Claude models are NOT accessible (returns "not-enabled"):**

```
❯ /provider
Project: my-personal-project • Region: us-central1

Checking Claude model access...

! Claude models not enabled

To use Claude on Vertex AI, you need to enable it in Model Garden.

Steps:
  1. Open Model Garden (link below)
  2. Search for "Claude"
  3. Click on "Claude Sonnet 4.5" (or any Claude model)
  4. Click "Enable" and accept the terms

https://console.cloud.google.com/vertex-ai/model-garden?project=<project-id>

Press Enter when done, or [q] to cancel:
```

Wait for the user to confirm, then re-check access. If still not working:

```
Still unable to access Claude models.

Make sure you:
  • Selected a Claude model in Model Garden
  • Clicked "Enable" on the model card
  • Accepted any terms/agreements

Try again? [y/n/q]:
```

**If Claude models ARE accessible (returns "ok"):**

Continue to model selection (Screen 7).

### Vertex Screen 7: Select Model

**Query available models from Anthropic's Vertex AI documentation:**

Unlike AWS Bedrock, Vertex AI doesn't have a simple CLI command to list available Claude models.

**Option 1: Check Anthropic's official docs**
The current Vertex AI model IDs are documented at:
https://docs.anthropic.com/en/docs/claude-code/google-vertex

**Option 2: Probe the API to check availability**
Test if a model works by making a minimal API call:
```bash
curl -s -X POST \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  "https://global-aiplatform.googleapis.com/v1/projects/<project-id>/locations/global/publishers/anthropic/models/<model-id>:rawPredict" \
  -d '{"anthropic_version":"vertex-2023-10-16","messages":[{"role":"user","content":"hi"}],"max_tokens":1}'
```

If it returns a response, the model is available. If 404, it's not enabled.

**Vertex model ID format**: Uses `@` separator (e.g., `claude-sonnet-4-5@20250929`)

Use `AskUserQuestion` tool to let user choose, then verify their selection works with the API probe above before continuing.

### Vertex Screen 8: Show Undo Instructions (CRITICAL)

**Before applying any configuration**, show the user how to manually undo:

```
Before we switch to Vertex AI, here's how to undo if needed:

Settings file: ~/.claude/settings.json

To revert manually, change these values:
  "CLAUDE_CODE_USE_VERTEX": "0"

Or delete these lines from the "env" section:
  - CLAUDE_CODE_USE_VERTEX
  - GOOGLE_PROJECT_ID
  - ANTHROPIC_VERTEX_REGION
  - ANTHROPIC_MODEL

You will need to restart Claude Code after setup for changes to take effect.

Ready to proceed? [y/n]
```

Wait for user confirmation before applying.

### Vertex Screen 9: Apply Configuration

After user confirms, read and merge settings into `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "1",
    "CLAUDE_CODE_USE_BEDROCK": "0",
    "GOOGLE_PROJECT_ID": "<project-id>",
    "ANTHROPIC_VERTEX_REGION": "<region>",
    "ANTHROPIC_MODEL": "<model-id>"
  },
  "vertexAuthRefresh": "gcloud auth application-default login"
}
```

Show progress:
```
Applying configuration...

✓ Enabled Vertex AI mode
✓ Set project to <project>
✓ Set region to <region>
✓ Set model to <model>
✓ Configured auto-refresh

Saved to ~/.claude/settings.json
```

### Vertex Screen 10: Success

```
────────────────────────────────────────────
  ✓ Google Vertex AI configured
────────────────────────────────────────────

  Provider:     Google Vertex AI
  Project:      <project>
  Region:       <region>
  Model:        <model>
  Auto-refresh: on

⚠ RESTART REQUIRED
  Please exit Claude Code and restart it for Vertex AI to take effect.
  Run: claude --plugin-dir <plugin-path>

If something breaks after restart, edit ~/.claude/settings.json and set:
  "CLAUDE_CODE_USE_VERTEX": "0"

Run /provider:status after restart to verify configuration.
```

**IMPORTANT**: End the setup by using `AskUserQuestion` tool:
- Question: "Setup complete. Please restart Claude Code for changes to take effect. What would you like to do?"
- Options:
  - "Exit now (I'll restart Claude Code)"
  - "Something went wrong, help me troubleshoot"

## Vertex Error Handling

### gcloud CLI Missing
Offer to install with Homebrew or let user install manually (same as AWS CLI flow).

### Authentication Fails
```
✗ Authentication failed

Check that:
  - You have a Google account
  - You have network access
  - You completed authentication in the browser

Try again with /provider or run:
  gcloud auth application-default login
```

### No Projects
Tell user to create a project or get access from administrator.

### API Enable Fails
```
✗ Could not enable Vertex AI API

Possible causes:
  - Billing not enabled for project
  - Insufficient permissions
  - API quota issues

To fix:
  1. Visit console.cloud.google.com/billing
  2. Enable billing for your project
  3. Try again with /provider
```

### Permission Denied
```
✗ Permission denied

Your account doesn't have permission to use Vertex AI in this project.

You need the role: Vertex AI User (roles/aiplatform.user)

To fix:
  - Ask your project administrator to grant you this role
  - Or select a different project where you have access
```

---

## Key Implementation Notes

1. **Always read existing settings.json** before writing to preserve MCP servers, hooks, etc.
2. **Use bash scripts** in `scripts/` directory for system operations
3. **Follow exact UI formatting** from the specification
4. **No decorative emojis** — only ✓ ✗ ● ○
5. **Friendly error messages** with clear instructions to fix
6. **AWS SSO browser flow** handles account/role selection — we don't ask for those

## Variables to Track

Throughout the flow, keep track of:

**Common:**
- `selected_provider` (aws-bedrock, vertex, azure)

**AWS Bedrock:**
- `profile_name` (e.g., "cricut-dev")
- `profile_is_new` (true/false)
- `sso_url` (if configuring new profile)
- `sso_region` (if configuring new profile)
- `bedrock_region` (e.g., "us-west-2")

**Google Vertex AI:**
- `project_id` (e.g., "my-personal-project")
- `project_name` (friendly name for display)
- `vertex_region` (e.g., "us-central1")
- `model_id` (e.g., "claude-sonnet-4-20250514")
- `model_display_name` (e.g., "Claude Sonnet 4")
- `api_enabled` (true/false)

## Testing Notes

When testing this command:

**AWS Bedrock:**
1. Test with existing AWS profiles
2. Test with no AWS CLI installed
3. Test with no profiles (fresh SSO setup)
4. Test canceling at various steps
5. Verify settings.json merge doesn't lose existing settings

**Google Vertex AI:**
1. Test with gcloud already authenticated
2. Test with no gcloud installed
3. Test with no authentication
4. Test with multiple projects
5. Test enabling Vertex AI API
6. Test with no billing enabled
7. Verify settings.json merge doesn't lose existing settings

**Both Providers:**
1. Test switching between providers
2. Test that only one provider is active at a time
3. Verify auto-refresh is configured correctly
