---
description: Configure Claude Code to use AWS Bedrock or Google Vertex AI
---

# Provider Setup Command

You are helping the user configure Claude Code to use an enterprise cloud provider (AWS Bedrock, Google Vertex AI, or Azure Foundry).

## Your Role

Guide the user through an interactive setup wizard. Follow the exact UI specifications and flows defined below. Be helpful, clear, and handle errors gracefully.

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

### Screen 2: Check AWS CLI

Once user selects AWS Bedrock, check if AWS CLI is installed:

```bash
which aws && aws --version
```

**If AWS CLI is NOT installed:**

```
❯ /provider
Selected: AWS Bedrock

Checking AWS configuration...

✗ AWS CLI not installed

AWS CLI is required. Install it?

  [y] Yes, install with Homebrew
  [m] I'll install it manually
  [q] Cancel

Choice [y]:
```

If user chooses:
- `y` → Run `brew install awscli` and show installation progress
- `m` → Tell them to install manually and run `/provider` again when done
- `q` → Cancel

**After successful installation (or if already installed):**

Continue to Screen 3.

### Screen 3: Check for Existing SSO Profiles

Parse `~/.aws/config` for existing SSO profiles. Look for sections with `sso_start_url`.

Use this bash command:
```bash
grep -E "^\[profile |sso_start_url|sso_region|^region" ~/.aws/config
```

**If profiles found:**

```
❯ /provider
Selected: AWS Bedrock

Checking AWS configuration...

✓ AWS CLI installed (v2.15.0)
✓ Found existing SSO profiles

Select a profile to use with Bedrock:

  [1] cricut-dev - us-east-1
  [2] cricut-prod - us-east-1
  [3] personal - us-west-2

  [n] Configure a new profile
  [q] Cancel

Choice:
```

List all SSO profiles found. Show profile name and their SSO region.

**If NO profiles found:**

```
❯ /provider
Selected: AWS Bedrock

Checking AWS configuration...

✓ AWS CLI installed (v2.15.0)
! No SSO profiles found

Let's set up AWS SSO.

Enter your SSO start URL:
  This is usually https://your-company.awsapps.com/start
  Ask your IT team if you're not sure.

SSO URL:
```

Continue to Fresh SSO Setup flow (Screen 3b).

### Screen 3b: Fresh SSO Setup (If No Profiles)

**Step 1: Get SSO URL**
Ask for SSO start URL (e.g., `https://company.awsapps.com/start`)

**Step 2: Get SSO Region**
```
❯ /provider
SSO URL: https://cricut.awsapps.com/start

SSO Region:
  Where your company's SSO is hosted (usually us-east-1)

Region [us-east-1]:
```

Default to `us-east-1`.

**Step 3: Run SSO Configuration**
Use AWS CLI's interactive SSO setup:
```bash
aws configure sso --profile <profile-name>
```

This will:
1. Open browser for authentication
2. User selects account/role in browser (AWS handles this)
3. Return with credentials

**Step 4: Profile Name**
```
❯ /provider

✓ Authentication successful
  Account: 847293650183 (Development)

Name for this profile:

Profile name [claude-bedrock]:
```

Default to `claude-bedrock`.

After getting the profile name, continue to Screen 4.

### Screen 4: Select Bedrock Region

Show Bedrock region selection:

```
❯ /provider
Profile: cricut-dev

Select Bedrock region

  [1] us-east-1 (N. Virginia)
  [2] us-west-2 (Oregon) ← recommended
  [3] eu-west-1 (Ireland)
  [4] eu-central-1 (Frankfurt)
  [5] ap-northeast-1 (Tokyo)
  [6] ap-southeast-2 (Sydney)

Region [2]:
```

Default to option `[2]` (us-west-2) as it has best Claude availability.

### Screen 5: Authenticate (Existing Profile)

If using an existing profile, run SSO login:

```
❯ /provider
Profile: cricut-dev • Region: us-west-2

Authenticating...

Running: aws sso login --profile cricut-dev

Opening browser for SSO login...

If the browser doesn't open, visit:
  https://device.sso.us-east-1.amazonaws.com/?user_code=BMHT-GRXP

Waiting for authentication...
```

Run:
```bash
aws sso login --profile <profile-name>
```

This opens the browser. Wait for completion.

### Screen 6: Apply Configuration

After successful authentication:

```
❯ /provider
Profile: cricut-dev • Region: us-west-2

✓ Authentication successful

Applying configuration...

✓ Enabled Bedrock mode
✓ Set profile to cricut-dev
✓ Set region to us-west-2
✓ Configured auto-refresh

Saved to ~/.claude/settings.json
```

**Write to `~/.claude/settings.json`:**

You must:
1. Read existing `~/.claude/settings.json` (if it exists)
2. Merge in the new configuration (don't overwrite other settings!)
3. Write back the complete JSON

Add/update these fields:
```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "cricut-dev",
    "AWS_REGION": "us-west-2"
  },
  "awsAuthRefresh": "aws sso login --profile cricut-dev"
}
```

Use the scripts in `scripts/` directory to help with this (see below).

### Screen 7: Success

```
────────────────────────────────────────────
  ✓ AWS Bedrock configured
────────────────────────────────────────────

  Provider:     AWS Bedrock
  Profile:      cricut-dev
  Region:       us-west-2
  Auto-refresh: on

Restart required
Exit Claude Code and run claude again to use Bedrock.

Run /provider:status to check configuration anytime.
```

## Helper Scripts

Use these scripts (in the `scripts/` directory) to handle low-level operations:

### Check AWS CLI
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-aws-cli.sh
```
Returns: installed version or error

### Parse AWS Profiles
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/parse-aws-profiles.sh
```
Returns: JSON array of profiles with names and regions

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
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-gcloud.sh
```

**If gcloud CLI is NOT installed:**

```
❯ /provider
Selected: Google Vertex AI

Checking Google Cloud configuration...

✗ gcloud CLI not installed

gcloud CLI is required. Install it?

  [y] Yes, install with Homebrew
  [m] I'll install it manually
  [q] Cancel

Choice [y]:
```

If user chooses:
- `y` → Run `brew install google-cloud-sdk` and show installation progress
- `m` → Tell them to install manually and run `/provider` again when done
- `q` → Cancel

**After successful installation (or if already installed):**

Continue to Vertex Screen 2.

### Vertex Screen 2: Check Authentication

Check if user has configured application-default credentials:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-gcloud-auth.sh
```

**If NOT authenticated:**

```
❯ /provider
Selected: Google Vertex AI

Checking Google Cloud configuration...

✓ gcloud CLI installed (v462.0.1)
! Application-default credentials not configured

Let's authenticate with Google Cloud.

Running: gcloud auth application-default login

This will:
  • Open browser for Google authentication
  • Store credentials for API access
  • Grant access to your Google Cloud projects

Press Enter to continue or [q] to cancel:
```

Run the auth command:
```bash
gcloud auth application-default login
```

This will open browser for authentication. Wait for completion.

**If already authenticated:**

```
❯ /provider
Selected: Google Vertex AI

Checking Google Cloud configuration...

✓ gcloud CLI installed (v462.0.1)
✓ Application-default credentials configured
```

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

### Vertex Screen 6: Select Model

**CRITICAL**: Claude Code on Vertex AI requires a model that's actually available on Vertex. Different models are available compared to the Anthropic API.

Show model selection:

```
❯ /provider
Project: my-personal-project • Region: us-central1

Select Claude model

  [1] Claude Sonnet 4 ← recommended
      Best balance of speed and capability

  [2] Claude Opus 4
      Most capable, best for complex tasks

  [3] Claude Sonnet 3.5 v2
      Previous generation Sonnet

  [4] Claude Haiku 3.5
      Fastest, good for simple tasks

Model [1]:
```

Model ID mapping:
- `[1]` → `claude-sonnet-4-20250514`
- `[2]` → `claude-opus-4-20250514`
- `[3]` → `claude-3-5-sonnet-v2@20241022`
- `[4]` → `claude-3-5-haiku@20241022`

Default to option `[1]` (Claude Sonnet 4) as it's the best balance of capability and speed.

**IMPORTANT**: Do NOT allow selection of models that aren't available on Vertex AI. Specifically, `claude-opus-4-5-20251101` (Opus 4.5) is NOT available on Vertex.

### Vertex Screen 7: Apply Configuration

```
❯ /provider
Project: my-personal-project • Region: us-central1 • Model: Claude Sonnet 4

✓ Vertex AI API enabled

Applying configuration...

✓ Enabled Vertex AI mode
✓ Set project to my-personal-project
✓ Set region to us-central1
✓ Set model to claude-sonnet-4-20250514
✓ Configured auto-refresh

Saved to ~/.claude/settings.json
```

**Write to `~/.claude/settings.json`:**

Use the script:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/apply-vertex-config.sh <project-id> <region> <model-id>
```

This will:
1. Read existing `~/.claude/settings.json`
2. Merge in the new configuration
3. Add these fields:
```json
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "1",
    "GOOGLE_PROJECT_ID": "my-personal-project",
    "ANTHROPIC_VERTEX_REGION": "us-central1",
    "ANTHROPIC_MODEL": "claude-sonnet-4-20250514"
  },
  "vertexAuthRefresh": "gcloud auth application-default login"
}
```

### Vertex Screen 8: Success

```
────────────────────────────────────────────
  ✓ Google Vertex AI configured
────────────────────────────────────────────

  Provider:     Google Vertex AI
  Project:      my-personal-project
  Region:       us-central1
  Model:        Claude Sonnet 4
  Auto-refresh: on

Ready to use (no restart needed).

Run /provider:status to check configuration anytime.
```

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
