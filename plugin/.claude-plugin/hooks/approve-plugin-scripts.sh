#!/usr/bin/env bash
# Auto-approve bash commands that run this plugin's scripts
# This hook receives JSON input on stdin and outputs a decision

set -euo pipefail

# Read the JSON input from Claude Code
INPUT=$(cat)

# Extract the command being run
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//' | sed 's/"$//' || echo "")

# Check if this is one of our plugin scripts
# Our scripts are in ${CLAUDE_PLUGIN_ROOT}/scripts/
if [[ "$COMMAND" == *'${CLAUDE_PLUGIN_ROOT}/scripts/'* ]] || \
   [[ "$COMMAND" == *'/claude-code-provider/scripts/'* ]] || \
   [[ "$COMMAND" == *'check-gcloud'* ]] || \
   [[ "$COMMAND" == *'check-gcloud-auth'* ]] || \
   [[ "$COMMAND" == *'get-gcloud-projects'* ]] || \
   [[ "$COMMAND" == *'apply-vertex-config'* ]] || \
   [[ "$COMMAND" == *'list-vertex-models'* ]] || \
   [[ "$COMMAND" == *'toggle-provider'* ]] || \
   [[ "$COMMAND" == *'check-aws-cli'* ]] || \
   [[ "$COMMAND" == *'parse-aws-profiles'* ]] || \
   [[ "$COMMAND" == *'check-sso-session'* ]] || \
   [[ "$COMMAND" == *'apply-config'* ]]; then

    # Auto-approve our plugin scripts
    cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Provider plugin script"
  }
}
EOF
    exit 0
fi

# Also auto-approve gcloud commands used by our plugin
if [[ "$COMMAND" == *'gcloud auth application-default'* ]] || \
   [[ "$COMMAND" == *'gcloud projects list'* ]] || \
   [[ "$COMMAND" == *'gcloud config get-value'* ]] || \
   [[ "$COMMAND" == *'gcloud services enable aiplatform'* ]] || \
   [[ "$COMMAND" == *'gcloud services list'* ]]; then

    cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Provider plugin gcloud command"
  }
}
EOF
    exit 0
fi

# Also auto-approve aws commands used by our plugin
if [[ "$COMMAND" == *'aws sso login'* ]] || \
   [[ "$COMMAND" == *'aws --version'* ]] || \
   [[ "$COMMAND" == *'which aws'* ]] || \
   [[ "$COMMAND" == *'which gcloud'* ]]; then

    cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Provider plugin AWS/gcloud command"
  }
}
EOF
    exit 0
fi

# For any other command, don't make a decision (let normal flow proceed)
echo '{}'
exit 0
