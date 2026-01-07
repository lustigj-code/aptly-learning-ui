#!/bin/bash
# Production readiness tracker
# Tracks progress on the production checklist

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CHECKLIST_FILE="$PROJECT_DIR/.claude/production-checklist.json"

# Initialize checklist if it doesn't exist
if [ ! -f "$CHECKLIST_FILE" ]; then
    cat > "$CHECKLIST_FILE" << 'EOF'
{
  "lastUpdated": "",
  "phases": {
    "phase1_stability": {
      "name": "Stability & Quality Assurance",
      "tasks": {
        "vitest_setup": { "status": "pending", "description": "Add Vitest + Testing Library" },
        "e2e_tests": { "status": "pending", "description": "E2E tests with Playwright" },
        "error_boundaries": { "status": "pending", "description": "React error boundaries" },
        "loading_skeletons": { "status": "pending", "description": "Loading skeleton components" },
        "input_validation": { "status": "pending", "description": "Zod validation on all forms" }
      }
    },
    "phase2_observability": {
      "name": "Observability & Monitoring",
      "tasks": {
        "sentry_integration": { "status": "pending", "description": "Sentry error tracking" },
        "analytics": { "status": "pending", "description": "Analytics (Posthog/Mixpanel)" },
        "logging": { "status": "pending", "description": "Structured logging" }
      }
    },
    "phase3_security": {
      "name": "Security Hardening",
      "tasks": {
        "api_audit": { "status": "pending", "description": "Audit all API routes" },
        "rate_limiting": { "status": "pending", "description": "Upstash Redis rate limiting" },
        "csrf_protection": { "status": "pending", "description": "CSRF protection" },
        "csp_headers": { "status": "pending", "description": "Content Security Policy" }
      }
    },
    "phase4_content": {
      "name": "Content & Data",
      "tasks": {
        "real_content": { "status": "pending", "description": "Replace mock data with real content" },
        "content_cms": { "status": "pending", "description": "Admin content management" }
      }
    },
    "phase5_ux": {
      "name": "User Experience Polish",
      "tasks": {
        "mobile_audit": { "status": "pending", "description": "Mobile responsiveness audit" },
        "accessibility": { "status": "pending", "description": "WCAG 2.1 AA compliance" },
        "performance": { "status": "pending", "description": "Performance optimization" }
      }
    },
    "phase6_infrastructure": {
      "name": "Infrastructure & Deployment",
      "tasks": {
        "vercel_prod": { "status": "pending", "description": "Vercel production deployment" },
        "firebase_prod": { "status": "pending", "description": "Firebase production project" },
        "ci_cd": { "status": "pending", "description": "GitHub Actions CI/CD" },
        "backup_strategy": { "status": "pending", "description": "Database backup strategy" }
      }
    },
    "phase7_launch": {
      "name": "Launch Readiness",
      "tasks": {
        "legal_pages": { "status": "pending", "description": "Terms of Service, Cookie Policy" },
        "seo": { "status": "pending", "description": "SEO metadata" },
        "launch_monitoring": { "status": "pending", "description": "Launch day monitoring setup" }
      }
    }
  }
}
EOF
fi

# Update timestamp
TEMP_FILE=$(mktemp)
jq --arg date "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" '.lastUpdated = $date' "$CHECKLIST_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$CHECKLIST_FILE"

# Calculate progress
TOTAL=$(jq '[.phases[].tasks | length] | add' "$CHECKLIST_FILE")
COMPLETED=$(jq '[.phases[].tasks | to_entries[] | select(.value.status == "completed")] | length' "$CHECKLIST_FILE")
PERCENTAGE=$((COMPLETED * 100 / TOTAL))

echo "Production Readiness: $COMPLETED/$TOTAL tasks ($PERCENTAGE%)"

exit 0
