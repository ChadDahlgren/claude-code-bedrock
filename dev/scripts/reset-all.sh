#!/bin/bash
#
# Reset ALL provider configurations for testing the setup flow
# Runs both AWS Bedrock and Google Vertex reset scripts
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Resetting ALL Provider Configurations ==="
echo ""

"$SCRIPT_DIR/reset-aws-bedrock.sh"
echo ""
"$SCRIPT_DIR/reset-google-vertex.sh"
