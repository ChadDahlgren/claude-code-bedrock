---
description: Show help for Bedrock plugin commands
---

# Bedrock Help

Display the following help text:

```
AWS Bedrock Plugin
======================================

COMMANDS
  /bedrock           Setup wizard
  /bedrock:status    Show current config
  /bedrock:refresh   Re-authenticate SSO
  /bedrock:diagnose  Run diagnostics
  /bedrock:reset     Remove config
  /bedrock:repair    Auto-fix issues
  /bedrock:help      This help

QUICK START
  1. /bedrock
  2. Select profile and region
  3. Restart Claude Code

COMMON FIXES
  Auth expired?   -> /bedrock:refresh
  Not working?    -> /bedrock:diagnose
  Start over?     -> /bedrock:reset
======================================
```
