# Claude Provider Plugin

Configure Claude Code to use AWS Bedrock or Google Vertex AI.

## Commands

| Command | Description |
|---------|-------------|
| `/provider` | Setup wizard - configure a cloud provider |
| `/provider:status` | Show current configuration and auth status |
| `/provider:switch` | Switch between configured providers |
| `/provider:refresh` | Re-authenticate your session |
| `/provider:diagnose` | Run diagnostics and identify issues |

## Quick Start

1. Run `/provider` to start the setup wizard
2. Choose AWS Bedrock or Google Vertex AI
3. Follow the prompts to authenticate and configure
4. Restart Claude Code when prompted

## Requirements

- **AWS Bedrock**: AWS CLI with SSO configured
- **Google Vertex AI**: gcloud CLI with Application Default Credentials

## Files

```
plugin/
├── commands/           # Slash command definitions
│   ├── setup.md        # /provider - main setup wizard
│   ├── status.md       # /provider:status
│   ├── switch.md       # /provider:switch
│   ├── refresh.md      # /provider:refresh
│   └── diagnose.md     # /provider:diagnose
├── skills/             # Reference documentation
│   ├── aws-bedrock-setup/
│   │   └── SKILL.md    # AWS Bedrock reference
│   └── google-vertex-setup/
│       └── SKILL.md    # Google Vertex AI reference
└── .claude-plugin/     # Plugin configuration
    ├── plugin.json     # Plugin manifest
    └── hooks/          # Permission hooks
```

## Configuration

Settings are stored in `~/.claude/settings.json`. The plugin merges new settings without overwriting existing ones (MCP servers, hooks, etc.).

## Troubleshooting

Run `/provider:diagnose` to check for issues. Common problems:

- **Auth expired**: Run `/provider:refresh`
- **CLI not installed**: The setup wizard will offer to install via Homebrew
- **Permission denied**: Contact your cloud administrator
