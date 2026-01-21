---
description: Switch between configured cloud providers
---

# Provider Switch Command

Toggle between configured cloud providers.

## Behavior

When user runs `/provider:switch`:

1. Read `~/.claude/settings.json`
2. Determine current provider and available providers
3. Switch to next provider in cycle (or specified target)
4. Update settings.json
5. Report result

## Cycle Order

`Anthropic API → Vertex (if configured) → Bedrock (if configured) → Anthropic API`

Skip providers that aren't configured.

## Usage

```bash
/provider:switch           # Cycle to next provider
/provider:switch vertex    # Switch to Vertex AI
/provider:switch bedrock   # Switch to Bedrock
/provider:switch anthropic # Switch to Anthropic API
```

## Implementation

Use `AskUserQuestion`:
- "Switch to {target provider}?"
- Options: "Yes, switch" / "Cancel"

If yes, read settings and update the `CLAUDE_CODE_USE_*` flags:

**To switch to Bedrock:**
```json
"CLAUDE_CODE_USE_BEDROCK": "1",
"CLAUDE_CODE_USE_VERTEX": "0"
```

**To switch to Vertex:**
```json
"CLAUDE_CODE_USE_BEDROCK": "0",
"CLAUDE_CODE_USE_VERTEX": "1"
```

**To switch to Anthropic API:**
```json
"CLAUDE_CODE_USE_BEDROCK": "0",
"CLAUDE_CODE_USE_VERTEX": "0"
```

## Output

**Successful switch:**
```
Switched to <Provider Name>

Previous: <Previous Provider>
Current:  <New Provider>

Ready to use immediately (no restart needed).
```

**Already on target:**
```
Already using <Provider Name>

Run /provider:status to see full configuration.
```

**No providers configured:**
```
No cloud providers configured

To set up a provider, run: /provider
```

## Provider Names

- `vertex` → Google Vertex AI
- `bedrock` → AWS Bedrock
- `anthropic` → Anthropic API (default)
