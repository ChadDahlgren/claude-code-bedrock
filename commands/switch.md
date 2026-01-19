---
description: Switch between configured cloud providers
---

# Provider Switch Command

Instantly toggle between configured cloud providers. No AI conversation needed - just flip the setting.

## Your Role

Run the toggle script and report the result. This is a direct action, not a conversation.

## CRITICAL: Execute Immediately

When user runs `/provider:switch`, execute this command **immediately without any preamble**:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/toggle-provider.sh
```

Or with a specific target:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/toggle-provider.sh vertex
bash ${CLAUDE_PLUGIN_ROOT}/scripts/toggle-provider.sh bedrock
bash ${CLAUDE_PLUGIN_ROOT}/scripts/toggle-provider.sh anthropic
```

## Output Handling

### Successful Switch
Script output: `switched:<from>:<to>`

Display:
```
Switched to <Provider Name>

Previous: <Previous Provider>
Current:  <New Provider>

Ready to use immediately (no restart needed).
```

Provider name mapping:
- `vertex` → Google Vertex AI
- `bedrock` → AWS Bedrock
- `anthropic` → Anthropic API (default)

### Already On Target
Script output: `current:<provider>`

Display:
```
Already using <Provider Name>

Run /provider:status to see full configuration.
```

### No Providers Configured
Script output: `error:no-providers-configured`

Display:
```
No cloud providers configured

To set up a provider, run: /provider:setup
```

### No Settings File
Script output: `error:no-settings`

Display:
```
Settings file not found

Run /provider:setup to configure a provider.
```

## Examples

### Auto-cycle (no argument)
```
> /provider:switch

Switched to Google Vertex AI

Previous: Anthropic API (default)
Current:  Google Vertex AI

Ready to use immediately (no restart needed).
```

### Switch to specific provider
```
> /provider:switch anthropic

Switched to Anthropic API

Previous: Google Vertex AI
Current:  Anthropic API (default)

Ready to use immediately (no restart needed).
```

### Already on that provider
```
> /provider:switch vertex

Already using Google Vertex AI

Run /provider:status to see full configuration.
```

## Design Rules

- **No menu** — Just toggle, no selection UI
- **No restart reminder** — Settings apply immediately
- **Instant feedback** — Show what changed in 2-3 lines
- **No emojis** — Clean, professional output

## Cycle Order

When no target specified, cycles through:
1. Anthropic API → Vertex (if configured) → Bedrock (if configured) → Anthropic API
2. Skip providers that aren't configured
3. If only one provider configured, toggle between it and Anthropic API

## Technical Notes

- Settings changes in `~/.claude/settings.json` apply immediately
- No need to restart Claude Code
- Script uses jq if available, falls back to sed
- All provider configs are preserved (just the USE_* flags change)
