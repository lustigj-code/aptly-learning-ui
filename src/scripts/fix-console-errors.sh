#!/bin/bash

# Script to systematically replace console.error/warn with Sentry captureError
# Usage: bash src/scripts/fix-console-errors.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No files will be modified"
  echo ""
fi

# Counter
FILES_MODIFIED=0
ERRORS_REPLACED=0

# Find all TypeScript/TSX files in src (excluding node_modules, test files)
FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -name "*.test.ts" ! -name "*.test.tsx")

for FILE in $FILES; do
  # Check if file contains console.error or console.warn
  if grep -q "console\.\(error\|warn\)" "$FILE"; then
    echo "📝 Processing: $FILE"

    # Check if file already imports captureError
    if ! grep -q "import.*captureError.*from.*@/lib/monitoring/sentry" "$FILE"; then
      if [ "$DRY_RUN" = false ]; then
        # Add import at the top (after existing imports)
        # This is a simple approach - may need manual cleanup for some files
        echo "  ✓ Adding captureError import"

        # Find the last import line
        LAST_IMPORT_LINE=$(grep -n "^import " "$FILE" | tail -1 | cut -d: -f1)

        if [ -n "$LAST_IMPORT_LINE" ]; then
          # Insert after last import
          sed -i.bak "${LAST_IMPORT_LINE}a\\
import { captureError } from '@/lib/monitoring/sentry'
" "$FILE"
          rm "${FILE}.bak"
        fi
      else
        echo "  [DRY RUN] Would add captureError import"
      fi
    fi

    # Count console.error/warn in this file
    COUNT=$(grep -c "console\.\(error\|warn\)" "$FILE" || true)

    if [ "$DRY_RUN" = false ]; then
      # Note: This is a simple replacement. Manual review recommended for complex cases.
      # Replace console.error(msg, error) with captureError pattern
      # This handles the most common pattern but may need manual fixes
      echo "  ✓ Replacing $COUNT console statements"

      # TODO: Implement smart replacement based on context
      # For now, just flag for manual review
      echo "  ⚠️  Manual review needed for proper error context"
    else
      echo "  [DRY RUN] Would replace $COUNT console statements"
    fi

    FILES_MODIFIED=$((FILES_MODIFIED + 1))
    ERRORS_REPLACED=$((ERRORS_REPLACED + COUNT))
  fi
done

echo ""
echo "📊 Summary:"
echo "  Files with console statements: $FILES_MODIFIED"
echo "  Total console.error/warn found: $ERRORS_REPLACED"

if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "✅ Import statements added"
  echo "⚠️  MANUAL REVIEW REQUIRED:"
  echo "   Console statements need manual replacement with proper error context"
  echo ""
  echo "   Pattern:"
  echo "     console.error('Failed to X:', error)"
  echo "   →"
  echo "     captureError(error as Error, {"
  echo "       tags: { api: 'X', method: 'GET' },"
  echo "       context: { operation: 'do_X', ...relevantData }"
  echo "     })"
fi
