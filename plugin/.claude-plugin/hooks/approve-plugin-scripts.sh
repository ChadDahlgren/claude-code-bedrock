#!/usr/bin/env bash
# Auto-approve READ-ONLY bash commands used by the Bedrock plugin
# Commands that modify system state require user approval
# This hook receives JSON input on stdin and outputs a decision

set -euo pipefail

# Read the JSON input from Claude Code
INPUT=$(cat)

# Extract the command using jq (more reliable than grep/sed)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Security: Reject compound commands that could hide malicious code
# Check for shell operators that chain commands
has_dangerous_patterns() {
    local cmd="$1"
    # Reject: semicolon, &&, ||, pipe, subshell, backticks, redirection
    if [[ "$cmd" == *';'* ]] || \
       [[ "$cmd" == *'&&'* ]] || \
       [[ "$cmd" == *'||'* ]] || \
       [[ "$cmd" == *'|'* ]] || \
       [[ "$cmd" == *'$('* ]] || \
       [[ "$cmd" == *'`'* ]] || \
       [[ "$cmd" == *'>'* ]] || \
       [[ "$cmd" == *'<'* ]]; then
        return 0  # Has dangerous patterns
    fi
    return 1  # Safe
}

# Check if command starts with an allowed pattern
is_allowed_command() {
    local cmd="$1"
    # Allowed read-only commands (must be at start of command)
    case "$cmd" in
        "aws --version"*) return 0 ;;
        "which aws"*) return 0 ;;
        "which jq"*) return 0 ;;
        "jq --version"*) return 0 ;;
        "aws sts get-caller-identity"*) return 0 ;;
        "aws configure list-profiles"*) return 0 ;;
        "aws configure get "*) return 0 ;;
        "aws configure export-credentials"*) return 0 ;;
        "aws bedrock list-inference-profiles"*) return 0 ;;
        "aws bedrock list-foundation-models"*) return 0 ;;
        *) return 1 ;;
    esac
}

# Only auto-approve if: starts with allowed command AND has no dangerous patterns
if is_allowed_command "$COMMAND" && ! has_dangerous_patterns "$COMMAND"; then
    cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Bedrock plugin read-only command"
  }
}
EOF
    exit 0
fi

# Commands requiring user approval (not auto-approved):
# - aws configure sso (modifies config)
# - aws sso login (opens browser)
# - brew install (installs software)

# For any other command, don't make a decision (let normal flow proceed)
echo '{}'
exit 0
