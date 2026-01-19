# Google Vertex AI Setup Skill

This skill provides comprehensive knowledge about configuring Claude Code to use Google Vertex AI.

## Vertex AI Region Availability

As of January 2025, Claude models are available in these Google Cloud regions:

### Recommended Regions
- **us-central1** (Iowa) — Best availability, lowest latency for US users
- **us-east5** (Columbus) — Good for east coast US users

### Other Supported Regions
- **europe-west1** (Belgium) — For European users
- **europe-west4** (Netherlands) — For European users
- **asia-southeast1** (Singapore) — For Asia-Pacific users

## Claude Model Naming in Vertex AI

Vertex uses specific model names with version identifiers. **Important**: Use `@` separator (not `-`) before the date.

### Model ID Format
```
claude-sonnet-4-5@20250929
claude-opus-4-5@20251101
```

### Available Models (as of January 2025)
| Model | Vertex AI API model ID |
|-------|----------------------|
| Claude Sonnet 4.5 | `claude-sonnet-4-5@20250929` ← recommended |
| Claude Opus 4.5 | `claude-opus-4-5@20251101` |
| Claude Opus 4.1 | `claude-opus-4-1@20250805` |
| Claude Opus 4 | `claude-opus-4@20250514` |
| Claude Sonnet 4 | `claude-sonnet-4@20250514` |
| Claude Haiku 4.5 | `claude-haiku-4-5@20251001` |
| Claude Haiku 3 | `claude-3-haiku@20240307` |

### Deprecated Models (avoid these)
- Claude Sonnet 3.7: `claude-3-7-sonnet@20250219` (deprecated Oct 2025)
- Claude Haiku 3.5: `claude-3-5-haiku@20241022` (deprecated Dec 2025)

### Setting the Model
Set `ANTHROPIC_MODEL` in `~/.claude/settings.json`:
```json
{
  "env": {
    "ANTHROPIC_MODEL": "claude-sonnet-4-5@20250929"
  }
}
```

### Global vs Regional Endpoints
For Claude 4.5+ models, you can use `region = "global"` for dynamic routing and better availability. Regional endpoints (like `us-central1`) have a 10% pricing premium but guarantee data residency.

## Google Cloud CLI (gcloud)

### Installation (macOS)
```bash
# Using Homebrew
brew install google-cloud-sdk

# Or download installer
# https://cloud.google.com/sdk/docs/install
```

### Verify Installation
```bash
gcloud --version
```

Should show: `Google Cloud SDK XXX.X.X`

### Initialize gcloud (if first time)
```bash
gcloud init
```

This will:
1. Open browser for Google account authentication
2. Let you select a default project
3. Configure default region/zone

## Authentication Flow

### Application Default Credentials (ADC)

Claude Code uses ADC for Vertex AI authentication:

```bash
gcloud auth application-default login
```

This:
1. Opens browser for authentication
2. Stores credentials in `~/.config/gcloud/application_default_credentials.json`
3. Credentials work for all Google Cloud APIs

### Check Authentication Status
```bash
gcloud auth application-default print-access-token
```

If this returns a token, you're authenticated.

### Session Duration
- Default: 1 hour
- Auto-refreshed by gcloud SDK
- For longer sessions, consider service account keys (not recommended for development)

## Project Configuration

### List Available Projects
```bash
gcloud projects list
```

Output shows:
- PROJECT_ID (the identifier to use)
- NAME (friendly name)
- PROJECT_NUMBER

### Set Default Project
```bash
gcloud config set project PROJECT_ID
```

### Get Current Project
```bash
gcloud config get-value project
```

## Required IAM Permissions

For Claude Code to work with Vertex AI, your account needs:

### Minimum Permissions
```
aiplatform.endpoints.predict
aiplatform.models.get
```

### Recommended Role
- **Vertex AI User** (`roles/aiplatform.user`)

### Check Your Permissions
```bash
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"
```

### Common Permission Issues

**Error:** `Permission denied on resource project`

**Cause:** Your account doesn't have access to the project

**Fix:**
1. Verify project ID is correct
2. Ask project owner to grant you `roles/aiplatform.user`
3. Or create your own project at console.cloud.google.com

## Claude Code Configuration

### Settings File Location
`~/.claude/settings.json`

### Required Configuration
```json
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "1",
    "GOOGLE_PROJECT_ID": "my-project-id",
    "ANTHROPIC_VERTEX_REGION": "us-central1"
  },
  "vertexAuthRefresh": "gcloud auth application-default login"
}
```

### Alternative Environment Variables
These also work:
- `GOOGLE_CLOUD_PROJECT` (instead of `GOOGLE_PROJECT_ID`)
- `GOOGLE_REGION` (instead of `ANTHROPIC_VERTEX_REGION`)

### How Auto-Refresh Works

When `vertexAuthRefresh` is configured:
1. Claude Code detects expired credentials
2. Automatically runs the specified command
3. Opens browser for re-authentication
4. Continues working after auth completes

### Configuration Merging

**CRITICAL:** Always merge, never overwrite settings.json.

Users may have:
- MCP server configurations
- Custom hooks
- Other environment variables
- Plugin settings

Always:
1. Read existing settings.json
2. Merge new provider settings
3. Write complete configuration back

## Common Issues and Fixes

### Issue: "gcloud: command not found"

**Cause:** gcloud CLI not installed or not in PATH

**Fix:**
```bash
# Install via Homebrew
brew install google-cloud-sdk

# Or add to PATH
export PATH=$PATH:~/google-cloud-sdk/bin
```

### Issue: "Could not automatically determine credentials"

**Symptoms:** Vertex API calls fail with authentication error

**Cause:** No ADC credentials set up

**Fix:**
```bash
gcloud auth application-default login
```

### Issue: "Permission denied"

**Symptoms:** `aiplatform.endpoints.predict` permission error

**Cause:** Your account lacks Vertex AI permissions in the project

**Fix:**
1. Verify you're using the correct project
2. Ask project admin to grant `roles/aiplatform.user`
3. Or use a different project where you have access

### Issue: "Project not found"

**Cause:** Project ID is incorrect or doesn't exist

**Fix:**
```bash
# List your projects
gcloud projects list

# Use the PROJECT_ID column value
```

### Issue: "Region not supported"

**Cause:** Selected region doesn't have Claude models

**Fix:** Use one of these supported regions:
- us-central1
- us-east5
- europe-west1
- europe-west4
- asia-southeast1

### Issue: Token Refresh Fails

**Cause:** ADC credentials expired and auto-refresh isn't working

**Fix:**
```bash
# Manually refresh
gcloud auth application-default login

# Or revoke and re-login
gcloud auth application-default revoke
gcloud auth application-default login
```

## Google Cloud Console

### Access
https://console.cloud.google.com

### Useful Pages
- **Vertex AI Dashboard**: console.cloud.google.com/vertex-ai
- **IAM & Admin**: console.cloud.google.com/iam-admin
- **API Library**: console.cloud.google.com/apis/library
- **Billing**: console.cloud.google.com/billing

### Enable Vertex AI API

If you get "API not enabled" error:

1. Go to API Library
2. Search for "Vertex AI API"
3. Click Enable
4. Wait a few minutes for activation

Or via CLI:
```bash
gcloud services enable aiplatform.googleapis.com
```

## Billing & Quotas

### Billing Account Required
Vertex AI requires an active billing account. Free tier provides:
- $300 credit for new users (90 days)
- After that, pay-as-you-go

### Check Billing Status
```bash
gcloud billing accounts list
```

### Link Project to Billing
```bash
gcloud billing projects link PROJECT_ID \
  --billing-account=BILLING_ACCOUNT_ID
```

### Quotas
Each project has default quotas for:
- Requests per minute
- Tokens per minute
- Concurrent requests

View quotas: console.cloud.google.com/iam-admin/quotas

## Vertex AI vs Anthropic API Differences

### Model Naming
- Anthropic API: `claude-3-5-sonnet-20241022`
- Vertex AI: `claude-3-5-sonnet@20240620`

### Authentication
- Anthropic API: API key in `ANTHROPIC_API_KEY`
- Vertex AI: Google Cloud ADC via gcloud

### Pricing
- Check Google Cloud Vertex AI pricing page
- May differ from Anthropic API pricing
- Can use Google Cloud credits and committed use discounts

### Features
- Both support streaming
- Both support tool use (function calling)
- Vertex may have slight latency for new model releases

## Troubleshooting Checklist

When things don't work, check in order:

1. **gcloud CLI installed?**
   ```bash
   which gcloud
   ```

2. **Authenticated?**
   ```bash
   gcloud auth application-default print-access-token
   ```

3. **Project exists and accessible?**
   ```bash
   gcloud projects list
   ```

4. **Vertex AI API enabled?**
   ```bash
   gcloud services list --enabled | grep aiplatform
   ```

5. **Billing enabled?**
   ```bash
   gcloud billing projects describe PROJECT_ID
   ```

6. **Claude Code configured?**
   ```bash
   cat ~/.claude/settings.json | grep VERTEX
   ```

7. **Restarted Claude Code?**
   Configuration changes require restart.

## Best Practices

### Project Organization
Create separate projects for:
- Development (`my-app-dev`)
- Staging (`my-app-staging`)
- Production (`my-app-prod`)

### Authentication
- Use ADC for development
- Use service accounts for production
- Never commit credentials to git

### Region Selection
Choose based on:
1. Geographic proximity (latency)
2. Data residency requirements
3. Model availability
4. Cost (minimal variance)

### Cost Management
- Set up budget alerts in Google Cloud Console
- Monitor usage in Vertex AI dashboard
- Use quotas to prevent runaway costs

## Service Accounts (Advanced)

For production or CI/CD:

### Create Service Account
```bash
gcloud iam service-accounts create claude-vertex-sa \
  --display-name="Claude Vertex AI Service Account"
```

### Grant Permissions
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:claude-vertex-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Create Key
```bash
gcloud iam service-accounts keys create key.json \
  --iam-account=claude-vertex-sa@PROJECT_ID.iam.gserviceaccount.com
```

### Use Key
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

**WARNING:** Service account keys are sensitive. Store securely.

## Resources

### Official Documentation
- Google Vertex AI: https://cloud.google.com/vertex-ai
- Claude on Vertex: https://docs.anthropic.com/claude/docs/vertex-ai
- gcloud CLI: https://cloud.google.com/sdk/gcloud

### Claude Code Documentation
- https://code.claude.com/docs/en/google-vertex-ai

### Support
- Google Cloud Support: Via Google Cloud Console
- Anthropic Support: support@anthropic.com
- Plugin Issues: https://github.com/ChadDahlgren/claude-code-provider/issues

## Quick Start Commands

### First Time Setup
```bash
# Install gcloud
brew install google-cloud-sdk

# Initialize
gcloud init

# Authenticate for ADC
gcloud auth application-default login

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Test access
gcloud projects list
```

### Daily Use
```bash
# Check authentication
gcloud auth application-default print-access-token

# Refresh if needed
gcloud auth application-default login

# Check current project
gcloud config get-value project

# Switch project
gcloud config set project OTHER_PROJECT_ID
```

### Debugging
```bash
# Check all auth
gcloud auth list

# Check ADC status
gcloud auth application-default print-access-token

# Check enabled APIs
gcloud services list --enabled

# Check IAM permissions
gcloud projects get-iam-policy PROJECT_ID
```
