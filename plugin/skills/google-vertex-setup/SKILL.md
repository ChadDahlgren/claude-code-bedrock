# Google Vertex AI Reference

Reference material for configuring Claude Code with Google Vertex AI.

## Supported Regions

| Region | Location | Notes |
|--------|----------|-------|
| us-central1 | Iowa | **Recommended** - best availability |
| us-east5 | Columbus | Good for east coast US |
| europe-west1 | Belgium | For European users |
| europe-west4 | Netherlands | For European users |
| asia-southeast1 | Singapore | For Asia-Pacific |

## Model Naming

Vertex uses `@` separator (not `-`) before the date:

```
claude-{model-name}@{date}
```

**Example:** `claude-opus-4-5@20251101`

**Verify model availability:**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  "https://global-aiplatform.googleapis.com/v1/projects/<project-id>/locations/global/publishers/anthropic/models/<model-id>:rawPredict" \
  -d '{"anthropic_version":"vertex-2023-10-16","messages":[{"role":"user","content":"hi"}],"max_tokens":1}'
```

Response = model available. 404 = not enabled in Model Garden.

## Authentication

### Application Default Credentials (ADC)

Claude Code uses ADC:

```bash
gcloud auth application-default login
```

Opens browser, stores credentials at `~/.config/gcloud/application_default_credentials.json`.

### Check Status
```bash
gcloud auth application-default print-access-token
```

Returns token = authenticated.

## Required IAM Permissions

Minimum role: **Vertex AI User** (`roles/aiplatform.user`)

Or custom policy:
```json
{
  "bindings": [{
    "role": "roles/aiplatform.user",
    "members": ["user:you@example.com"]
  }]
}
```

Permissions included:
- `aiplatform.endpoints.predict`
- `aiplatform.models.get`

## Claude Code Configuration

**Settings file:** `~/.claude/settings.json`

```json
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "1",
    "CLAUDE_CODE_USE_BEDROCK": "0",
    "GOOGLE_PROJECT_ID": "my-project-id",
    "ANTHROPIC_VERTEX_REGION": "us-central1",
    "ANTHROPIC_MODEL": "claude-opus-4-5@20251101"
  },
  "vertexAuthRefresh": "gcloud auth application-default login"
}
```

**Critical values:**
- `CLAUDE_CODE_USE_VERTEX`: Must be `"1"` (string)
- `ANTHROPIC_MODEL`: Use `@` separator format

**Always merge, never overwrite** - users may have MCP servers, hooks, etc.

## Enable Vertex AI API

Required before first use:

```bash
gcloud services enable aiplatform.googleapis.com --project=<project-id>
```

Or via console: console.cloud.google.com/apis/library → search "Vertex AI API" → Enable

## Enable Claude in Model Garden

If you get 404 on model calls:

1. Go to: console.cloud.google.com/vertex-ai/model-garden
2. Search for "Claude"
3. Click on a Claude model
4. Click "Enable" and accept terms

## Troubleshooting

| Error | Fix |
|-------|-----|
| gcloud not found | `brew install google-cloud-sdk` |
| Not authenticated | `gcloud auth application-default login` |
| Permission denied | Ask admin for `roles/aiplatform.user`, or use different project |
| Project not found | `gcloud projects list` to see available projects |
| API not enabled | `gcloud services enable aiplatform.googleapis.com --project=<project>` |
| Billing required | Enable billing; new users get $300 free credit |

## gcloud CLI Installation

**macOS:**
```bash
brew install google-cloud-sdk
```

**Verify:**
```bash
gcloud --version
```

## Useful Commands

```bash
# List projects
gcloud projects list

# Check authentication
gcloud auth application-default print-access-token

# Check enabled APIs
gcloud services list --enabled --project=<project> | grep aiplatform

# Authenticate
gcloud auth application-default login

# Enable Vertex AI
gcloud services enable aiplatform.googleapis.com --project=<project>

# Set default project
gcloud config set project <project-id>

# Get current project
gcloud config get-value project
```

## Resources

- [Google Vertex AI](https://cloud.google.com/vertex-ai)
- [Claude on Vertex](https://docs.anthropic.com/claude/docs/vertex-ai)
- [gcloud CLI](https://cloud.google.com/sdk/gcloud)
