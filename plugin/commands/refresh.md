---
description: Refresh AWS SSO authentication
---

# /bedrock:refresh

Re-authenticate your AWS SSO session. This will open your browser.

## Step 1: Check Current Config

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js test-bedrock
```

**If not configured (`configured: false`):**

```
Bedrock is not configured. Run /bedrock:manage to set up first.
```

Stop here.

## Step 2: Run SSO Login

Get the profile from the test-bedrock output, then run:

```bash
aws sso login --profile <profile>
```

**Note:** This opens a browser for authentication. Wait for user to complete.

## Step 3: Verify

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js test-bedrock
```

**If `credentials.passed: true`:**

```
✓ Authentication successful

Your SSO session is now active.
```

**If `credentials.passed: false`:**

```
✗ Authentication may not have completed

Try again or run /bedrock:status for details.
```
