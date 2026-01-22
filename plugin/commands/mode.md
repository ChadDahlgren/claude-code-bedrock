---
description: Configure Claude's thinking mode
---

# /bedrock:mode

Configure how deeply Claude reasons before responding. These settings control REASONING time - how long Claude deliberates. This is NOT context window or how much of the codebase Claude can see.

## Step 1: Check Current Config

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js test-bedrock
```

**If not configured (`configured: false`):**

```
Bedrock is not configured. Run /bedrock:manage to set up first.
```

Stop here.

## Step 2: Get Current Settings

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js inference-config
```

## Step 3: Show Options

Use `AskUserQuestion` to present the presets:

```
Thinking Mode
============================================

Current: <current.preset> (Reasoning: <thinkingTokens> | Output: <outputTokens>)

These settings control REASONING time - how long Claude
deliberates before responding. This is NOT context window
or how much of your codebase Claude can see.

Select a mode:
```

Options (mark current with ✓, default with "Recommended"):
- **Balanced (Recommended)** - "Solid reasoning without overthinking. Reasoning: 8192 | Output: 8192"
- **Focused** - "Quick deliberation for routine tasks. ⚠ May not fully analyze complex tradeoffs. Reasoning: 4096 | Output: 4096"
- **Thorough** - "Extended deliberation for architecture decisions. ⚠ May over-engineer simple problems. Reasoning: 16384 | Output: 16384"
- **Custom** - "Specify your own values (4096-16384)"

## Step 4: Apply Configuration

**If preset selected (focused, balanced, thorough):**

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js inference-config --preset=<preset>
```

**If custom selected:**

Use `AskUserQuestion` to get values:
- "Reasoning tokens (4096-16384)?"
- "Output tokens (4096-16384)?"

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js inference-config --preset=custom --thinking=<value> --output=<value>
```

## Step 5: Done

```
✓ Thinking mode updated

  Mode:      <preset>
  Reasoning: <thinkingTokens>
  Output:    <outputTokens>

⚠ RESTART REQUIRED
  Exit and restart Claude Code for changes to take effect.
```
