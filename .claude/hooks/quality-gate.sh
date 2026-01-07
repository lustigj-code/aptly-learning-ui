#!/bin/bash
# Stop hook - Quality gate enforcement
# Ensures code quality before Claude stops working
# Exit code 2 = block Claude from stopping

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CHECKLIST_FILE="$PROJECT_DIR/.claude/production-checklist.json"

# Read JSON input to check if we're in a stop hook loop
INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

# Prevent infinite loops
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    exit 0
fi

cd "$PROJECT_DIR"

# Track failures
FAILURES=()

# 1. Check TypeScript compilation
echo "Checking TypeScript..." >&2
if ! npx tsc --noEmit 2>/dev/null; then
    FAILURES+=("TypeScript errors found")
fi

# 2. Check ESLint (if configured)
echo "Checking ESLint..." >&2
if [ -f "eslint.config.mjs" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
    if ! npm run lint 2>/dev/null; then
        FAILURES+=("ESLint errors found")
    fi
fi

# 3. Check if build passes
echo "Checking build..." >&2
if ! npm run build 2>/dev/null; then
    FAILURES+=("Build failed")
fi

# 4. Check if tests pass (if test script exists)
if npm run test --if-present 2>/dev/null | grep -q "error\|failed\|FAIL"; then
    FAILURES+=("Tests failed")
fi

# Report failures
if [ ${#FAILURES[@]} -gt 0 ]; then
    echo "" >&2
    echo "QUALITY GATE FAILED - Cannot stop until fixed:" >&2
    for failure in "${FAILURES[@]}"; do
        echo "  - $failure" >&2
    done
    echo "" >&2
    exit 2
fi

# Output success as JSON
echo '{"decision": "approve", "reason": "All quality checks passed"}'
exit 0
