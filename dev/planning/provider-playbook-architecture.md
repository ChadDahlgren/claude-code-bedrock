# Provider Playbook Architecture

## The Idea

Instead of complex shell scripts and one giant setup file, each cloud provider becomes a standalone **markdown playbook** that Claude uses as a guide.

## Current Problems

1. **Wrapper scripts fail** - The .sh files (check-gcloud.sh, apply-config.sh, etc.) showed errors while direct CLI commands worked fine
2. **One giant file** - setup.md has all providers interleaved, hard to maintain
3. **Unnecessary complexity** - Claude already knows how to use aws, gcloud, and az CLIs natively
4. **Permission prompts** - Custom scripts trigger permission dialogs; direct commands are cleaner

## Proposed Solution

Each provider = one markdown document (a "playbook") that describes:
- Prerequisites and CLI commands
- Step-by-step setup flow
- How to authenticate
- How to list/select models
- What config to write
- How to undo/revert

Claude reads the playbook and executes it like an actor following a script.

## Architecture

```
skills/
  aws-bedrock-setup/
    SKILL.md           <- Complete AWS Bedrock playbook
  google-vertex-setup/
    SKILL.md           <- Complete Google Vertex playbook
  azure-foundry-setup/
    SKILL.md           <- Complete Azure Foundry playbook (future)

commands/
  setup.md             <- Just asks "which provider?" and loads the right skill
```

## Example Playbook Structure

```markdown
# AWS Bedrock Setup Playbook

## Prerequisites
- AWS CLI v2 installed
- SSO profile configured (or we'll help set one up)

## Step 1: Check AWS CLI
Run: `which aws && aws --version`
If not installed, offer to install with Homebrew.

## Step 2: Check SSO Profiles
Run: `cat ~/.aws/config | grep -E "^\[profile "`
If profiles found, let user select one.
If no profiles, guide through `aws configure sso`.

## Step 3: Authenticate
Run: `aws sso login --profile <profile>`
Wait for browser auth to complete.

## Step 4: List Available Models
Run: `aws bedrock list-foundation-models --by-provider anthropic --region <region>`
Present the models to user for selection.

## Step 5: Show Undo Instructions
Before applying, tell user:
- Settings file: ~/.claude/settings.json
- To revert: set "CLAUDE_CODE_USE_BEDROCK": "0"
- No restart needed

## Step 6: Apply Configuration
Write to ~/.claude/settings.json:
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "<profile>",
    "AWS_REGION": "<region>",
    "ANTHROPIC_MODEL": "<model>"
  }
}

## Step 7: Success
Confirm setup complete, remind about undo if needed.
```

## Benefits

1. **New providers = new markdown file** - No coding required
2. **Claude uses it as a guide** - Not executed, just followed
3. **Direct CLI commands** - No wrapper scripts, fewer permission prompts
4. **Easy to maintain** - Each provider is independent
5. **Easy to test** - Test one provider without affecting others
6. **Self-documenting** - The playbook IS the documentation
7. **AI-native** - Designed for how Claude works, not traditional programming

## Implementation Steps

1. [x] Document the concept (this file)
2. [ ] Convert AWS Bedrock skill to complete playbook
3. [ ] Convert Google Vertex skill to complete playbook
4. [ ] Simplify setup.md to just route to playbooks
5. [ ] Delete unnecessary wrapper scripts
6. [ ] Test each provider independently

## Notes from Testing (January 2025)

- Wrapper .sh scripts caused errors; direct gcloud/aws commands worked
- Claude already knows these CLIs - no need to wrap them
- Settings.json changes take effect immediately (no restart needed)
- Vertex AI requires Model Garden enablement (not just API enable)
- Model IDs differ between providers (Vertex uses @ separator)
