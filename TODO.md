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

### 3. Add "Anthropic API" as Provider Option
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
- [x] AWS Bedrock setup flow (untested)
- [x] Google Vertex AI setup flow (tested, working)
- [x] Basic /provider:status command
- [x] Basic /provider:diagnose command
- [x] gcloud CLI integration scripts
- [x] Plugin.json with correct format (frontmatter, string repository)
- [x] Instant toggle for /provider:switch (no AI conversation, no restart needed)
- [x] Model selection in Vertex setup (prevents invalid model errors)

## Notes from Testing

1. **No restart needed**: Changing `settings.json` takes effect immediately
2. **Model availability varies**: Vertex AI has different models than Anthropic API
3. **Opus 4.5 not on Vertex**: As of Jan 2025, `claude-opus-4-5-20251101` not available
4. **Plugin loading**: Requires frontmatter in command files with `description` field
5. **Naming convention**: Plugin name + file name = command (e.g., `provider` + `setup.md` = `/provider:setup`)
