#!/usr/bin/env bash
#
# check-gcloud-auth.sh
# Check if gcloud application-default credentials are configured
#
# Exit codes:
#   0 - ADC is configured and valid
#   1 - ADC is not configured or expired
#   2 - Error (gcloud not available, etc.)
#
# Output:
#   On success: "valid"
#   On not configured: "not-configured"
#   On error: "error <message>"

set -euo pipefail

# Check if gcloud CLI is available
if ! command -v gcloud &> /dev/null; then
    echo "error gcloud-not-installed"
    exit 2
fi

# Try to get an access token using ADC
# This will fail if ADC is not configured
if gcloud auth application-default print-access-token &> /dev/null; then
    echo "valid"
    exit 0
else
    # Check if credentials file exists but is invalid/expired
    ADC_FILE="${HOME}/.config/gcloud/application_default_credentials.json"
    if [ -f "$ADC_FILE" ]; then
        echo "expired"
        exit 1
    else
        echo "not-configured"
        exit 1
    fi
fi
