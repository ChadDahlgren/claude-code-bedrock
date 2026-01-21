#!/bin/bash
#
# Reset AWS Bedrock configuration for testing the setup flow
# This script:
#   1. Backs up and removes ~/.aws/config
#   2. Clears the SSO cache
#   3. Removes Bedrock-related settings from ~/.claude/settings.json
#

set -e

TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "=== Resetting AWS Bedrock Configuration ==="
echo ""

# --- AWS Config ---
echo "1. AWS Config (~/.aws/config)"
if [ -f ~/.aws/config ]; then
    BACKUP_PATH=~/.aws/config.backup.$TIMESTAMP
    cp ~/.aws/config "$BACKUP_PATH"
    rm ~/.aws/config
    echo "   ✓ Backed up to: $BACKUP_PATH"
    echo "   ✓ Removed ~/.aws/config"
else
    echo "   - No config file found (already clean)"
fi

# --- SSO Cache ---
echo ""
echo "2. SSO Cache (~/.aws/sso/cache/)"
if [ -d ~/.aws/sso/cache ] && [ "$(ls -A ~/.aws/sso/cache 2>/dev/null)" ]; then
    rm -f ~/.aws/sso/cache/*.json
    echo "   ✓ Cleared SSO cache"
else
    echo "   - No cache files found (already clean)"
fi

# --- Claude Settings ---
echo ""
echo "3. Claude Settings (~/.claude/settings.json)"
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

        # Remove Bedrock-related keys from env
        jq 'del(.env.CLAUDE_CODE_USE_BEDROCK, .env.AWS_PROFILE, .env.AWS_REGION, .env.ANTHROPIC_MODEL) | del(.bedrockAuthRefresh)' \
            ~/.claude/settings.json > ~/.claude/settings.json.tmp \
            && mv ~/.claude/settings.json.tmp ~/.claude/settings.json

        echo "   ✓ Removed Bedrock settings:"
        echo "     - CLAUDE_CODE_USE_BEDROCK"
        echo "     - AWS_PROFILE"
        echo "     - AWS_REGION"
        echo "     - ANTHROPIC_MODEL"
        echo "     - bedrockAuthRefresh"
    fi
else
    echo "   - No settings file found"
fi

echo ""
echo "=== Reset Complete ==="
echo ""
echo "You can now test the setup flow with:"
echo "  claude --plugin-dir /path/to/plugin"
echo "  /bedrock"
echo ""
