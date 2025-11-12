#!/usr/bin/env bash

#
# sync-portainer-config.sh
#
# Automatically syncs Docker stacks from /dev/infra/stacks to Portainer config.example.json
# - Detects new stacks and containers
# - Auto-detects hybrid stacks (those with depends_on relationships)
# - Skips existing entries
# - Dry-run by default, requires --apply to modify files
#

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_STACKS_PATH="/Users/suman/dev/infra/stacks"
CONFIG_PATH="$PROJECT_ROOT/apps/portainer/config.example.json"

# Modes
DRY_RUN=true

# Parse arguments
for arg in "$@"; do
  case $arg in
    --apply)
      DRY_RUN=false
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--dry-run|--apply]"
      echo ""
      echo "Syncs Docker stacks from $INFRA_STACKS_PATH to Portainer config"
      echo ""
      echo "Options:"
      echo "  --dry-run    Show what would be added (default)"
      echo "  --apply      Actually update the config file"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check dependencies
check_dependencies() {
  local missing=()

  if ! command -v yq &> /dev/null; then
    missing+=("yq")
  fi

  if ! command -v jq &> /dev/null; then
    missing+=("jq")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required dependencies: ${missing[*]}${NC}"
    echo "Install with: brew install ${missing[*]}"
    exit 1
  fi
}

# Check if webhook exists in config
# Args: $1=type, $2=stack, $3=image (optional), $4=container_name (optional)
webhook_exists() {
  local type="$1"
  local stack="$2"
  local image="${3:-}"
  local container_name="${4:-}"

  if [ "$type" == "stack" ]; then
    # Check for stack webhook
    jq -e --arg stack "$stack" \
      '.webhooks[] | select(.type == "stack" and .stack == $stack)' \
      "$CONFIG_PATH" > /dev/null 2>&1
  else
    # Check for container webhook (match by stack + image OR stack + container_name)
    if [ -n "$image" ]; then
      jq -e --arg stack "$stack" --arg image "$image" \
        '.webhooks[] | select(.type == "container" and .stack == $stack and .image == $image)' \
        "$CONFIG_PATH" > /dev/null 2>&1
    elif [ -n "$container_name" ]; then
      jq -e --arg stack "$stack" --arg container_name "$container_name" \
        '.webhooks[] | select(.type == "container" and .stack == $stack and .container_name == $container_name)' \
        "$CONFIG_PATH" > /dev/null 2>&1
    else
      return 1
    fi
  fi
}

# Check if docker-compose has any depends_on relationships
has_dependencies() {
  local compose_file="$1"
  yq eval '.services.*.depends_on' "$compose_file" 2>/dev/null | grep -v '^null$' | grep -v '^---$' > /dev/null 2>&1
}

# Main logic
main() {
  echo -e "${BLUE}=== Portainer Config Sync ===${NC}"
  echo ""

  # Check dependencies
  check_dependencies

  # Validate paths
  if [ ! -d "$INFRA_STACKS_PATH" ]; then
    echo -e "${RED}Error: Infrastructure stacks path not found: $INFRA_STACKS_PATH${NC}"
    exit 1
  fi

  if [ ! -f "$CONFIG_PATH" ]; then
    echo -e "${RED}Error: Config file not found: $CONFIG_PATH${NC}"
    exit 1
  fi

  echo "Scanning stacks in: $INFRA_STACKS_PATH"
  echo "Config file: $CONFIG_PATH"
  echo ""

  if $DRY_RUN; then
    echo -e "${YELLOW}Mode: DRY RUN (use --apply to modify config)${NC}"
  else
    echo -e "${GREEN}Mode: APPLY (will modify config)${NC}"
  fi
  echo ""

  # Array to store new webhooks
  declare -a new_webhooks=()

  # Scan each stack folder
  for stack_dir in "$INFRA_STACKS_PATH"/*; do
    if [ ! -d "$stack_dir" ]; then
      continue
    fi

    stack_name="$(basename "$stack_dir")"
    compose_file="$stack_dir/docker-compose.yml"

    # Check if docker-compose.yml exists
    if [ ! -f "$compose_file" ]; then
      echo -e "${YELLOW}⚠ Skipping $stack_name: no docker-compose.yml found${NC}"
      continue
    fi

    echo -e "${BLUE}Analyzing stack: $stack_name${NC}"

    # Check if stack has dependencies
    is_hybrid=false
    if has_dependencies "$compose_file"; then
      is_hybrid=true
      echo "  └─ Detected dependencies → hybrid stack (will add stack webhook)"
    fi

    # Add stack-level webhook for hybrid stacks
    if $is_hybrid; then
      if webhook_exists "stack" "$stack_name"; then
        echo -e "  └─ ${YELLOW}Stack webhook already exists (skipped)${NC}"
      else
        echo -e "  └─ ${GREEN}✓ Will add stack webhook${NC}"
        new_webhooks+=("STACK|$stack_name")
      fi
    fi

    # Parse services from docker-compose
    services=$(yq eval '.services | keys | .[]' "$compose_file" 2>/dev/null)

    if [ -z "$services" ]; then
      echo "  └─ No services found"
      continue
    fi

    # Process each service
    while IFS= read -r service; do
      # Extract image and container_name
      image=$(yq eval ".services.$service.image" "$compose_file" 2>/dev/null)
      container_name=$(yq eval ".services.$service.container_name // \"$service\"" "$compose_file" 2>/dev/null)

      # Skip if no image defined
      if [ "$image" == "null" ] || [ -z "$image" ]; then
        echo "  └─ $service: no image defined (skipped)"
        continue
      fi

      # Check if webhook already exists
      if webhook_exists "container" "$stack_name" "$image" "$container_name"; then
        echo -e "  └─ $service: ${YELLOW}already exists (skipped)${NC}"
      else
        echo -e "  └─ $service: ${GREEN}✓ will add container webhook${NC}"
        new_webhooks+=("CONTAINER|$stack_name|$service|$image|$container_name")
      fi

    done <<< "$services"

    echo ""
  done

  # Summary
  echo -e "${BLUE}=== Summary ===${NC}"
  echo "Total new webhooks to add: ${#new_webhooks[@]}"
  echo ""

  if [ ${#new_webhooks[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ Config is up to date, nothing to add${NC}"
    exit 0
  fi

  # Show what will be added
  echo "New webhooks:"
  for webhook in "${new_webhooks[@]}"; do
    IFS='|' read -r type stack service image container_name <<< "$webhook"
    if [ "$type" == "STACK" ]; then
      echo -e "  ${GREEN}+ Stack webhook: $stack${NC}"
    else
      echo -e "  ${GREEN}+ Container: $stack/$service${NC}"
      echo "    └─ image: $image"
      echo "    └─ container: $container_name"
    fi
  done
  echo ""

  # Apply changes if not dry-run
  if ! $DRY_RUN; then
    echo -e "${BLUE}Applying changes...${NC}"

    # Create a temporary file to build the new webhooks array
    temp_webhooks=$(mktemp)
    echo "[]" > "$temp_webhooks"

    # Add each new webhook to the array
    for webhook in "${new_webhooks[@]}"; do
      IFS='|' read -r type stack service image container_name <<< "$webhook"

      if [ "$type" == "STACK" ]; then
        # Add stack webhook
        jq --arg name "$stack Stack" \
           --arg stack "$stack" \
           '. += [{
             "name": $name,
             "type": "stack",
             "stack": $stack,
             "webhook_url": ""
           }]' "$temp_webhooks" > "$temp_webhooks.tmp" && mv "$temp_webhooks.tmp" "$temp_webhooks"
      else
        # Add container webhook
        # Capitalize first letter of service name for display
        display_name="$(echo "$service" | sed 's/^./\U&/')"

        jq --arg name "$display_name" \
           --arg stack "$stack" \
           --arg image "$image" \
           --arg container "$container_name" \
           '. += [{
             "name": $name,
             "type": "container",
             "stack": $stack,
             "image": $image,
             "container_name": $container,
             "webhook_url": ""
           }]' "$temp_webhooks" > "$temp_webhooks.tmp" && mv "$temp_webhooks.tmp" "$temp_webhooks"
      fi
    done

    # Merge new webhooks into existing config
    jq --slurpfile new_webhooks "$temp_webhooks" \
       '.webhooks += $new_webhooks[0]' \
       "$CONFIG_PATH" > "$CONFIG_PATH.tmp"

    mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"
    rm "$temp_webhooks"

    echo -e "${GREEN}✓ Config updated successfully!${NC}"
    echo "Updated: $CONFIG_PATH"
  else
    echo -e "${YELLOW}Dry-run complete. Use --apply to update the config file.${NC}"
  fi
}

# Run main
main
