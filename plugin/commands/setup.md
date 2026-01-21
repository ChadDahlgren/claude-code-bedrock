---
description: Configure Claude Code to use AWS Bedrock or Google Vertex AI
---

# Provider Setup Command

Guide the user through configuring Claude Code to use an enterprise cloud provider.

## Provider Selection

Use `AskUserQuestion`:
- "Which provider would you like to configure?"
- Options: "AWS Bedrock" / "Google Vertex AI"

---

## AWS BEDROCK FLOW

### Step 1: Check Prerequisites

```bash
which aws && aws --version
```

**Not installed?** Offer to install: `brew install awscli`

### Step 2: Select or Create Profile

```bash
aws configure list-profiles
```

**Profiles found?** Let user select one, or choose "Configure new profile"

**No profiles?** Collect SSO info via `AskUserQuestion`:
- SSO start URL (e.g., `https://company.awsapps.com/start`)
- SSO region (e.g., `us-west-2`)
- Profile name (e.g., `work-dev`)

Then tell user to run in their terminal:

```
Run: aws configure sso

Enter these values when prompted:
  SSO session name:    {profile_name}
  SSO start URL:       {sso_url}
  SSO region:          {sso_region}
  CLI profile name:    {profile_name}

Complete browser auth, then type 'done' here.
```

Verify: `aws configure list-profiles | grep -w "{profile_name}"`

### Step 3: Select Region

Use `AskUserQuestion` - "Select a Bedrock region":
- us-west-2 (Oregon) - Recommended, best model availability
- us-east-1 (N. Virginia)
- eu-west-1 (Ireland)
- ap-northeast-1 (Tokyo)

### Step 4: Authenticate

```bash
aws sso login --profile <profile>
```

Tell user: "Complete SSO login in your browser."

### Step 5: Select Model

Query available Claude models:

```bash
aws bedrock list-inference-profiles --profile <profile> --region <region> --output json | jq -r '.inferenceProfileSummaries[] | select(.inferenceProfileArn | contains("anthropic")) | [.inferenceProfileId, .inferenceProfileName] | @tsv'
```

Let user select. Use the exact `inferenceProfileId` returned.

**Why inference profiles?** Claude 4.5 models require inference profiles for on-demand access. The `global.` prefix is recommended for best availability and dynamic routing across all regions.

### Step 6: Apply Configuration

Merge into `~/.claude/settings.json` (preserve existing settings):

```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "CLAUDE_CODE_USE_VERTEX": "0",
    "AWS_PROFILE": "<profile>",
    "AWS_REGION": "<region>",
    "ANTHROPIC_MODEL": "<model-id>"
  },
  "bedrockAuthRefresh": "aws sso login --profile <profile>"
}
```

### Step 7: Done

```
✓ AWS Bedrock configured

  Profile:  <profile>
  Region:   <region>
  Model:    <model>

⚠ RESTART REQUIRED
  Exit and restart Claude Code for changes to take effect.

To undo: set "CLAUDE_CODE_USE_BEDROCK": "0" in ~/.claude/settings.json
```

---

## GOOGLE VERTEX AI FLOW

### Step 1: Check Prerequisites

```bash
which gcloud && gcloud --version | head -1
```

**Not installed?** Offer to install: `brew install google-cloud-sdk`

### Step 2: Authenticate

```bash
gcloud auth application-default print-access-token 2>/dev/null
```

**No token?** Run: `gcloud auth application-default login`

**Why ADC?** Application Default Credentials let Claude Code authenticate without storing API keys. Tokens auto-refresh.

### Step 3: Select Project

```bash
gcloud projects list --format="value(projectId)"
```

Let user select from list.

**No projects?** Direct to: https://console.cloud.google.com/projectcreate

### Step 4: Select Region

Use `AskUserQuestion` - "Select a Vertex AI region":
- us-central1 (Iowa) - Recommended
- us-east5 (Columbus)
- europe-west1 (Belgium)
- europe-west4 (Netherlands)
- asia-southeast1 (Singapore)

### Step 5: Enable Vertex AI API

```bash
gcloud services list --enabled --filter="name:aiplatform.googleapis.com" --project=<project>
```

**Not enabled?** Run: `gcloud services enable aiplatform.googleapis.com --project=<project>`

### Step 6: Check Claude Access

```bash
curl -s -X POST \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  "https://global-aiplatform.googleapis.com/v1/projects/<project>/locations/global/publishers/anthropic/models/claude-opus-4-5@20251101:rawPredict" \
  -d '{"anthropic_version":"vertex-2023-10-16","messages":[{"role":"user","content":"hi"}],"max_tokens":1}'
```

**404?** Claude not enabled. Direct user to Model Garden:
1. Open: https://console.cloud.google.com/vertex-ai/model-garden?project=<project>
2. Search "Claude", click any model, click "Enable"

### Step 7: Select Model

Vertex format: `claude-opus-4-5@20251101` (uses `@` separator)

Let user select from available models.

### Step 8: Apply Configuration

Merge into `~/.claude/settings.json` (preserve existing settings):

```json
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "1",
    "CLAUDE_CODE_USE_BEDROCK": "0",
    "GOOGLE_PROJECT_ID": "<project>",
    "ANTHROPIC_VERTEX_REGION": "<region>",
    "ANTHROPIC_MODEL": "<model>"
  },
  "vertexAuthRefresh": "gcloud auth application-default login"
}
```

### Step 9: Done

```
✓ Google Vertex AI configured

  Project:  <project>
  Region:   <region>
  Model:    <model>

⚠ RESTART REQUIRED
  Exit and restart Claude Code for changes to take effect.

To undo: set "CLAUDE_CODE_USE_VERTEX": "0" in ~/.claude/settings.json
```

---

## Error Handling

| Error | Fix |
|-------|-----|
| CLI not installed | Offer Homebrew install |
| Auth fails | Check network, retry, or run auth command manually |
| No profiles/projects | Guide to create one |
| API not enabled | Offer to enable it |
| Permission denied | Contact administrator |
| Can't write settings | Run: `mkdir -p ~/.claude` |
