---
description: Quick Bedrock status check
---

# /bedrock:status

Quick status check for AWS Bedrock configuration.

## Run Diagnostics

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js test-bedrock
```

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js check-prerequisites
```

## Display Results

**If not configured (`configured: false`):**

```
Bedrock Status: Not configured

Run /bedrock:manage to set up AWS Bedrock.
```

**If configured:**

Also get session expiration:
```bash
aws configure export-credentials --profile <profile> --format process 2>/dev/null | jq -r '.Expiration // "unknown"'
```

Display:
```
Bedrock Status
============================================

  Profile:  <profile>
  Region:   <region>
  Model:    <model>
  Auth:     <✓ valid | ✗ expired>
  Expires:  <expiration time or "~Xh remaining">

System
  [OK] AWS CLI installed (<version>)
  [OK] Node installed (<version>)

Authentication
  [OK/FAIL] <credentials.message>

Access
  [OK/FAIL] <bedrockAccess.message>
  [OK/FAIL] <modelAvailable.message>

Status: <All checks passed | X issue(s) detected>
```

**If issues detected**, suggest:
- Auth expired → "Run `/bedrock:refresh` to re-authenticate"
- Other issues → "Run `/bedrock:manage` for more options"
