# Claude Provider Plugin

Configure Claude Code to use enterprise cloud providers with ease.

## What This Plugin Does

This plugin simplifies configuring Claude Code to use enterprise cloud providers through an interactive setup wizard. Currently supports:
- ✓ AWS Bedrock
- ✓ Google Vertex AI
- ○ Azure Foundry (coming soon)

### Features

- **Guided Setup Wizard** — Step-by-step configuration via `/provider` command
- **Automatic Dependency Management** — Installs AWS CLI if missing (with permission)
- **Profile Detection** — Discovers existing AWS SSO profiles
- **Smart Defaults** — Recommends optimal Bedrock regions
- **Auto-Refresh** — Configures credential refresh to prevent interruptions
- **Diagnostics** — Troubleshoots issues with clear fix instructions

## Commands

- `/provider` — Main setup wizard
- `/provider:status` — Show current configuration
- `/provider:diagnose` — Run diagnostics and identify issues
- `/provider:refresh` — Re-authenticate SSO session
- `/provider:switch` — Switch between configured providers (coming soon)

## Installation

1. Clone this repository
2. Run Claude Code with the plugin:
   ```bash
   claude --plugin-dir /path/to/claude-code-provider/plugin
   ```
3. Run the setup:
   ```
   /provider:setup
   ```

## Project Structure

```
claude-code-provider/
├── plugin/                 # The distributable plugin
│   ├── commands/           # Slash commands (/provider:setup, etc.)
│   ├── skills/             # Reference documentation for AI
│   └── .claude-plugin/     # Plugin manifest and hooks
├── dev/                    # Development tooling (not part of plugin)
│   ├── scripts/            # Reset scripts, test helpers
│   └── planning/           # Architecture docs
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

## Requirements

- macOS (Homebrew support for CLI installations)
- **For AWS Bedrock**: AWS account with SSO configured (or we'll help you set it up)
- **For Google Vertex AI**: Google Cloud account with a project and billing enabled

## Design Principles

- User never sees environment variable names — only friendly labels
- Defaults in brackets like `[2]` so you can just press Enter
- Only status indicators: ✓ ✗ ● ○ (no decorative emojis)
- Plugin handles all complexity — you just answer simple questions

## Current Features

### AWS Bedrock ✓
- SSO profile detection and selection
- Browser-based authentication flow
- Bedrock region configuration
- Auto-refresh setup
- Comprehensive diagnostics

### Google Vertex AI ✓
- gcloud CLI integration
- Application-default credentials setup
- Project selection from your account
- Vertex AI region configuration
- Automatic API enablement
- Auto-refresh setup
- Comprehensive diagnostics

## Future Roadmap

- **Phase 3**: Azure Foundry support
- **Phase 4**: Enhanced multi-provider switching

## License

MIT
