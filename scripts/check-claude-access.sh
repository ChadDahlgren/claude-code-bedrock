#!/usr/bin/env bash
# Check if Claude models are accessible on Vertex AI for a project/region
# Usage: check-claude-access.sh <project-id> <region>
#
# Returns:
#   "ok" - Claude models are accessible
#   "not-enabled" - Claude models need to be enabled in Model Garden
#   "auth-error" - Authentication issue
#   "error:<message>" - Other error

set -euo pipefail

PROJECT_ID="${1:-}"
REGION="${2:-us-east5}"

if [[ -z "$PROJECT_ID" ]]; then
    echo "error:missing-project-id"
    exit 1
fi

# Get access token
ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || echo "")

if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "auth-error"
    exit 1
fi

# Use global endpoint for Claude 4.5+ models
ENDPOINT="https://global-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/publishers/anthropic/models/claude-sonnet-4-5@20250929:rawPredict"

# Try a minimal API call to see if we have access
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "$ENDPOINT" \
    -d '{"anthropic_version":"vertex-2023-10-16","messages":[{"role":"user","content":"hi"}],"max_tokens":1}' 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

case "$HTTP_CODE" in
    200)
        echo "ok"
        ;;
    404)
        # Model not found - need to enable in Model Garden
        echo "not-enabled"
        ;;
    403)
        # Permission denied
        if echo "$BODY" | grep -q "does not have access"; then
            echo "not-enabled"
        else
            echo "permission-denied"
        fi
        ;;
    401)
        echo "auth-error"
        ;;
    *)
        echo "error:$HTTP_CODE"
        ;;
esac

exit 0
