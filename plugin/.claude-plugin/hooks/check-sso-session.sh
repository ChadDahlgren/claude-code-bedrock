#!/usr/bin/env bash
#
# SessionStart hook: Check AWS SSO session status before conversation begins
#
# Uses AWS CLI to check session validity - no manual file parsing needed.
# This runs BEFORE the AI conversation starts, so even if the CLI makes
# API calls, we can catch failures and warn the user.
#
# Output: JSON with additionalContext if session is expired/expiring
#

set -euo pipefail

# Configuration
WARNING_THRESHOLD_MINUTES=30

# Check if Bedrock is configured and get the profile name
get_bedrock_profile() {
    # Check environment variable first
    if [[ -n "${AWS_PROFILE:-}" ]] && [[ "${CLAUDE_CODE_USE_BEDROCK:-}" == "1" ]]; then
        echo "$AWS_PROFILE"
        return 0
    fi

    # Check settings.json
    if [[ -f ~/.claude/settings.json ]] && command -v jq &> /dev/null; then
        local use_bedrock=$(jq -r '.env.CLAUDE_CODE_USE_BEDROCK // ""' ~/.claude/settings.json 2>/dev/null)
        local profile=$(jq -r '.env.AWS_PROFILE // ""' ~/.claude/settings.json 2>/dev/null)
        if [[ "$use_bedrock" == "1" ]] && [[ -n "$profile" ]]; then
            echo "$profile"
            return 0
        fi
    fi

    return 1
}

# Check if profile uses SSO Session format (has refresh tokens)
check_has_sso_session() {
    local profile="$1"

    # Use AWS CLI to check if profile references an sso_session
    local sso_session
    sso_session=$(aws configure get sso_session --profile "$profile" 2>/dev/null || echo "")

    if [[ -n "$sso_session" ]]; then
        echo "yes"
    else
        echo "no"
    fi
}

# Get credentials and check session status using AWS CLI
check_session_via_cli() {
    local profile="$1"

    # Try to export credentials - this will fail if session is expired
    local result
    local exit_code

    result=$(aws configure export-credentials --profile "$profile" --format process 2>&1)
    exit_code=$?

    if [[ $exit_code -ne 0 ]]; then
        # Session is expired or invalid
        echo "expired:$result"
        return 0
    fi

    # Session is valid - check expiration time
    if ! command -v jq &> /dev/null; then
        echo "valid:unknown"
        return 0
    fi

    local expiration
    expiration=$(echo "$result" | jq -r '.Expiration // ""' 2>/dev/null)

    if [[ -z "$expiration" ]]; then
        echo "valid:unknown"
        return 0
    fi

    # Calculate minutes until expiration
    # AWS returns ISO8601 like: 2024-01-15T14:30:45.123Z or 2024-01-15T14:30:45+00:00
    local expires_epoch now_epoch diff_seconds diff_minutes
    local clean_date

    # Strip fractional seconds (.123) and normalize timezone
    # Convert "2024-01-15T14:30:45.123Z" -> "2024-01-15T14:30:45"
    # Handle formats: .123Z, .123+00:00, .123-08:00, Z, +00:00, -08:00
    clean_date="${expiration%%.*}"  # Strip .123Z or .123+00:00 or .123-08:00
    clean_date="${clean_date%%Z}"   # Strip trailing Z if no fractional
    clean_date="${clean_date%%+*}"  # Strip +00:00 timezone
    clean_date="${clean_date%%-[0-9][0-9]:*}"  # Strip -08:00 style timezone

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: Parse as UTC (-u flag) since AWS times are UTC
        expires_epoch=$(date -u -j -f "%Y-%m-%dT%H:%M:%S" "$clean_date" "+%s" 2>/dev/null || echo "0")
    else
        # GNU date: Append Z to indicate UTC
        expires_epoch=$(date -u -d "${clean_date}Z" "+%s" 2>/dev/null || echo "0")
    fi

    if [[ "$expires_epoch" == "0" ]]; then
        echo "valid:unknown"
        return 0
    fi

    # Compare with current UTC time
    now_epoch=$(date -u "+%s")
    diff_seconds=$((expires_epoch - now_epoch))
    diff_minutes=$((diff_seconds / 60))

    if [[ $diff_minutes -lt $WARNING_THRESHOLD_MINUTES ]]; then
        echo "expiring:$diff_minutes"
    else
        echo "valid:$diff_minutes"
    fi
}

# Main logic
main() {
    # Check if Bedrock is configured
    local profile
    if ! profile=$(get_bedrock_profile); then
        # Not using Bedrock, nothing to check
        echo '{}'
        exit 0
    fi

    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        cat << 'EOF'
{
  "hookSpecificOutput": {
    "additionalContext": "WARNING: AWS CLI not found. Cannot check SSO session status.\n\nInstall with: brew install awscli"
  }
}
EOF
        exit 0
    fi

    # Check session status via CLI
    local status
    status=$(check_session_via_cli "$profile")

    # Check if profile has refresh tokens (SSO Session format)
    local has_sso_session
    has_sso_session=$(check_has_sso_session "$profile")

    case "$status" in
        expired:*)
            local error_msg="${status#expired:}"
            cat << EOF
{
  "hookSpecificOutput": {
    "additionalContext": "WARNING: Your AWS SSO session is expired or invalid. Claude Code cannot connect to Bedrock.\n\nTo fix, run: /bedrock and select 'Refresh Auth'\n\nOr manually: aws sso login --profile $profile"
  }
}
EOF
            ;;
        expiring:*)
            local minutes="${status#expiring:}"
            cat << EOF
{
  "hookSpecificOutput": {
    "additionalContext": "NOTE: Your AWS SSO session expires in $minutes minutes. Run /bedrock and select 'Refresh Auth' to extend."
  }
}
EOF
            ;;
        valid:*)
            # Session is valid - check if using legacy format (no refresh tokens)
            if [[ "$has_sso_session" == "no" ]]; then
                local minutes="${status#valid:}"
                if [[ "$minutes" != "unknown" ]]; then
                    local time_remaining
                    if [[ $minutes -lt 60 ]]; then
                        time_remaining="${minutes}m"
                    else
                        time_remaining="$((minutes / 60))h"
                    fi
                    cat << EOF
{
  "hookSpecificOutput": {
    "additionalContext": "TIP: Your SSO session is valid (~${time_remaining} remaining) but uses legacy format (8-hour sessions).\n\nTo enable 90-day sessions, run /bedrock and select 'Reconfigure', then add scope: sso:account:access"
  }
}
EOF
                else
                    # Valid but can't determine time, and no refresh tokens
                    cat << EOF
{
  "hookSpecificOutput": {
    "additionalContext": "TIP: Your SSO profile uses legacy format (8-hour sessions).\n\nTo enable 90-day sessions, run /bedrock and select 'Reconfigure', then add scope: sso:account:access"
  }
}
EOF
                fi
            else
                # All good - valid session with SSO Session format
                echo '{}'
            fi
            ;;
        *)
            # Unknown status, silently continue
            echo '{}'
            ;;
    esac
}

main
