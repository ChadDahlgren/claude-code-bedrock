#!/bin/bash
#
# Reset Google Vertex AI configuration for testing the setup flow
# This script:
#   1. Revokes application default credentials
#   2. Removes Vertex-related settings from ~/.claude/settings.json
#

set -e

TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "=== Resetting Google Vertex AI Configuration ==="
echo ""

# --- Application Default Credentials ---
echo "1. Google ADC (~/.config/gcloud/application_default_credentials.json)"
if [ -f ~/.config/gcloud/application_default_credentials.json ]; then
    BACKUP_PATH=~/.config/gcloud/application_default_credentials.json.backup.$TIMESTAMP
    cp ~/.config/gcloud/application_default_credentials.json "$BACKUP_PATH"
    rm ~/.config/gcloud/application_default_credentials.json
    echo "   ✓ Backed up to: $BACKUP_PATH"
    echo "   ✓ Removed ADC file"
else
    echo "   - No ADC file found (already clean)"
fi

# --- Claude Settings ---
echo ""
echo "2. Claude Settings (~/.claude/settings.json)"
if [ -f ~/.claude/settings.json ]; then
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo "   ⚠ jq not installed - please install with: brew install jq"
        echo "   Skipping settings.json cleanup"
    else
        # Backup settings
        SETTINGS_BACKUP=~/.claude/settings.json.backup.$TIMESTAMP
        cp ~/.claude/settings.json "$SETTINGS_BACKUP"
        echo "   ✓ Backed up to: $SETTINGS_BACKUP"

        # Remove Vertex-related keys from env
        jq 'del(.env.CLAUDE_CODE_USE_VERTEX, .env.GOOGLE_PROJECT_ID, .env.GOOGLE_CLOUD_PROJECT, .env.ANTHROPIC_VERTEX_PROJECT_ID, .env.ANTHROPIC_VERTEX_REGION, .env.CLOUD_ML_REGION, .env.GOOGLE_REGION, .env.ANTHROPIC_MODEL) | del(.vertexAuthRefresh)' \
            ~/.claude/settings.json > ~/.claude/settings.json.tmp \
            && mv ~/.claude/settings.json.tmp ~/.claude/settings.json

        echo "   ✓ Removed Vertex settings:"
        echo "     - CLAUDE_CODE_USE_VERTEX"
        echo "     - GOOGLE_PROJECT_ID / GOOGLE_CLOUD_PROJECT"
        echo "     - ANTHROPIC_VERTEX_PROJECT_ID"
        echo "     - ANTHROPIC_VERTEX_REGION / CLOUD_ML_REGION / GOOGLE_REGION"
        echo "     - ANTHROPIC_MODEL"
        echo "     - vertexAuthRefresh"
    fi
else
    echo "   - No settings file found"
fi

echo ""
echo "=== Reset Complete ==="
echo ""
echo "You can now test the setup flow with:"
echo "  claude --plugin-dir /path/to/claude-code-provider/plugin"
echo "  /provider:setup"
echo ""
