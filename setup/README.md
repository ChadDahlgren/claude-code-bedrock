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
  "model": "opus",
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "your-profile",
    "AWS_REGION": "us-west-2"
  }
}
```

### Switching Models

Use `/model` inside Claude Code to switch between models:

| Model | Description |
|-------|-------------|
| `opus` | Deepest reasoning (default) |
| `sonnet` | Fast and capable |
| `haiku` | Fastest, lightweight tasks |

Append `[1m]` for 1M token context window (e.g., `opus [1m]`, `sonnet [1m]`).

### Advanced Tuning

Edit `~/.claude/settings.json` to set token limits or other env vars. See the [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code) for all available settings.

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
