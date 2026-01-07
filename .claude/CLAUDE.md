# Aptly Learning - Production Plan

## Mission
Transform this learning platform from development to production-ready state.

## Production Checklist Location
`.claude/production-checklist.json` - Tracks all 24 tasks across 7 phases.

## Hook System

### Active Hooks
1. **SessionStart**: Initializes environment, shows production progress
2. **PreToolUse**: Protects sensitive files (.env, firebase keys, etc.)
3. **PostToolUse**: Auto-lints TypeScript/JavaScript after edits
4. **Stop**: Reports production progress, enforces quality gates (strict mode)

### Modes
- **Normal Mode** (settings.json): Tracks progress, protects files, auto-lints
- **Strict Mode** (settings.strict.json): All above + blocks stopping until build/tests pass

To enable strict mode:
```bash
cp .claude/settings.strict.json .claude/settings.json
```

## Updating Task Status

Mark a task complete:
```bash
echo '{"task": "vitest_setup", "status": "completed"}' | python3 .claude/hooks/update-checklist.py
```

Task IDs by phase:
- **Phase 1**: vitest_setup, e2e_tests, error_boundaries, loading_skeletons, input_validation
- **Phase 2**: sentry_integration, analytics, logging
- **Phase 3**: api_audit, rate_limiting, csrf_protection, csp_headers
- **Phase 4**: real_content, content_cms
- **Phase 5**: mobile_audit, accessibility, performance
- **Phase 6**: vercel_prod, firebase_prod, ci_cd, backup_strategy
- **Phase 7**: legal_pages, seo, launch_monitoring

## Quality Gates

Before stopping, Claude must ensure:
1. TypeScript compiles without errors (`npm run build`)
2. ESLint passes (`npm run lint`)
3. Tests pass (when configured)

## Commands Reference

```bash
# Check production progress
bash .claude/hooks/production-tracker.sh

# Run quality gate manually
bash .claude/hooks/quality-gate.sh

# View checklist
cat .claude/production-checklist.json | jq '.phases | to_entries[] | {phase: .key, tasks: [.value.tasks | to_entries[] | {task: .key, status: .value.status}]}'
```

## Critical Path (Minimum for Launch)

1. Sentry integration
2. Rate limiting (Upstash Redis)
3. Auth middleware hardening
4. Real course content
5. Vercel production deployment
6. Firebase production project
7. Basic E2E tests
