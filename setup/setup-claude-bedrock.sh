#!/bin/bash
# setup-claude-bedrock.sh
# Set up Claude Code to use AWS Bedrock
#
# Run directly from GitHub:
#   bash <(curl -fsSL https://raw.githubusercontent.com/ChadDahlgren/claude-code-bedrock/main/setup/setup-claude-bedrock.sh)
#
# Or with options:
#   bash <(curl -fsSL ...) --disable

set -euo pipefail

# =============================================================================
# Constants
# =============================================================================

CLAUDE_SETTINGS_FILE="$HOME/.claude/settings.json"
CLAUDE_SETTINGS_DIR="$HOME/.claude"

# Default model configurations (global inference profiles)
DEFAULT_MODEL="global.anthropic.claude-opus-4-5-20251101-v1:0"
DEFAULT_FAST_MODEL="global.anthropic.claude-sonnet-4-5-20250929-v1:0"

# Default token settings
DEFAULT_THINKING_TOKENS="12000"
DEFAULT_OUTPUT_TOKENS="10000"

# Known Bedrock regions (in preference order)
BEDROCK_REGIONS=(
  "us-west-2"
  "us-east-1"
  "eu-west-1"
  "ap-northeast-1"
  "ap-southeast-2"
)

# =============================================================================
# Utility Functions
# =============================================================================

command_exists() {
  command -v "$1" &>/dev/null
}

get_shell_rc() {
  case "$SHELL" in
    */zsh)  echo "$HOME/.zshrc" ;;
    */bash) echo "$HOME/.bashrc" ;;
    *)      echo "$HOME/.profile" ;;
  esac
}

# =============================================================================
# UI Helpers
# =============================================================================

print_header() {
  echo ""
  echo "============================================================"
  echo "  $1"
  echo "============================================================"
  echo ""
}

print_step() {
  echo ""
  echo ">> $1"
  echo ""
}

print_success() {
  echo "   [OK] $1"
}

print_warning() {
  echo "   [!] $1"
}

print_error() {
  echo "   [ERROR] $1"
}

print_info() {
  echo "   $1"
}

confirm() {
  local prompt="$1"
  local response
  while true; do
    read -rp "$prompt [y/n]: " response
    case "$response" in
      [yY]|[yY][eE][sS]) return 0 ;;
      [nN]|[nN][oO]) return 1 ;;
      *) echo "Please answer yes or no." ;;
    esac
  done
}

prompt_input() {
  local prompt="$1"
  local default="${2:-}"
  local response

  if [[ -n "$default" ]]; then
    read -rp "$prompt [$default]: " response </dev/tty
    echo "${response:-$default}"
  else
    read -rp "$prompt: " response </dev/tty
    echo "$response"
  fi
}

select_option() {
  local prompt="$1"
  shift
  local options=("$@")

  echo "$prompt" >&2
  echo "" >&2
  local i=1
  for opt in "${options[@]}"; do
    echo "  $i) $opt" >&2
    ((i++))
  done
  echo "" >&2

  local selection
  while true; do
    read -rp "Enter number (1-${#options[@]}): " selection </dev/tty
    if [[ "$selection" =~ ^[0-9]+$ ]] && (( selection >= 1 && selection <= ${#options[@]} )); then
      echo "${options[$((selection-1))]}"
      return 0
    fi
    echo "Invalid selection. Please try again." >&2
  done
}

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_homebrew() {
  [[ "$(uname)" != "Darwin" ]] && return 0
  command_exists brew
}

install_homebrew() {
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
}

check_aws_cli() {
  if ! command_exists aws; then
    return 1
  fi
  local version
  version=$(aws --version 2>&1 | grep -oE 'aws-cli/[0-9]+' | cut -d/ -f2)
  [[ "$version" -ge 2 ]]
}

install_aws_cli() {
  if [[ "$(uname)" == "Darwin" ]]; then
    brew install awscli
  else
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q /tmp/awscliv2.zip -d /tmp
    sudo /tmp/aws/install
    rm -rf /tmp/awscliv2.zip /tmp/aws
  fi
}

check_claude_code() {
  command_exists claude
}

install_claude_code() {
  if [[ "$(uname)" == "Darwin" ]]; then
    brew install claude-code
  else
    npm install -g @anthropic-ai/claude-code
  fi
}

# =============================================================================
# AWS Profile Functions
# =============================================================================

get_aws_profiles() {
  aws configure list-profiles 2>/dev/null || echo ""
}

get_profile_region() {
  local profile="$1"
  aws configure get region --profile "$profile" 2>/dev/null || echo ""
}

check_profile_credentials() {
  local profile="$1"
  aws sts get-caller-identity --profile "$profile" &>/dev/null
}

get_sso_session_info() {
  local profile="$1"
  local config_file="$HOME/.aws/config"

  if [[ ! -f "$config_file" ]]; then
    echo "|none|false"
    return
  fi

  local sso_session
  sso_session=$(aws configure get sso_session --profile "$profile" 2>/dev/null) || sso_session=""

  if [[ -z "$sso_session" ]]; then
    local sso_url
    sso_url=$(aws configure get sso_start_url --profile "$profile" 2>/dev/null) || sso_url=""
    if [[ -n "$sso_url" ]]; then
      echo "|legacy|false"
    else
      echo "|none|false"
    fi
    return
  fi

  local scope_line
  scope_line=$(grep -A10 "^\[sso-session $sso_session\]" "$config_file" 2>/dev/null | grep "sso_registration_scopes" | head -1) || scope_line=""

  if [[ "$scope_line" == *"sso:account:access"* ]]; then
    echo "$sso_session|modern|true"
  else
    echo "$sso_session|modern|false"
  fi
}

fix_sso_session_scope() {
  local profile="$1"
  local config_file="$HOME/.aws/config"

  [[ ! -f "$config_file" ]] && return 1

  local info
  info=$(get_sso_session_info "$profile")
  local session_name format has_scope
  IFS='|' read -r session_name format has_scope <<< "$info"

  [[ "$format" == "legacy" ]] && return 2
  [[ "$format" == "none" ]] && return 1
  [[ "$has_scope" == "true" ]] && return 0

  cp "$config_file" "${config_file}.backup"

  if grep -q "^\[sso-session $session_name\]" "$config_file"; then
    local in_session=false
    local found_scope=false
    local temp_file="${config_file}.tmp"

    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^\[sso-session\ $session_name\] ]]; then
        in_session=true
        echo "$line" >> "$temp_file"
      elif [[ "$line" =~ ^\[.*\] ]]; then
        if $in_session && ! $found_scope; then
          echo "sso_registration_scopes = sso:account:access" >> "$temp_file"
        fi
        in_session=false
        echo "$line" >> "$temp_file"
      elif $in_session && [[ "$line" =~ ^sso_registration_scopes ]]; then
        echo "sso_registration_scopes = sso:account:access" >> "$temp_file"
        found_scope=true
      else
        echo "$line" >> "$temp_file"
      fi
    done < "$config_file"

    if $in_session && ! $found_scope; then
      echo "sso_registration_scopes = sso:account:access" >> "$temp_file"
    fi

    mv "$temp_file" "$config_file"
  fi

  return 0
}

convert_legacy_to_modern() {
  local profile="$1"
  local config_file="$HOME/.aws/config"

  local sso_url sso_region sso_account sso_role region
  sso_url=$(aws configure get sso_start_url --profile "$profile" 2>/dev/null) || return 1
  sso_region=$(aws configure get sso_region --profile "$profile" 2>/dev/null) || sso_region="us-east-1"
  sso_account=$(aws configure get sso_account_id --profile "$profile" 2>/dev/null) || sso_account=""
  sso_role=$(aws configure get sso_role_name --profile "$profile" 2>/dev/null) || sso_role=""
  region=$(aws configure get region --profile "$profile" 2>/dev/null) || region=""

  [[ -z "$sso_url" ]] && return 1

  cp "$config_file" "${config_file}.backup"

  local session_name="${profile}-session"

  if ! grep -q "^\[sso-session $session_name\]" "$config_file"; then
    cat >> "$config_file" <<EOF

[sso-session $session_name]
sso_start_url = $sso_url
sso_region = $sso_region
sso_registration_scopes = sso:account:access
EOF
  fi

  local temp_file="${config_file}.tmp"
  local in_profile=false
  local wrote_session=false

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^\[profile\ $profile\] ]]; then
      in_profile=true
      echo "$line" >> "$temp_file"
    elif [[ "$line" =~ ^\[.*\] ]]; then
      in_profile=false
      echo "$line" >> "$temp_file"
    elif $in_profile; then
      if [[ "$line" =~ ^sso_start_url ]] || [[ "$line" =~ ^sso_region ]]; then
        if ! $wrote_session; then
          echo "sso_session = $session_name" >> "$temp_file"
          wrote_session=true
        fi
      else
        echo "$line" >> "$temp_file"
      fi
    else
      echo "$line" >> "$temp_file"
    fi
  done < "$config_file"

  mv "$temp_file" "$config_file"
  return 0
}

run_sso_login() {
  local profile="$1"
  aws sso login --profile "$profile"
}

check_bedrock_access() {
  local profile="$1"
  local region="${2:-}"

  [[ -z "$region" ]] && region=$(get_profile_region "$profile")
  [[ -z "$region" ]] && return 1

  aws bedrock list-inference-profiles \
    --profile "$profile" \
    --region "$region" \
    --max-results 1 \
    &>/dev/null
}

find_bedrock_region() {
  local profile="$1"
  local profile_region
  profile_region=$(get_profile_region "$profile")

  if [[ -n "$profile_region" ]] && check_bedrock_access "$profile" "$profile_region"; then
    echo "$profile_region"
    return 0
  fi

  for region in "${BEDROCK_REGIONS[@]}"; do
    if check_bedrock_access "$profile" "$region"; then
      echo "$region"
      return 0
    fi
  done

  return 1
}

# =============================================================================
# Claude Code Configuration
# =============================================================================

write_claude_settings() {
  local profile="$1"
  local region="$2"
  local model="${3:-$DEFAULT_MODEL}"
  local fast_model="${4:-$DEFAULT_FAST_MODEL}"
  local thinking_tokens="${5:-$DEFAULT_THINKING_TOKENS}"
  local output_tokens="${6:-$DEFAULT_OUTPUT_TOKENS}"

  mkdir -p "$CLAUDE_SETTINGS_DIR"

  local settings
  settings=$(cat <<EOF
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "$profile",
    "AWS_REGION": "$region",
    "ANTHROPIC_MODEL": "$model",
    "CLAUDE_CODE_FAST_MODEL": "$fast_model",
    "MAX_THINKING_TOKENS": "$thinking_tokens",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "$output_tokens",
    "DISABLE_PROMPT_CACHING": "0"
  }
}
EOF
)

  if [[ -f "$CLAUDE_SETTINGS_FILE" ]]; then
    cp "$CLAUDE_SETTINGS_FILE" "${CLAUDE_SETTINGS_FILE}.backup"
    if command_exists jq; then
      local existing
      existing=$(cat "$CLAUDE_SETTINGS_FILE")
      echo "$existing" | jq --argjson new "$settings" '. * $new' > "${CLAUDE_SETTINGS_FILE}.tmp"
      mv "${CLAUDE_SETTINGS_FILE}.tmp" "$CLAUDE_SETTINGS_FILE"
    else
      echo "$settings" > "$CLAUDE_SETTINGS_FILE"
    fi
  else
    echo "$settings" > "$CLAUDE_SETTINGS_FILE"
  fi
}

remove_bedrock_settings() {
  [[ ! -f "$CLAUDE_SETTINGS_FILE" ]] && return 0

  cp "$CLAUDE_SETTINGS_FILE" "${CLAUDE_SETTINGS_FILE}.backup"

  if command_exists jq; then
    local existing
    existing=$(cat "$CLAUDE_SETTINGS_FILE")
    echo "$existing" | jq 'del(.env.CLAUDE_CODE_USE_BEDROCK, .env.AWS_PROFILE, .env.AWS_REGION, .env.ANTHROPIC_MODEL, .env.CLAUDE_CODE_FAST_MODEL, .env.MAX_THINKING_TOKENS, .env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, .env.DISABLE_PROMPT_CACHING)' > "${CLAUDE_SETTINGS_FILE}.tmp"
    mv "${CLAUDE_SETTINGS_FILE}.tmp" "$CLAUDE_SETTINGS_FILE"
    return 0
  else
    echo "Warning: jq not installed, cannot cleanly remove settings. Please edit $CLAUDE_SETTINGS_FILE manually."
    return 1
  fi
}

is_bedrock_enabled() {
  [[ ! -f "$CLAUDE_SETTINGS_FILE" ]] && return 1

  if command_exists jq; then
    local use_bedrock
    use_bedrock=$(jq -r '.env.CLAUDE_CODE_USE_BEDROCK // "0"' "$CLAUDE_SETTINGS_FILE" 2>/dev/null)
    [[ "$use_bedrock" == "1" ]]
  else
    grep -q '"CLAUDE_CODE_USE_BEDROCK".*"1"' "$CLAUDE_SETTINGS_FILE" 2>/dev/null
  fi
}

# =============================================================================
# Command-line Arguments
# =============================================================================

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Set up Claude Code to use AWS Bedrock.

Options:
  --disable     Disable Bedrock and revert to Anthropic API
  --help, -h    Show this help message

Run directly from GitHub:
  bash <(curl -fsSL https://raw.githubusercontent.com/ChadDahlgren/claude-code-bedrock/main/setup/setup-claude-bedrock.sh)

Examples:
  $(basename "$0")           # Run interactive setup
  $(basename "$0") --disable # Disable Bedrock integration
EOF
}

disable_bedrock() {
  print_header "Disable Bedrock Integration"

  if ! is_bedrock_enabled; then
    print_info "Bedrock is not currently enabled."
    exit 0
  fi

  print_info "This will remove Bedrock configuration from Claude Code."
  print_info "Claude will revert to using the Anthropic API directly."
  echo ""

  if confirm "Disable Bedrock integration?"; then
    if remove_bedrock_settings; then
      print_success "Bedrock configuration removed"
      print_info "Claude Code will now use the Anthropic API."
      print_info "You'll need an ANTHROPIC_API_KEY in your environment or settings."
      echo ""
      print_info "Backup saved to: ${CLAUDE_SETTINGS_FILE}.backup"
    else
      print_error "Failed to remove Bedrock settings"
      exit 1
    fi
  else
    print_info "Cancelled."
  fi
}

# =============================================================================
# SSO Scope Configuration
# =============================================================================

check_and_configure_sso_scope() {
  local profile="$1"

  local info
  info=$(get_sso_session_info "$profile")
  local session_name format has_scope
  IFS='|' read -r session_name format has_scope <<< "$info"

  local current_type=""
  if [[ "$format" == "none" ]]; then
    print_info "Profile does not use SSO authentication"
    return
  elif [[ "$format" == "legacy" ]]; then
    current_type="8-hour sessions (legacy format)"
  elif [[ "$has_scope" == "true" ]]; then
    current_type="90-day sessions (refresh tokens)"
  else
    current_type="8-hour sessions (missing scope)"
  fi

  print_info "Current SSO configuration: $current_type"
  echo ""

  local choice
  choice=$(select_option "Which session duration would you like?" \
    "90-day sessions (recommended - less frequent logins)" \
    "8-hour sessions (current default)")

  if [[ "$choice" == *"90-day"* ]]; then
    if [[ "$has_scope" == "true" ]]; then
      print_success "Already configured for 90-day sessions"
    elif [[ "$format" == "legacy" ]]; then
      print_info "Converting to modern SSO format with 90-day sessions..."
      if convert_legacy_to_modern "$profile"; then
        print_success "Updated to 90-day sessions"
        print_info "You'll need to re-authenticate: aws sso login --profile $profile"
        echo ""
        if confirm "Run SSO login now?"; then
          run_sso_login "$profile"
        fi
      else
        print_warning "Could not automatically update. Please update ~/.aws/config manually."
        print_info "Add 'sso_registration_scopes = sso:account:access' to your sso-session block"
      fi
    else
      print_info "Adding refresh token scope..."
      if fix_sso_session_scope "$profile"; then
        print_success "Updated to 90-day sessions"
        print_info "You'll need to re-authenticate: aws sso login --profile $profile"
        echo ""
        if confirm "Run SSO login now?"; then
          run_sso_login "$profile"
        fi
      else
        print_warning "Could not automatically update. Please update ~/.aws/config manually."
        print_info "Add 'sso_registration_scopes = sso:account:access' to your sso-session block"
      fi
    fi
  else
    print_info "Keeping current session configuration"
  fi
}

# =============================================================================
# New Profile Setup
# =============================================================================

setup_new_profile() {
  echo ""
  print_info "We'll now run 'aws configure sso' to set up your AWS profile."
  echo ""
  echo "------------------------------------------------------------"
  echo "  When prompted, use these values:"
  echo ""
  echo "    SSO session name:          bedrock"
  echo "    SSO registration scopes:   sso:account:access"
  echo ""
  echo "  The scope gives you 90-day sessions instead of 8-hour."
  echo "  The session name can be anything you like."
  echo "------------------------------------------------------------"
  echo ""

  if ! confirm "Ready to start AWS SSO configuration?"; then
    print_info "Setup cancelled."
    exit 0
  fi

  echo ""
  aws configure sso

  echo ""
  print_success "SSO configuration complete"
  echo ""

  local profiles
  profiles=$(get_aws_profiles)

  if [[ -z "$profiles" ]]; then
    print_error "No profiles found after configuration. Please try again."
    exit 1
  fi

  local profile_array
  IFS=$'\n' read -rd '' -a profile_array <<<"$profiles" || true

  selected_profile=$(select_option "Which profile did you just configure?" "${profile_array[@]}")
  print_info "Using profile: $selected_profile"

  selected_region=$(get_profile_region "$selected_profile")
  if [[ -z "$selected_region" ]]; then
    selected_region=$(prompt_input "Enter the AWS region for Bedrock" "us-west-2")
    aws configure set region "$selected_region" --profile "$selected_profile"
  fi
}

# =============================================================================
# Main Setup Flow
# =============================================================================

main() {
  print_header "Claude Code + AWS Bedrock Setup"

  echo "This script will help you set up Claude Code to use AWS Bedrock."
  echo "You'll need:"
  echo "  - Your AWS SSO URL (from your IT team)"
  echo "  - A few minutes to complete browser authentication"
  echo ""

  if ! confirm "Ready to begin?"; then
    echo "Setup cancelled."
    exit 0
  fi

  # Step 1: Check Prerequisites
  print_step "Step 1: Checking prerequisites..."

  if [[ "$(uname)" == "Darwin" ]]; then
    if check_homebrew; then
      print_success "Homebrew installed"
    else
      print_warning "Homebrew not found"
      if confirm "Install Homebrew?"; then
        install_homebrew
        print_success "Homebrew installed"
      else
        print_error "Homebrew is required on macOS. Exiting."
        exit 1
      fi
    fi
  fi

  if check_aws_cli; then
    print_success "AWS CLI v2 installed"
  else
    print_warning "AWS CLI v2 not found"
    if confirm "Install AWS CLI?"; then
      install_aws_cli
      print_success "AWS CLI installed"
    else
      print_error "AWS CLI is required. Exiting."
      exit 1
    fi
  fi

  if check_claude_code; then
    print_success "Claude Code installed"
  else
    print_warning "Claude Code not found"
    if confirm "Install Claude Code?"; then
      install_claude_code
      print_success "Claude Code installed"

      local shell_rc
      shell_rc=$(get_shell_rc)
      if [[ -f "$shell_rc" ]]; then
        print_info "Sourcing $shell_rc to update PATH..."
        # shellcheck disable=SC1090
        source "$shell_rc" 2>/dev/null || true
      fi
    else
      print_error "Claude Code is required. Exiting."
      exit 1
    fi
  fi

  # Step 2: AWS Profile Setup
  print_step "Step 2: Configuring AWS profile..."

  local profiles
  profiles=$(get_aws_profiles)

  # Declare these as local but set them in subroutines
  local selected_profile=""
  local selected_region=""

  if [[ -n "$profiles" ]]; then
    print_info "Found existing AWS profiles."
    echo ""

    local profile_array
    IFS=$'\n' read -rd '' -a profile_array <<<"$profiles" || true

    local choice
    choice=$(select_option "Would you like to:" "Use an existing profile" "Configure a new profile")

    if [[ "$choice" == "Use an existing profile" ]]; then
      selected_profile=$(select_option "Select a profile:" "${profile_array[@]}")
      print_info "Selected profile: $selected_profile"

      print_info "Checking credentials..."
      if ! check_profile_credentials "$selected_profile"; then
        print_warning "Credentials expired or invalid. Running SSO login..."
        run_sso_login "$selected_profile"
      else
        print_success "Credentials valid"
      fi

      check_and_configure_sso_scope "$selected_profile"

      selected_region=$(get_profile_region "$selected_profile")
      if [[ -z "$selected_region" ]]; then
        selected_region=$(prompt_input "Enter AWS region" "us-west-2")
      else
        print_info "Profile region: $selected_region"
      fi
    else
      setup_new_profile
    fi
  else
    print_info "No AWS profiles found. Let's configure one."
    setup_new_profile
  fi

  # Step 3: Verify Bedrock Access
  print_step "Step 3: Verifying Bedrock access..."

  if check_bedrock_access "$selected_profile" "$selected_region"; then
    print_success "Bedrock access confirmed in $selected_region"
  else
    print_warning "Bedrock not accessible in $selected_region"
    print_info "Searching for a region with Bedrock access..."

    local found_region
    found_region=$(find_bedrock_region "$selected_profile") || true

    if [[ -n "$found_region" ]]; then
      print_info "Found Bedrock access in: $found_region"
      if confirm "Use $found_region instead?"; then
        selected_region="$found_region"
      else
        print_error "Cannot proceed without Bedrock access."
        exit 1
      fi
    else
      print_error "Could not find Bedrock access in any region."
      print_info "Please contact your AWS administrator to enable Bedrock access."
      exit 1
    fi
  fi

  # Step 4: Configure Claude Code
  print_step "Step 4: Configuring Claude Code..."

  print_info "Setting up with:"
  print_info "  Profile: $selected_profile"
  print_info "  Region: $selected_region"
  print_info "  Model: Claude Opus 4.5 (global)"
  print_info "  Fast Model: Claude Sonnet 4.5 (global)"
  print_info "  Thinking Tokens: 12,000"
  print_info "  Output Tokens: 10,000"
  echo ""

  if confirm "Apply these settings?"; then
    write_claude_settings \
      "$selected_profile" \
      "$selected_region" \
      "$DEFAULT_MODEL" \
      "$DEFAULT_FAST_MODEL" \
      "$DEFAULT_THINKING_TOKENS" \
      "$DEFAULT_OUTPUT_TOKENS"

    print_success "Settings written to $CLAUDE_SETTINGS_FILE"
  else
    print_info "Setup cancelled."
    exit 0
  fi

  # Step 5: Final Instructions
  cat <<'EOF'

============================================================
  Claude Code is configured for AWS Bedrock!
============================================================

Quick tips:

  Thinking tokens (12,000): Controls reasoning depth.
    - Range: 4,096 - 16,384
    - Lower = faster, simpler responses
    - Higher = deeper analysis (may over-engineer simple tasks)

  Output tokens (10,000): Maximum response length.
    - Range: 4,096 - 16,384
    - Increase if responses feel cut off

  Edit ~/.claude/settings.json to adjust these values.

------------------------------------------------------------

  Run 'claude' to get started!

============================================================

EOF
}

# =============================================================================
# Entry Point
# =============================================================================

while [[ $# -gt 0 ]]; do
  case "$1" in
    --disable)
      disable_bedrock
      exit 0
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
  shift
done

main "$@"
