#!/usr/bin/env bash
#
# get-gcloud-projects.sh
# Get list of Google Cloud projects the user has access to
#
# Exit codes:
#   0 - Projects found
#   1 - No projects found or error
#
# Output:
#   JSON array of projects with id and name
#   Example: [{"id":"my-project-123","name":"My Project"}]

set -euo pipefail

# Check if gcloud CLI is available
if ! command -v gcloud &> /dev/null; then
    echo "[]"
    exit 1
fi

# Check if authenticated
if ! gcloud auth application-default print-access-token &> /dev/null; then
    echo "[]"
    exit 1
fi

# Get projects list in JSON format
# Filter to only show PROJECT_ID and NAME
PROJECTS_JSON=$(gcloud projects list --format="json" 2>/dev/null || echo "[]")

# Transform to our simpler format using Python
python3 << 'EOF' "$PROJECTS_JSON"
import json
import sys

try:
    projects = json.loads(sys.argv[1])

    # Transform to simpler format
    result = []
    for project in projects:
        result.append({
            "id": project.get("projectId", ""),
            "name": project.get("name", "")
        })

    print(json.dumps(result))
    sys.exit(0)

except Exception as e:
    print("[]")
    sys.exit(1)
EOF
