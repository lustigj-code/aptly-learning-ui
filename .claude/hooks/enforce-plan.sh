#!/bin/bash
# Stop hook - Enforce production plan completion
# This is the MASTER enforcement hook that tracks the entire production plan

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CHECKLIST_FILE="$PROJECT_DIR/.claude/production-checklist.json"

# Read JSON input
INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

# Prevent infinite loops
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    exit 0
fi

# Initialize checklist if needed
if [ ! -f "$CHECKLIST_FILE" ]; then
    bash "$PROJECT_DIR/.claude/hooks/production-tracker.sh" >/dev/null 2>&1
fi

# Calculate current progress
if [ -f "$CHECKLIST_FILE" ]; then
    TOTAL=$(jq '[.phases[].tasks | length] | add' "$CHECKLIST_FILE")
    COMPLETED=$(jq '[.phases[].tasks | to_entries[] | select(.value.status == "completed")] | length' "$CHECKLIST_FILE")
    IN_PROGRESS=$(jq '[.phases[].tasks | to_entries[] | select(.value.status == "in_progress")] | length' "$CHECKLIST_FILE")
    PERCENTAGE=$((COMPLETED * 100 / TOTAL))

    # Get pending critical tasks
    CRITICAL_PENDING=$(jq -r '
        [
            .phases.phase1_stability.tasks | to_entries[] | select(.value.status == "pending") | .value.description,
            .phases.phase2_observability.tasks | to_entries[] | select(.value.status == "pending") | .value.description,
            .phases.phase3_security.tasks | to_entries[] | select(.value.status == "pending") | .value.description
        ] | .[0:3] | join(", ")
    ' "$CHECKLIST_FILE")
fi

# Output status as JSON for Claude to see
cat << EOF
{
    "production_progress": {
        "completed": $COMPLETED,
        "total": $TOTAL,
        "percentage": $PERCENTAGE,
        "in_progress": $IN_PROGRESS
    },
    "next_critical_tasks": "$CRITICAL_PENDING",
    "decision": "approve",
    "systemMessage": "Production Progress: $COMPLETED/$TOTAL tasks ($PERCENTAGE%). Next: $CRITICAL_PENDING"
}
EOF

exit 0
