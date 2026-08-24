#!/bin/bash
# git-credential-env.sh
# Credential helper that reads GITHUB_TOKEN from .env instead of storing in git config
# This keeps sensitive credentials out of .git/config
#
# Usage: Configure in .gitconfig or .git/config:
#   git config --local credential.helper "/path/to/git-credential-env.sh"
#
# How it works:
#   1. git needs credentials for HTTPS push/pull
#   2. Instead of embedding token in remote URL, this script reads GITHUB_TOKEN from .env
#   3. Token stays in .env (which is gitignored), never exposed in .git/config

set -euo pipefail

# Find project root (where .env and .git are located)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

# Read the operation (get/store/erase)
read operation

case "$operation" in
  get)
    # git is asking for credentials
    if [ ! -f "$ENV_FILE" ]; then
      echo "ERROR: .env not found at $ENV_FILE" >&2
      exit 1
    fi

    # Source .env (safely — only read variables, don't execute)
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

    if [ -z "${GITHUB_TOKEN:-}" ]; then
      echo "ERROR: GITHUB_TOKEN not set in .env" >&2
      exit 1
    fi

    # Read the protocol/host/path from git
    while read line; do
      if [[ "$line" == "host="* ]]; then
        host="${line#host=}"
      fi
      if [[ "$line" == "protocol="* ]]; then
        protocol="${line#protocol=}"
      fi
    done

    # Return credentials in the format git expects
    # For GitHub over HTTPS, git expects username + password (token acts as password)
    echo "protocol=$protocol"
    echo "host=$host"
    echo "username=git"
    echo "password=$GITHUB_TOKEN"
    ;;

  store)
    # git is trying to store credentials
    # We ignore this — credentials should stay in .env only
    : # no-op
    ;;

  erase)
    # git is asking to erase credentials
    # We ignore this — credentials are managed in .env
    : # no-op
    ;;

  *)
    echo "ERROR: Unknown operation: $operation" >&2
    exit 1
    ;;
esac
