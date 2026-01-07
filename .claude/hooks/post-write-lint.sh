#!/bin/bash
# PostToolUse hook - Auto-format and lint after file writes
# Runs after Write/Edit tools complete

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Read JSON input
INPUT=$(cat)

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // ""')

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Only process TypeScript/JavaScript files
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.jsx ]]; then

    # Check if file exists and is within project
    if [[ "$FILE_PATH" == "$PROJECT_DIR"* ]] && [ -f "$FILE_PATH" ]; then

        # Run ESLint fix (non-blocking)
        cd "$PROJECT_DIR"
        npx eslint --fix "$FILE_PATH" 2>/dev/null || true

    fi
fi

exit 0
