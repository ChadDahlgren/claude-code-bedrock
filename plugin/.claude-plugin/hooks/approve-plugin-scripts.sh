#!/usr/bin/env bash
# Auto-approve commands used by the Bedrock plugin
# This hook receives JSON input on stdin and outputs a decision

set -euo pipefail

# Read the JSON input from Claude Code
INPUT=$(cat)

# Extract the command using jq
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Get the plugin root directory (this script's parent's parent)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
PLUGIN_ROOT="$(dirname "$PLUGIN_ROOT")"

# Approve helper function
approve() {
    cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Bedrock plugin approved command"
  }
}
EOF
    exit 0
}

# Check if command is our TypeScript scripts (must be in THIS plugin's directory)
is_plugin_script() {
    local cmd="$1"
    # Must start with "node " and contain our exact plugin path
    # This prevents approving arbitrary scripts that happen to have similar names
    if [[ "$cmd" == "node ${PLUGIN_ROOT}/scripts/dist/index.js"* ]]; then
        return 0
    fi
    return 1
}

# Security: Reject compound commands that could hide malicious code
has_dangerous_patterns() {
    local cmd="$1"
    # Strip safe stderr redirects before checking
    local sanitized="${cmd//2>&1/}"
    sanitized="${sanitized//2>\/dev\/null/}"
    # Reject: semicolon, &&, ||, pipe, subshell, backticks, redirection, newlines
    if [[ "$sanitized" == *';'* ]] || \
       [[ "$sanitized" == *'&&'* ]] || \
       [[ "$sanitized" == *'||'* ]] || \
       [[ "$sanitized" == *'|'* ]] || \
       [[ "$sanitized" == *'$('* ]] || \
       [[ "$sanitized" == *'`'* ]] || \
       [[ "$sanitized" == *'>'* ]] || \
       [[ "$sanitized" == *'<'* ]] || \
       [[ "$sanitized" == *$'\n'* ]]; then
        return 0  # Has dangerous patterns
    fi
    return 1  # Safe
}

# Check if command is an allowed AWS CLI read-only command
is_allowed_aws_command() {
    local cmd="$1"
    case "$cmd" in
        # Version checks
        "aws --version"*) return 0 ;;
        "which aws"*) return 0 ;;
        # Identity and config (read-only)
        "aws sts get-caller-identity"*) return 0 ;;
        "aws configure list-profiles"*) return 0 ;;
        "aws configure get "*) return 0 ;;
        "aws configure export-credentials"*) return 0 ;;
        # Bedrock queries (read-only)
        "aws bedrock list-inference-profiles"*) return 0 ;;
        "aws bedrock list-foundation-models"*) return 0 ;;
        *) return 1 ;;
    esac
}

# 1. Always approve our plugin scripts (they're trusted code)
if is_plugin_script "$COMMAND"; then
    approve
fi

# 2. Approve safe AWS commands (no dangerous patterns)
if is_allowed_aws_command "$COMMAND" && ! has_dangerous_patterns "$COMMAND"; then
    approve
fi

# For any other command, don't make a decision (let normal flow proceed)
# This includes:
# - aws configure sso (modifies config)
# - aws sso login (opens browser)
# - brew install (installs software)
echo '{}'
exit 0
