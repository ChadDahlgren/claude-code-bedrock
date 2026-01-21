#!/usr/bin/env bash
#
# check-gcloud.sh
# Check if gcloud CLI is installed and return version
#
# Exit codes:
#   0 - gcloud CLI is installed
#   1 - gcloud CLI is not installed
#
# Output:
#   On success: "installed <version>"
#   On failure: "not-installed"

set -euo pipefail

# Check if gcloud command exists
if ! command -v gcloud &> /dev/null; then
    echo "not-installed"
    exit 1
fi

# Get gcloud version
VERSION=$(gcloud --version 2>&1 | head -1 | awk '{print $NF}')

if [ -z "$VERSION" ]; then
    echo "not-installed"
    exit 1
fi

echo "installed $VERSION"
exit 0
