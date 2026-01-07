#!/bin/bash
# Session initialization hook for Aptly Learning
# Runs on session start to ensure environment is ready

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CHECKLIST_FILE="$PROJECT_DIR/.claude/production-checklist.json"

# Output context for Claude
echo "{"
echo "  \"project\": \"aptly-learning\","
echo "  \"node_version\": \"$(node -v 2>/dev/null || echo 'not found')\","
echo "  \"npm_version\": \"$(npm -v 2>/dev/null || echo 'not found')\""
echo "}"

# Check if production checklist exists
if [ ! -f "$CHECKLIST_FILE" ]; then
    echo "Creating production checklist..." >&2
fi

# Set environment variables for the session
if [ -n "$CLAUDE_ENV_FILE" ]; then
    {
        echo "export NODE_ENV=development"
        echo "export APTLY_PROJECT_DIR=\"$PROJECT_DIR\""
    } >> "$CLAUDE_ENV_FILE"
fi

exit 0
