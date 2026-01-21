#!/usr/bin/env bash
#
# check-sso-session.sh <profile-name>
# Check if AWS SSO session is valid for the given profile
#
# Exit codes:
#   0 - Session is valid
#   1 - Session is expired
#   2 - Error (profile not found, CLI not available, etc.)
#
# Output:
#   On success: "valid <seconds-remaining>"
#   On expired: "expired"
#   On error: "error <message>"

set -euo pipefail

# Check argument
if [ $# -ne 1 ]; then
    echo "error missing-profile-argument"
    exit 2
fi

PROFILE="$1"

# Check if aws CLI is available
if ! command -v aws &> /dev/null; then
    echo "error aws-cli-not-installed"
    exit 2
fi

# Try to get caller identity (this will fail if session is expired)
if ! aws sts get-caller-identity --profile "$PROFILE" &> /dev/null; then
    echo "expired"
    exit 1
fi

# Session is valid, now try to get expiration time from cache
# SSO cache files are in ~/.aws/sso/cache/
CACHE_DIR="${HOME}/.aws/sso/cache"

if [ ! -d "$CACHE_DIR" ]; then
    # Valid session but can't determine expiration
    echo "valid 0"
    exit 0
fi

# Find the most recent cache file
LATEST_CACHE=$(find "$CACHE_DIR" -name "*.json" -type f -exec stat -f "%m %N" {} \; 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST_CACHE" ]; then
    # Valid session but can't determine expiration
    echo "valid 0"
    exit 0
fi

# Extract expiration time using Python (more reliable than jq which may not be installed)
EXPIRES_AT=$(python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$LATEST_CACHE', 'r') as f:
        data = json.load(f)
        if 'expiresAt' in data:
            # Parse ISO 8601 format
            expires = datetime.fromisoformat(data['expiresAt'].replace('Z', '+00:00'))
            now = datetime.now(expires.tzinfo)
            remaining = int((expires - now).total_seconds())
            if remaining > 0:
                print(remaining)
            else:
                print(0)
        else:
            print(0)
except Exception:
    print(0)
" 2>/dev/null)

if [ -z "$EXPIRES_AT" ] || [ "$EXPIRES_AT" = "0" ]; then
    # Can't determine expiration time, but session is valid
    echo "valid 0"
    exit 0
fi

echo "valid $EXPIRES_AT"
exit 0
