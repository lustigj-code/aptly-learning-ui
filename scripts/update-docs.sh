#!/bin/bash

# Update Documentation Script
# Run this to refresh documentation timestamps and stats

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_ROOT/docs"

echo "Updating Aptly Learning Documentation..."

# Get current timestamp
TIMESTAMP=$(date +'%Y-%m-%d %H:%M UTC')

# Calculate stats
TOTAL_FILES=$(find "$PROJECT_ROOT/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | xargs)
TOTAL_LINES=$(find "$PROJECT_ROOT/src" -name "*.ts" -o -name "*.tsx" -exec cat {} + 2>/dev/null | wc -l | xargs)
API_ROUTES=$(find "$PROJECT_ROOT/src/app/api" -name "route.ts" 2>/dev/null | wc -l | xargs)
COMPONENTS=$(find "$PROJECT_ROOT/src/components" -name "*.tsx" 2>/dev/null | wc -l | xargs)
HOOKS=$(find "$PROJECT_ROOT/src/hooks" -name "*.ts" 2>/dev/null | wc -l | xargs)
STORES=$(find "$PROJECT_ROOT/src/store" -name "*.ts" 2>/dev/null | wc -l | xargs)
LIB_FILES=$(find "$PROJECT_ROOT/src/lib" -name "*.ts" 2>/dev/null | wc -l | xargs)

echo ""
echo "Codebase Stats:"
echo "  Total Files: $TOTAL_FILES"
echo "  Total Lines: $TOTAL_LINES"
echo "  API Routes: $API_ROUTES"
echo "  Components: $COMPONENTS"
echo "  Hooks: $HOOKS"
echo "  Stores: $STORES"
echo "  Library Files: $LIB_FILES"
echo ""

# Update timestamps in all doc files
for file in "$DOCS_DIR"/*.md; do
  if [ -f "$file" ]; then
    # macOS compatible sed
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/> \*\*Last Updated:\*\* .*/> **Last Updated:** $TIMESTAMP/" "$file"
    else
      sed -i "s/> \*\*Last Updated:\*\* .*/> **Last Updated:** $TIMESTAMP/" "$file"
    fi
    echo "Updated: $(basename "$file")"
  fi
done

echo ""
echo "Documentation updated successfully!"
echo "Timestamp: $TIMESTAMP"
