#!/usr/bin/env bash
#
# parse-aws-profiles.sh
# Parse AWS SSO profiles from ~/.aws/config
#
# Exit codes:
#   0 - Profiles found
#   1 - No profiles found or error reading config
#
# Output:
#   JSON array of profiles with name, sso_region, and region
#   Example: [{"name":"dev","sso_region":"us-east-1","region":"us-west-2"}]

set -euo pipefail

CONFIG_FILE="${HOME}/.aws/config"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "[]"
    exit 1
fi

# Parse profiles with SSO configuration
# We look for profiles that have sso_start_url (indicating SSO setup)
profiles=()
current_profile=""
sso_region=""
region=""
has_sso=false

while IFS= read -r line; do
    # Match profile header: [profile name] or [default]
    if [[ $line =~ ^\[profile\ (.+)\]$ ]]; then
        # Save previous profile if it had SSO
        if [ -n "$current_profile" ] && [ "$has_sso" = true ]; then
            profiles+=("{\"name\":\"$current_profile\",\"sso_region\":\"$sso_region\",\"region\":\"$region\"}")
        fi

        # Start new profile
        current_profile="${BASH_REMATCH[1]}"
        sso_region=""
        region=""
        has_sso=false
    elif [[ $line =~ ^sso_start_url ]]; then
        has_sso=true
    elif [[ $line =~ ^sso_region[[:space:]]*=[[:space:]]*(.+)$ ]]; then
        sso_region="${BASH_REMATCH[1]}"
    elif [[ $line =~ ^region[[:space:]]*=[[:space:]]*(.+)$ ]]; then
        region="${BASH_REMATCH[1]}"
    fi
done < "$CONFIG_FILE"

# Don't forget the last profile
if [ -n "$current_profile" ] && [ "$has_sso" = true ]; then
    profiles+=("{\"name\":\"$current_profile\",\"sso_region\":\"$sso_region\",\"region\":\"$region\"}")
fi

# Output JSON array
if [ ${#profiles[@]} -eq 0 ]; then
    echo "[]"
    exit 1
else
    echo -n "["
    for i in "${!profiles[@]}"; do
        echo -n "${profiles[$i]}"
        if [ $i -lt $((${#profiles[@]} - 1)) ]; then
            echo -n ","
        fi
    done
    echo "]"
    exit 0
fi
