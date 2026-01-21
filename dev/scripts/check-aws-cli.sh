#!/usr/bin/env bash
#
# check-aws-cli.sh
# Check if AWS CLI is installed and return version
#
# Exit codes:
#   0 - AWS CLI is installed
#   1 - AWS CLI is not installed
#
# Output:
#   On success: "installed <version>"
#   On failure: "not-installed"

set -euo pipefail

# Check if aws command exists
if ! command -v aws &> /dev/null; then
    echo "not-installed"
    exit 1
fi

# Get AWS CLI version
VERSION=$(aws --version 2>&1 | awk '{print $1}' | cut -d'/' -f2)

if [ -z "$VERSION" ]; then
    echo "not-installed"
    exit 1
fi

echo "installed $VERSION"
exit 0
