---
description: Re-authenticate your cloud provider session
---

# Provider Refresh Command

Re-authenticate the current provider's session.

## Behavior

1. Read `~/.claude/settings.json` to determine active provider
2. Run the appropriate authentication command
3. Report result

## AWS Bedrock

If `CLAUDE_CODE_USE_BEDROCK` is `"1"`:

Use `AskUserQuestion`:
- "Re-authenticate AWS Bedrock? This will open your browser."
- Options: "Yes, open browser" / "Cancel"

If yes:
```bash
aws sso login --profile <AWS_PROFILE>
```

**Output:**
```
Re-authenticating AWS Bedrock
Profile: <profile>

Opening browser for SSO login...
```

After success:
```
✓ Authentication successful

Your SSO session is now active.
Run /provider:status to verify.
```

## Google Vertex AI

If `CLAUDE_CODE_USE_VERTEX` is `"1"`:

Use `AskUserQuestion`:
- "Re-authenticate Google Vertex AI? This will open your browser."
- Options: "Yes, open browser" / "Cancel"

If yes:
```bash
gcloud auth application-default login
```

**Output:**
```
Re-authenticating Google Vertex AI
Project: <project>

Opening browser for Google authentication...
```

After success:
```
✓ Authentication successful

Your credentials are now configured.
Run /provider:status to verify.
```

## No Provider Configured

```
No provider configured

Claude Code is using the default Anthropic API.
To configure a provider, run: /provider
```

## Errors

**Auth fails:**
```
✗ Authentication failed

Check your network and try again: /provider:refresh
Or reconfigure: /provider
```
