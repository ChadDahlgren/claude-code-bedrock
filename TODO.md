# TODO: Claude Provider Plugin Improvements

Based on initial testing (January 2025), here are the planned improvements:

## High Priority

### 1. Model Validation Before Switching
**Problem**: User switched to Vertex AI but Opus 4.5 isn't available there, breaking Claude Code.

**Solution**:
- [x] Add model selection step to Vertex setup flow
- [x] Present only models available on Vertex AI
- [x] Set `ANTHROPIC_MODEL` env var to valid Vertex model ID
- [x] Default to Claude Sonnet 4 (best balance of speed/capability)
- [x] Document which models are NOT available (Opus 4.5)

### 2. Instant Toggle (No AI Needed)
**Problem**: `/provider:switch` currently requires AI conversation.

**Solution**:
- [x] Make `/provider:switch` a direct settings toggle
- [x] Just flip `CLAUDE_CODE_USE_VERTEX` between "0" and "1"
- [x] No restart needed (Claude Code reads settings.json dynamically)
- [x] Output: "Switched to [Provider]. Ready to use."

### 3. Remove Wrapper Scripts, Use Direct CLI Commands
**Problem**: The .sh wrapper scripts (check-gcloud.sh, etc.) show errors during setup, but running CLI commands directly works fine. This applies to all providers - gcloud, aws, and az CLIs are mature and Claude already knows how to use them.

**Solution**:
- [x] Update setup.md to use direct CLI commands
- [x] Document commands in setup.md for reference
- [ ] Delete unnecessary scripts from `scripts/` directory
- [ ] Let Claude run gcloud/aws/az commands directly and interpret output
- [ ] Reduces permission prompts (no custom script execution)

**Examples:**
- Google: `gcloud auth application-default print-access-token`
- AWS: `aws sts get-caller-identity`
- Azure: `az account show`

### 4. Refactor to Provider Playbooks
**Problem**: Current setup.md is one giant file with all providers interleaved. Hard to maintain.

**Solution**: Each provider becomes a standalone markdown "playbook":
- [ ] `skills/aws-bedrock-setup/SKILL.md` - Complete AWS playbook
- [ ] `skills/google-vertex-setup/SKILL.md` - Complete Vertex playbook
- [ ] `skills/azure-foundry-setup/SKILL.md` - Complete Azure playbook
- [ ] `commands/setup.md` - Just asks "which provider?" and loads the right skill

Benefits:
- New providers = new markdown file, no coding
- Claude uses playbook as a guide
- Easier to maintain and test independently
- More elegant architecture

### 4. Add "Anthropic API" as Provider Option
**Problem**: No easy way to switch back to default Anthropic API.

**Solution**:
- [ ] Add option 4 to provider menu:
  ```
  [1] AWS Bedrock
  [2] Google Vertex AI
  [3] Azure Foundry (coming soon)
  [4] Anthropic API (default)
  ```
- [ ] Selecting this disables all provider flags

## Medium Priority

### 4. Better Status Display
- [ ] Show which models are available vs configured
- [ ] Show if current model is valid for current provider
- [ ] Clearer auth status (not just "valid" but actual expiration)

### 5. Diagnose Model Compatibility
- [ ] Check if configured model exists on current provider
- [ ] Suggest alternatives if model not available
- [ ] Test actual API connectivity, not just auth

### 6. Smarter Setup Flow
- [ ] Remember last used settings for quick re-setup
- [ ] Skip steps that are already configured
- [ ] Offer to keep existing config when re-running setup

## Low Priority

### 7. Azure Foundry Support (Phase 3)
- [ ] Research Azure Foundry requirements
- [ ] Add setup flow
- [ ] Add helper scripts

### 8. Multi-Provider Profiles
- [ ] Save multiple provider configs
- [ ] Quick switch between saved profiles
- [ ] Profile names (e.g., "work-bedrock", "personal-vertex")

### 9. Session Start Hook
- [ ] Warn if auth is expired on session start
- [ ] Auto-prompt for refresh if needed

## Completed

- [x] Initial plugin structure
- [x] AWS Bedrock setup flow (tested - requires inference profile for Opus 4.5)
- [x] Google Vertex AI setup flow (tested, working)
- [x] Basic /provider:status command
- [x] Basic /provider:diagnose command
- [x] gcloud CLI integration scripts
- [x] Plugin.json with correct format (frontmatter, string repository)
- [x] Instant toggle for /provider:switch (no AI conversation, no restart needed)
- [x] Model selection in Vertex setup (prevents invalid model errors)
- [x] AWS Bedrock inference profile documentation (fixes "on-demand throughput" error)
- [x] Real-world AWS SSO flow documentation (from actual testing)

## Experimental

### Permission Auto-Approval Hook
Added `.claude-plugin/hooks/` with a PreToolUse hook to auto-approve plugin scripts.
This may or may not work depending on how Claude Code handles plugin hooks.
Alternative: Users can add permission rules to their `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(bash */scripts/check-gcloud*)",
      "Bash(bash */scripts/apply-vertex*)",
      "Bash(bash */scripts/toggle-provider*)",
      "Bash(gcloud auth application-default:*)",
      "Bash(gcloud projects list:*)"
    ]
  }
}
```

## Notes from Testing

1. **No restart needed**: Changing `settings.json` takes effect immediately
2. **Model availability varies**: Vertex AI has different models than Anthropic API
3. **Vertex AI onboarding friction**: Enabling Claude on Vertex requires a request flow through Google and Anthropic (likely for billing) - not just a simple "enable" button
4. **Model ID format**: Vertex uses `@` separator (e.g., `claude-sonnet-4-5@20250929`), not `-`
5. **Plugin loading**: Requires frontmatter in command files with `description` field
6. **Naming convention**: Plugin name + file name = command (e.g., `provider` + `setup.md` = `/provider:setup`)
7. **Wrapper scripts cause errors**: Running .sh scripts shows errors, but direct gcloud commands work fine
8. **AWS Bedrock inference profiles**: Claude 4.5 models require inference profile format:
   - ❌ `anthropic.claude-opus-4-5-20251101-v1:0` - FAILS with "on-demand throughput isn't supported"
   - ✅ `us.anthropic.claude-opus-4-5-20251101-v1:0` - Works (US inference profile)
   - Prefix options: `us.`, `eu.`, `apac.` for cross-region routing
   - See: https://github.com/anthropics/claude-code/issues/12384
