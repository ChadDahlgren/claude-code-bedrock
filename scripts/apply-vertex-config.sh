#!/usr/bin/env bash
#
# apply-vertex-config.sh <project-id> <region> [model-id]
# Apply Google Vertex AI configuration to ~/.claude/settings.json
#
# This script safely merges the new configuration with existing settings,
# preserving MCP servers, hooks, and other user configurations.
#
# Arguments:
#   project-id: Google Cloud project ID
#   region: Vertex AI region (e.g., us-east5)
#   model-id: (optional) Claude model ID for Vertex AI
#             Default: claude-sonnet-4-20250514
#
# Exit codes:
#   0 - Configuration applied successfully
#   1 - Error applying configuration
#
# Output:
#   On success: "success"
#   On error: "error <message>"

set -euo pipefail

# Check arguments (model is optional)
if [ $# -lt 2 ]; then
    echo "error missing-arguments"
    exit 1
fi

PROJECT_ID="$1"
REGION="$2"
MODEL_ID="${3:-claude-sonnet-4-5@20250929}"

SETTINGS_FILE="${HOME}/.claude/settings.json"
SETTINGS_DIR="${HOME}/.claude"

# Create .claude directory if it doesn't exist
if [ ! -d "$SETTINGS_DIR" ]; then
    mkdir -p "$SETTINGS_DIR"
fi

# Read existing settings or create empty object
if [ -f "$SETTINGS_FILE" ]; then
    EXISTING_SETTINGS=$(cat "$SETTINGS_FILE")
else
    EXISTING_SETTINGS="{}"
fi

# Use Python to safely merge JSON
# This preserves all existing settings while adding/updating Vertex config
python3 << 'EOF' "$EXISTING_SETTINGS" "$PROJECT_ID" "$REGION" "$MODEL_ID" "$SETTINGS_FILE"
import json
import sys

try:
    # Read arguments
    existing_json = sys.argv[1]
    project_id = sys.argv[2]
    region = sys.argv[3]
    model_id = sys.argv[4]
    settings_file = sys.argv[5]

    # Parse existing settings
    settings = json.loads(existing_json)

    # Ensure env object exists
    if "env" not in settings:
        settings["env"] = {}

    # Add/update Vertex configuration
    settings["env"]["CLAUDE_CODE_USE_VERTEX"] = "1"
    settings["env"]["GOOGLE_PROJECT_ID"] = project_id
    settings["env"]["ANTHROPIC_VERTEX_REGION"] = region
    settings["env"]["ANTHROPIC_MODEL"] = model_id

    # If Bedrock was enabled, disable it (only one provider at a time)
    if "CLAUDE_CODE_USE_BEDROCK" in settings["env"]:
        settings["env"]["CLAUDE_CODE_USE_BEDROCK"] = "0"

    # Add auto-refresh command
    settings["vertexAuthRefresh"] = "gcloud auth application-default login"

    # Write back to file with pretty formatting
    with open(settings_file, 'w') as f:
        json.dump(settings, f, indent=2)

    print("success")
    sys.exit(0)

except Exception as e:
    print(f"error {str(e)}")
    sys.exit(1)
EOF

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    exit 0
else
    echo "error failed-to-write-settings"
    exit 1
fi
