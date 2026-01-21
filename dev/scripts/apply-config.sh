#!/usr/bin/env bash
#
# apply-config.sh <profile> <region>
# Apply AWS Bedrock configuration to ~/.claude/settings.json
#
# This script safely merges the new configuration with existing settings,
# preserving MCP servers, hooks, and other user configurations.
#
# Exit codes:
#   0 - Configuration applied successfully
#   1 - Error applying configuration
#
# Output:
#   On success: "success"
#   On error: "error <message>"

set -euo pipefail

# Check arguments
if [ $# -ne 2 ]; then
    echo "error missing-arguments"
    exit 1
fi

PROFILE="$1"
REGION="$2"

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
# This preserves all existing settings while adding/updating Bedrock config
python3 << 'EOF' "$EXISTING_SETTINGS" "$PROFILE" "$REGION" "$SETTINGS_FILE"
import json
import sys

try:
    # Read arguments
    existing_json = sys.argv[1]
    profile = sys.argv[2]
    region = sys.argv[3]
    settings_file = sys.argv[4]

    # Parse existing settings
    settings = json.loads(existing_json)

    # Ensure env object exists
    if "env" not in settings:
        settings["env"] = {}

    # Add/update Bedrock configuration
    settings["env"]["CLAUDE_CODE_USE_BEDROCK"] = "1"
    settings["env"]["AWS_PROFILE"] = profile
    settings["env"]["AWS_REGION"] = region

    # Add auto-refresh command
    settings["awsAuthRefresh"] = f"aws sso login --profile {profile}"

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
