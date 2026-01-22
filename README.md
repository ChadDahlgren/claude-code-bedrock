# Claude Code Bedrock Plugin

Configure Claude Code to use AWS Bedrock with ease.

## What This Plugin Does

This plugin simplifies configuring Claude Code to use AWS Bedrock through an interactive setup wizard.

### Features

- **Guided Setup Wizard** — Step-by-step configuration via `/bedrock` command
- **Automatic Session Management** — Detects expired SSO sessions and prompts re-authentication
- **Automatic Credential Refresh** — Claude Code auto-refreshes credentials when they expire
- **Profile Detection** — Discovers existing AWS SSO profiles
- **Smart Defaults** — Recommends optimal regions and inference profiles
- **Diagnostics** — Troubleshoots issues with clear fix instructions

## Commands

| Command | Description |
|---------|-------------|
| `/bedrock` | Setup wizard - configure AWS Bedrock |
| `/bedrock:status` | Show current configuration and auth status |
| `/bedrock:refresh` | Re-authenticate your SSO session |
| `/bedrock:diagnose` | Run diagnostics and identify issues |
| `/bedrock:reset` | Remove configuration and return to Anthropic API |

## Installation

1. Clone this repository
2. Run Claude Code with the plugin:
   ```bash
   claude --plugin-dir /path/to/claude-code-bedrock/plugin
   ```
3. Run the setup:
   ```
   /bedrock
   ```

## Project Structure

```
claude-code-bedrock/
├── plugin/                 # The distributable plugin
│   ├── commands/           # Slash commands (/bedrock, etc.)
│   ├── skills/             # Reference documentation for AI
│   └── .claude-plugin/
│       ├── plugin.json     # Plugin manifest
│       └── hooks/          # Session and tool hooks
├── dev/                    # Development tooling
├── README.md
└── LICENSE
```

## Requirements

- macOS (Homebrew support for CLI installations)
- AWS CLI installed (`brew install awscli`)
- jq installed (`brew install jq`)
- AWS SSO configured with Bedrock access
- IAM permissions: `AmazonBedrockFullAccess` or equivalent

## Configuration

Settings are stored in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "your-profile",
    "AWS_REGION": "us-west-2",
    "ANTHROPIC_MODEL": "global.anthropic.claude-opus-4-5-20251101-v1:0"
  },
  "awsAuthRefresh": "aws sso login --profile your-profile"
}
```

## Troubleshooting

Run `/bedrock:diagnose` to check for issues. Common problems:

- **Auth expired**: Run `/bedrock:refresh`
- **CLI not installed**: `brew install awscli`
- **Permission denied**: Contact your AWS administrator
- **Model not available**: Use inference profile with `global.` prefix
- **Sessions expire every 8 hours**: Reconfigure SSO with `sso:account:access` scope for 90-day sessions

## Session Duration

By default, AWS SSO sessions last ~8 hours. The setup wizard configures refresh tokens for **up to 90-day sessions**:

| Configuration | Session Duration |
|--------------|------------------|
| Legacy (without refresh tokens) | ~8 hours |
| SSO Session (with refresh tokens) | Up to 90 days |

The plugin detects legacy configurations and offers to reconfigure for extended sessions.

## License

MIT
