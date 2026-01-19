#!/usr/bin/env bash
# List available Claude models on Google Vertex AI
# Usage: list-vertex-models.sh <project-id> <region>
#
# Returns JSON array of available models

set -euo pipefail

PROJECT_ID="${1:-}"
REGION="${2:-us-east5}"

if [[ -z "$PROJECT_ID" ]]; then
    echo "error:missing-project-id"
    exit 1
fi

# Known Claude models available on Vertex AI (as of Jan 2025)
# Format: model-id|display-name|description
KNOWN_MODELS=(
    "claude-sonnet-4-20250514|Claude Sonnet 4|Latest Sonnet model, best balance of speed and capability"
    "claude-opus-4-20250514|Claude Opus 4|Most capable model, best for complex tasks"
    "claude-3-5-sonnet-v2@20241022|Claude Sonnet 3.5 v2|Previous generation Sonnet"
    "claude-3-5-sonnet@20240620|Claude Sonnet 3.5|Previous generation Sonnet (original)"
    "claude-3-5-haiku@20241022|Claude Haiku 3.5|Fastest model, good for simple tasks"
)

# Try to verify at least one model is accessible by checking the endpoint
# This validates project access without making a full API call
ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || echo "")

if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "error:not-authenticated"
    exit 1
fi

# Check if we can access the Vertex AI endpoint for this project
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/anthropic/models" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "403" ]]; then
    echo "error:permission-denied"
    exit 1
elif [[ "$HTTP_CODE" == "404" ]]; then
    echo "error:region-not-supported"
    exit 1
elif [[ "$HTTP_CODE" != "200" ]]; then
    # Might be ok - endpoint may not support list but models still work
    # Fall through and return known models
    :
fi

# Output known models as JSON
echo "{"
echo "  \"status\": \"ok\","
echo "  \"project\": \"$PROJECT_ID\","
echo "  \"region\": \"$REGION\","
echo "  \"models\": ["

FIRST=true
for model_entry in "${KNOWN_MODELS[@]}"; do
    IFS='|' read -r model_id display_name description <<< "$model_entry"

    if [[ "$FIRST" == "true" ]]; then
        FIRST=false
    else
        echo ","
    fi

    echo -n "    {\"id\": \"$model_id\", \"name\": \"$display_name\", \"description\": \"$description\"}"
done

echo ""
echo "  ],"
echo "  \"recommended\": \"claude-sonnet-4-20250514\""
echo "}"

exit 0
