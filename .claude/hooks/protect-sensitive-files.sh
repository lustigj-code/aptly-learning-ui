#!/bin/bash
# PreToolUse hook - Protect sensitive files from modification
# Exit code 2 = block the action

set -e

# Read JSON input
INPUT=$(cat)

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // ""')

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Protected file patterns
PROTECTED_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "firebase-admin-key.json"
    "service-account.json"
    ".git/"
    "package-lock.json"
    "firestore.rules"  # Require explicit approval for security rules
)

# Check against protected patterns
for pattern in "${PROTECTED_FILES[@]}"; do
    if [[ "$FILE_PATH" == *"$pattern"* ]]; then
        echo "BLOCKED: Cannot modify protected file: $FILE_PATH" >&2
        echo "This file requires manual modification or explicit user approval." >&2
        exit 2
    fi
done

exit 0
