# Claude Code Bedrock Plugin

Configure Claude Code to use AWS Bedrock with ease.

## Installation

### From Marketplace (Recommended)

```bash
# Add the marketplace
/plugin marketplace add ChadDahlgren/claude-code-bedrock

# Install the plugin
/plugin install bedrock@claude-code-bedrock
```

Then run `/bedrock:manage` to start the setup wizard.

### Manual Installation

```bash
git clone https://github.com/ChadDahlgren/claude-code-bedrock.git
claude --plugin-dir /path/to/claude-code-bedrock/plugin
```

## What This Plugin Does

This plugin simplifies configuring Claude Code to use AWS Bedrock through an interactive setup wizard.

### Features

- **Guided Setup Wizard** — Step-by-step configuration via `/bedrock:manage`
- **Automatic Session Management** — Detects expired SSO sessions and prompts re-authentication
- **Automatic Credential Refresh** — Claude Code auto-refreshes credentials when they expire
- **Profile Detection** — Discovers existing AWS SSO profiles
- **Smart Defaults** — Recommends optimal regions and inference profiles
- **Thinking Mode** — Configure reasoning depth with presets (Focused, Balanced, Thorough)
- **Diagnostics** — Troubleshoots issues with clear fix instructions

## Commands

| Command | Description |
|---------|-------------|
| `/bedrock:manage` | Main menu - setup, configure, and manage Bedrock |
| `/bedrock:status` | Quick status check |
| `/bedrock:refresh` | Re-authenticate your SSO session |
| `/bedrock:thinking` | Configure reasoning depth (thinking mode) |

## Requirements

- AWS CLI installed (`brew install awscli`)
- AWS SSO configured with Bedrock access
- IAM permissions: `AmazonBedrockFullAccess` or equivalent
- **Optional**: `jq` for enhanced session status (`brew install jq`)

## Configuration

Settings are stored in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "your-profile",
    "AWS_REGION": "us-west-2",
    "ANTHROPIC_MODEL": "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "MAX_THINKING_TOKENS": "8192",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "8192"
  },
  "awsAuthRefresh": "aws sso login --profile your-profile"
}
```

## Thinking Mode

Configure how deeply Claude reasons before responding:

| Preset | Reasoning | Output | Description |
|--------|-----------|--------|-------------|
| Focused | 4096 | 4096 | Quick deliberation for routine tasks |
| **Balanced** | 8192 | 8192 | Solid reasoning without overthinking (default) |
| Thorough | 16384 | 16384 | Extended deliberation for architecture decisions |

**Note:** This controls reasoning time, not context window (how much code Claude can see).

## Troubleshooting

Run `/bedrock:status` to check for issues. Common problems:

- **Auth expired**: Run `/bedrock:refresh`
- **CLI not installed**: `brew install awscli`
- **Permission denied**: Contact your AWS administrator
- **Model not available**: Use inference profile with `global.` prefix
- **Sessions expire every 8 hours**: Reconfigure SSO with `sso:account:access` scope for 90-day sessions

### Manual Recovery

If Claude becomes unresponsive due to API errors:

1. Edit `~/.claude/settings.json`
2. Delete these keys from `"env"`:
   - `CLAUDE_CODE_USE_BEDROCK`
   - `AWS_PROFILE`
   - `AWS_REGION`
   - `ANTHROPIC_MODEL`
3. Delete `"awsAuthRefresh"` (if present)
4. Restart Claude Code

## Session Duration

| Configuration | Session Duration |
|--------------|------------------|
| Legacy (without refresh tokens) | ~8 hours |
| SSO Session (with refresh tokens) | Up to 90 days |

The setup wizard guides you to configure `sso:account:access` scope for extended sessions.

## Project Structure

```
claude-code-bedrock/
├── .claude-plugin/
│   └── marketplace.json    # Marketplace definition
├── plugin/                 # The plugin
│   ├── .claude-plugin/
│   │   ├── plugin.json     # Plugin manifest
│   │   └── hooks/          # Session and tool hooks
│   ├── commands/           # Slash commands
│   ├── scripts/            # TypeScript implementation
│   └── skills/             # Reference documentation
└── README.md
```

## License

MIT
