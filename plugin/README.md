# AWS Bedrock Plugin

Configure Claude Code to use AWS Bedrock.

## Commands

| Command | Description |
|---------|-------------|
| `/bedrock` | Setup wizard - configure AWS Bedrock |
| `/bedrock:status` | Show current configuration and auth status |
| `/bedrock:refresh` | Re-authenticate your SSO session |
| `/bedrock:diagnose` | Run diagnostics and identify issues |
| `/bedrock:reset` | Remove configuration and return to Anthropic API |

## Quick Start

1. Run `/bedrock` to start the setup wizard
2. Select or configure your AWS SSO profile
3. Choose a region and model
4. Restart Claude Code when prompted

## Requirements

- AWS CLI installed (`brew install awscli`)
- AWS SSO configured with Bedrock access
- IAM permissions: `AmazonBedrockFullAccess` or equivalent

## Files

```
plugin/
├── commands/
│   ├── bedrock.md           # /bedrock - setup wizard
│   ├── bedrock-status.md    # /bedrock:status
│   ├── bedrock-refresh.md   # /bedrock:refresh
│   ├── bedrock-diagnose.md  # /bedrock:diagnose
│   └── bedrock-reset.md     # /bedrock:reset
├── skills/
│   └── aws-bedrock/
│       └── SKILL.md         # AWS Bedrock reference
└── .claude-plugin/
    └── plugin.json          # Plugin manifest
```

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

## Automatic Session Management

This plugin includes two mechanisms to handle SSO session expiration:

1. **Proactive Check (SessionStart hook)**: When Claude Code starts, the plugin checks your SSO session status. If expired or expiring soon, you'll see a warning with instructions to re-authenticate.

2. **Automatic Refresh (awsAuthRefresh)**: When configured, Claude Code automatically runs `aws sso login` when it detects expired credentials, then retries the request.

3. **Refresh Token Detection**: The plugin detects if you're using legacy SSO format (8-hour sessions) and offers to reconfigure for 90-day sessions with refresh tokens.

This prevents the "chicken-and-egg" problem where expired credentials would prevent Claude from helping you troubleshoot.

## Session Duration

| Configuration | Session Duration |
|--------------|------------------|
| Legacy SSO (without refresh tokens) | ~8 hours |
| SSO Session (with refresh tokens) | Up to 90 days |

The setup wizard guides you to configure `sso:account:access` scope for extended sessions.

## Troubleshooting

Run `/bedrock:diagnose` to check for issues. Common problems:

- **Auth expired**: Run `/bedrock:refresh`
- **CLI not installed**: `brew install awscli`
- **Permission denied**: Contact your AWS administrator
- **Model not available**: Use inference profile with `global.` prefix
- **Sessions expire every 8 hours**: Reconfigure SSO with `sso:account:access` scope
