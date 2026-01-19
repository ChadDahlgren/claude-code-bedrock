#!/usr/bin/env bash
# Toggle between Anthropic API and configured cloud provider
# Usage: toggle-provider.sh [vertex|bedrock|anthropic]
#
# With no argument: cycles through available providers
# With argument: switches to that specific provider

set -euo pipefail

SETTINGS_FILE="$HOME/.claude/settings.json"

# Check if settings.json exists
if [[ ! -f "$SETTINGS_FILE" ]]; then
    echo "error:no-settings"
    exit 1
fi

# Read current settings
SETTINGS=$(cat "$SETTINGS_FILE")

# Get current provider state
USE_VERTEX=$(echo "$SETTINGS" | grep -o '"CLAUDE_CODE_USE_VERTEX"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "0")
USE_BEDROCK=$(echo "$SETTINGS" | grep -o '"CLAUDE_CODE_USE_BEDROCK"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "0")

# Determine current provider
if [[ "$USE_VERTEX" == "1" ]]; then
    CURRENT="vertex"
elif [[ "$USE_BEDROCK" == "1" ]]; then
    CURRENT="bedrock"
else
    CURRENT="anthropic"
fi

# Handle specific provider request
TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
    # No argument - toggle to next provider
    # Priority: anthropic -> vertex (if configured) -> bedrock (if configured) -> anthropic
    case "$CURRENT" in
        anthropic)
            # Check if vertex is configured
            if echo "$SETTINGS" | grep -q '"CLOUD_ML_REGION"'; then
                TARGET="vertex"
            elif echo "$SETTINGS" | grep -q '"AWS_PROFILE"'; then
                TARGET="bedrock"
            else
                echo "error:no-providers-configured"
                exit 1
            fi
            ;;
        vertex)
            # Check if bedrock is configured
            if echo "$SETTINGS" | grep -q '"AWS_PROFILE"'; then
                TARGET="bedrock"
            else
                TARGET="anthropic"
            fi
            ;;
        bedrock)
            TARGET="anthropic"
            ;;
    esac
fi

# Don't switch if already on target
if [[ "$TARGET" == "$CURRENT" ]]; then
    echo "current:$CURRENT"
    exit 0
fi

# Create updated settings using jq if available, otherwise use sed
if command -v jq &> /dev/null; then
    case "$TARGET" in
        vertex)
            NEW_SETTINGS=$(echo "$SETTINGS" | jq '.env.CLAUDE_CODE_USE_VERTEX = "1" | .env.CLAUDE_CODE_USE_BEDROCK = "0"')
            ;;
        bedrock)
            NEW_SETTINGS=$(echo "$SETTINGS" | jq '.env.CLAUDE_CODE_USE_VERTEX = "0" | .env.CLAUDE_CODE_USE_BEDROCK = "1"')
            ;;
        anthropic)
            NEW_SETTINGS=$(echo "$SETTINGS" | jq '.env.CLAUDE_CODE_USE_VERTEX = "0" | .env.CLAUDE_CODE_USE_BEDROCK = "0"')
            ;;
        *)
            echo "error:invalid-target:$TARGET"
            exit 1
            ;;
    esac

    echo "$NEW_SETTINGS" > "$SETTINGS_FILE"
else
    # Fallback: use sed (less safe but works without jq)
    case "$TARGET" in
        vertex)
            sed -i.bak 's/"CLAUDE_CODE_USE_VERTEX"[[:space:]]*:[[:space:]]*"[^"]*"/"CLAUDE_CODE_USE_VERTEX": "1"/' "$SETTINGS_FILE"
            sed -i.bak 's/"CLAUDE_CODE_USE_BEDROCK"[[:space:]]*:[[:space:]]*"[^"]*"/"CLAUDE_CODE_USE_BEDROCK": "0"/' "$SETTINGS_FILE"
            ;;
        bedrock)
            sed -i.bak 's/"CLAUDE_CODE_USE_VERTEX"[[:space:]]*:[[:space:]]*"[^"]*"/"CLAUDE_CODE_USE_VERTEX": "0"/' "$SETTINGS_FILE"
            sed -i.bak 's/"CLAUDE_CODE_USE_BEDROCK"[[:space:]]*:[[:space:]]*"[^"]*"/"CLAUDE_CODE_USE_BEDROCK": "1"/' "$SETTINGS_FILE"
            ;;
        anthropic)
            sed -i.bak 's/"CLAUDE_CODE_USE_VERTEX"[[:space:]]*:[[:space:]]*"[^"]*"/"CLAUDE_CODE_USE_VERTEX": "0"/' "$SETTINGS_FILE"
            sed -i.bak 's/"CLAUDE_CODE_USE_BEDROCK"[[:space:]]*:[[:space:]]*"[^"]*"/"CLAUDE_CODE_USE_BEDROCK": "0"/' "$SETTINGS_FILE"
            ;;
        *)
            echo "error:invalid-target:$TARGET"
            exit 1
            ;;
    esac
    rm -f "${SETTINGS_FILE}.bak"
fi

echo "switched:$CURRENT:$TARGET"
exit 0
