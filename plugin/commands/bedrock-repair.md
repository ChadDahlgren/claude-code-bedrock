---
description: Automatically diagnose and fix common Bedrock issues
---

# Bedrock Repair

Diagnose and offer to automatically fix common Bedrock configuration issues.

## Step 1: Run Diagnostics

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/dist/index.js test-bedrock
```

## Step 2: Offer Fixes Based on Results

Analyze the diagnostic output and offer targeted fixes:

| Issue | Fix Offered |
|-------|-------------|
| `configured: false` | "Run /bedrock to set up" |
| `credentials.passed: false` | "Re-authenticate?" then run `aws sso login --profile <profile>` |
| `modelAvailable.passed: false` | "Model may have changed. Reconfigure?" then show available models |

## Step 3: Apply Fixes

For each issue found:

1. **Not configured**: Suggest running `/bedrock` to start setup
2. **Credentials expired**: Offer to run SSO login:
   ```bash
   aws sso login --profile <profile-from-config>
   ```
3. **Model unavailable**: List current available models and offer to reconfigure

## Step 4: Re-verify

After each fix, re-run diagnostics to confirm the fix worked.

## Output Format

**All fixed:**
```
Repair complete. All checks passing.
```

**Partial success:**
```
Repair incomplete.
  [OK] Credentials refreshed
  [FAIL] Bedrock access denied (contact AWS admin)
```

**No issues found:**
```
All checks passing. No repair needed.
```
