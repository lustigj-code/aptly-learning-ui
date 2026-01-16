#!/bin/bash
# Session initialization hook for Aptly Learning
# Runs on session start to ensure environment is ready

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CHECKLIST_FILE="$PROJECT_DIR/.claude/production-checklist.json"
HISTORY_FILE="$PROJECT_DIR/.claude/HISTORY.md"
TODAY=$(date +%Y-%m-%d)

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

# Ensure HISTORY.md exists and has today's date section
if [ ! -f "$HISTORY_FILE" ]; then
    echo "# Aptly Learning - Work History" > "$HISTORY_FILE"
    echo "" >> "$HISTORY_FILE"
fi

if ! grep -q "## $TODAY" "$HISTORY_FILE" 2>/dev/null; then
    echo "" >> "$HISTORY_FILE"
    echo "## $TODAY" >> "$HISTORY_FILE"
    echo "" >> "$HISTORY_FILE"
fi

exit 0
