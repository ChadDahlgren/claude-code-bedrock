# Claude Code + AWS Bedrock Setup

Interactive script to configure [Claude Code](https://docs.anthropic.com/en/docs/claude-code) to use AWS Bedrock instead of the Anthropic API.

## Quick Start (Run Directly from GitHub)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ChadDahlgren/claude-code-bedrock/main/setup/setup-claude-bedrock.sh)
```

To disable Bedrock and revert to the Anthropic API:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ChadDahlgren/claude-code-bedrock/main/setup/setup-claude-bedrock.sh) --disable
```

## What It Does

- Installs prerequisites (Homebrew, AWS CLI, Claude Code) if needed
- Configures AWS SSO authentication with your organization's SSO portal
- Sets up 90-day refresh tokens (instead of 8-hour sessions)
- Verifies Bedrock access and finds a working region
- Writes Claude Code settings to `~/.claude/settings.json`

## What You'll Need

- Your organization's **AWS SSO URL** (get this from your IT team)
- Access to a browser for SSO authentication

## Local Installation

If you have the repository cloned:

```bash
./setup/setup-claude-bedrock.sh
```

## Options

```bash
./setup-claude-bedrock.sh           # Run interactive setup
./setup-claude-bedrock.sh --disable # Disable Bedrock, revert to Anthropic API
./setup-claude-bedrock.sh --help    # Show help
```

## Configuration

After setup, your settings are stored in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "your-profile",
    "AWS_REGION": "us-west-2",
    "ANTHROPIC_MODEL": "global.anthropic.claude-opus-4-5-20251101-v1:0",
    "CLAUDE_CODE_FAST_MODEL": "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "MAX_THINKING_TOKENS": "12000",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "10000"
  }
}
```

### Tuning Token Settings

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `MAX_THINKING_TOKENS` | 12,000 | 4,096 - 16,384 | Controls reasoning depth. Lower = faster, higher = more thorough |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 10,000 | 4,096 - 16,384 | Maximum response length |

## Troubleshooting

### SSO Session Expired

```bash
aws sso login --profile your-profile
```

### Bedrock Access Denied

Contact your AWS administrator to ensure:
- Bedrock is enabled in your account
- Your role has `bedrock:*` permissions (or at least `bedrock:InvokeModel`)

### Check Current Configuration

```bash
cat ~/.claude/settings.json
```
