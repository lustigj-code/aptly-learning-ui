# Aptly Learning - Production Deployment Checklist

**Last Updated:** 2026-01-18
**Version:** 1.0
**Environment:** Production (Vercel + Firebase)

This checklist ensures Aptly Learning is production-ready before launch. Each section must be completed and verified before proceeding to the next.

---

## 1. Pre-Deployment Checks

### Local Build & Tests

- [ ] **Build passes**: `npm run build` completes without errors
  - Check `.next` directory exists and is complete
  - No TypeScript compilation errors
  - No missing dependencies

- [ ] **Unit tests pass**: `npm run test` passes all tests
  - All Vitest suites pass
  - Code coverage acceptable (>80% for critical paths)
  - No skipped tests

- [ ] **E2E tests pass**: `npm run test:e2e` passes all scenarios
  - User signup/login flow works
  - Learning flow end-to-end
  - Coach chat functionality
  - Payment flow (if applicable)

- [ ] **Lint passes**: `npm run lint` has no errors
  - No ESLint violations
  - No TypeScript strict mode errors
  - Accessibility issues resolved

### Code Quality

- [ ] **No console errors/warnings**: Verify clean console in dev
  - No React warnings
  - No unhandled promise rejections
  - No deprecation warnings

- [ ] **No security vulnerabilities**: `npm audit` passes
  - Run `npm audit --audit-level=moderate`
  - All critical/high vulnerabilities resolved
  - Document any acceptable risks

- [ ] **Performance benchmarks met**:
  - Lighthouse score ≥ 85 (mobile)
  - Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
  - Bundle size tracking (Next.js bundle analysis)

### Environment & Secrets

- [ ] **All environment variables configured**:
  - [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
  - [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - [ ] `FIREBASE_ADMIN_SDK_KEY` (server-side only)
  - [ ] `GEMINI_API_KEY` for primary AI model
  - [ ] `HUGGINGFACE_API_KEY` for fallback model (optional)
  - [ ] `STRIPE_SECRET_KEY` (if Stripe enabled)
  - [ ] `STRIPE_PUBLISHABLE_KEY`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `SENTRY_AUTH_TOKEN` for error tracking

- [ ] **No secrets in code**:
  - No API keys hardcoded in files
  - No credentials in Git history
  - `.env.local` is in `.gitignore`
  - Review recent commits for secret exposure

- [ ] **.env file backup created**:
  - Backup stored securely (1Password, LastPass, etc.)
  - Document which keys are sensitive
  - Have recovery process documented

---

## 2. Firebase Setup

### Firebase Project Configuration

- [ ] **Production Firebase project created**:
  - [ ] Project name: `aptly-study-app` (or production name)
  - [ ] Region: `us-central1` (or preferred region)
  - [ ] Billing enabled with spending limits set
  - [ ] Project ID verified in `.firebaserc`

- [ ] **Firestore Database initialized**:
  - [ ] Database created in production location
  - [ ] `aptly-study-app` project linked
  - [ ] Backup enabled (daily snapshots)
  - [ ] Retention policy set (30-90 days)

### Firestore Indexes

- [ ] **All indexes deployed**:
  ```bash
  firebase deploy --only firestore:indexes
  ```
  - [ ] Deployed from `firestore.indexes.json`
  - [ ] All indexes status: ✅ Enabled
  - [ ] No missing indexes warnings in console

- [ ] **Critical indexes verified**:
  - [ ] `courses` collection: isPublished + number
  - [ ] `skillStates` collection: userId + skill
  - [ ] `interactions` collection: userId + timestamp
  - [ ] `interventionStates`: userId + lastInteractionAt
  - [ ] `coachTokenUsage`: userId + timestamp (rate limiting)
  - [ ] `userProgress`: userId + courseId (queries)

### Firestore Security Rules

- [ ] **Security rules deployed**:
  ```bash
  firebase deploy --only firestore:rules
  ```
  - [ ] Deployed from `firestore.rules`
  - [ ] Rules status verified in Firebase Console
  - [ ] No test failures in rules validation

- [ ] **Security rules enforce**:
  - [ ] Users can only read/write their own data
  - [ ] Courses readable by all authenticated users
  - [ ] Admin operations require `admin` custom claim
  - [ ] Data validation rules in place
  - [ ] Rate limiting on write operations

- [ ] **Test mode disabled**:
  - [ ] Firebase Console > Firestore > Rules (not in test mode)
  - [ ] Rules are production-grade strict

### Firebase Storage Configuration

- [ ] **Storage bucket created**:
  - [ ] Storage bucket initialized
  - [ ] Location set (us-central1 recommended)
  - [ ] Versioning enabled (optional but recommended)

- [ ] **Storage security rules deployed**:
  - [ ] Rules deployed from `storage.rules`
  - [ ] Users can only access their own content
  - [ ] Admin can upload course content
  - [ ] Videos have read-only access for students

- [ ] **Storage CORS configured**:
  - [ ] CORS settings for video playback:
    ```json
    [
      {
        "origin": ["https://aptly-learning.com", "https://*.vercel.app"],
        "method": ["GET", "HEAD"],
        "responseHeader": ["Content-Type"],
        "maxAgeSeconds": 3600
      }
    ]
    ```
  - [ ] Video URLs are publicly readable
  - [ ] Presigned URLs generated server-side for security

- [ ] **Storage quotas set**:
  - [ ] Max file size limits enforced
  - [ ] Storage budget monitored

### Firebase Authentication

- [ ] **Auth providers enabled**:
  - [ ] Email/Password authentication enabled
  - [ ] Google OAuth configured:
    - [ ] OAuth consent screen configured
    - [ ] Authorized JavaScript origins added
    - [ ] Authorized redirect URIs added
  - [ ] Test users created for QA

- [ ] **Email templates customized** (optional):
  - [ ] Verification email template branded
  - [ ] Password reset email template branded
  - [ ] Custom email domain configured (optional)

- [ ] **Custom claims configured**:
  - [ ] Admin custom claim setup for admins
  - [ ] Role-based access control (RBAC) implemented
  - [ ] Claim verification in security rules

- [ ] **Session management**:
  - [ ] Session timeout configured
  - [ ] Persistent login working
  - [ ] Logout clears all user data

---

## 3. Vercel Configuration

### Vercel Project Setup

- [ ] **Vercel project created**:
  - [ ] GitHub repository connected
  - [ ] Project name: `aptly-learning` (or production name)
  - [ ] Production environment configured

- [ ] **Environment variables deployed**:
  ```bash
  vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
  vercel env add FIREBASE_ADMIN_SDK_KEY
  vercel env add GEMINI_API_KEY
  # ... all other vars
  ```
  - [ ] All variables set for production
  - [ ] Variables not exposed in client bundle (NEXT_PUBLIC_ only for public)
  - [ ] Sensitive keys are server-only
  - [ ] Verified in Vercel Dashboard > Settings > Environment Variables

### Custom Domain Configuration

- [ ] **Custom domain configured**:
  - [ ] Domain verified in Vercel (DNS records added)
  - [ ] SSL certificate auto-provisioned
  - [ ] HTTPS enforced (automatic redirect)
  - [ ] Domain CNAME/A records verified

- [ ] **SSL/TLS Certificate**:
  - [ ] Certificate provisioned by Vercel
  - [ ] Certificate valid and auto-renewing
  - [ ] HTTPS working on all pages

### Build & Deployment Settings

- [ ] **Build command correct**:
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `.next`
  - [ ] Node.js version: 20.x LTS or newer

- [ ] **Deployment strategy**:
  - [ ] Preview deployments enabled
  - [ ] Production deployment requires approval (optional)
  - [ ] Rollback strategy documented

### Edge Runtime (Optional)

- [ ] **Edge functions enabled** (if using):
  - [ ] Middleware configured in `src/middleware.ts`
  - [ ] Edge function routes optimized
  - [ ] Geo-location/geo-routing working

- [ ] **ISR (Incremental Static Regeneration) configured** (if applicable):
  - [ ] Static pages pre-rendered
  - [ ] Revalidate intervals set
  - [ ] Cache headers optimized

---

## 4. API Configuration

### AI Model Integration

- [ ] **Gemini API configured**:
  - [ ] API key set in `GEMINI_API_KEY`
  - [ ] Model: `gemini-2.0-flash` (or latest stable)
  - [ ] Rate limits understood (1500 req/min by default)
  - [ ] Cost monitoring enabled in Google Cloud Console

- [ ] **Fallback AI model ready**:
  - [ ] HuggingFace Sage or alternative configured
  - [ ] Fallback logic implemented in `/api/coach`
  - [ ] Tested: primary → fallback switch working
  - [ ] Rate limits: 1000 req/month understood

### Payment Processing (if applicable)

- [ ] **Stripe account configured**:
  - [ ] Stripe production account created
  - [ ] Secret key set in `STRIPE_SECRET_KEY`
  - [ ] Publishable key set in `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] Webhook signing secret set

- [ ] **Stripe products & prices created**:
  - [ ] Products defined in Stripe Dashboard
  - [ ] Prices set for each course/tier
  - [ ] Product IDs match code references
  - [ ] Tax configuration set

- [ ] **Webhook endpoint configured**:
  - [ ] Webhook endpoint: `/api/webhooks/stripe`
  - [ ] Webhook secret stored in environment
  - [ ] Events subscribed: `payment_intent.succeeded`, `charge.failed`
  - [ ] Webhook tested and verified

### Rate Limiting & DDoS Protection

- [ ] **Rate limiting configured**:
  - [ ] Redis/in-memory store for rate limiting
  - [ ] `/api/coach` rate limit: 30 req/min per user
  - [ ] `/api/interactions/log` rate limit: 100 req/min
  - [ ] Login attempts rate limited

- [ ] **Vercel DDoS protection enabled**:
  - [ ] Vercel DDoS protection automatically enabled
  - [ ] Additional WAF rules (if needed)

---

## 5. Monitoring & Observability

### Error Tracking

- [ ] **Sentry configured**:
  - [ ] Sentry project created
  - [ ] `SENTRY_AUTH_TOKEN` set
  - [ ] DSN configured for client and server
  - [ ] Source maps uploaded automatically

- [ ] **Error alerts configured**:
  - [ ] Alerts for critical errors enabled
  - [ ] Slack/Email notifications working
  - [ ] Error spike detection enabled

### Analytics

- [ ] **PostHog or Segment configured** (optional):
  - [ ] Event tracking initialized
  - [ ] Key user events tracked:
    - [ ] Signup/Login
    - [ ] Course start/completion
    - [ ] Quiz attempts
    - [ ] Coach interactions

- [ ] **Google Analytics (optional)**:
  - [ ] GA4 property created
  - [ ] Tracking code installed
  - [ ] Events sending correctly

### Performance Monitoring

- [ ] **Web Vitals monitoring**:
  - [ ] Core Web Vitals tracked
  - [ ] Performance metrics baseline established
  - [ ] Alerts for performance degradation

- [ ] **APM (Application Performance Monitoring)**:
  - [ ] Vercel Analytics enabled
  - [ ] Function performance tracked
  - [ ] Database query performance monitored

### Logging

- [ ] **Structured logging implemented**:
  - [ ] All API routes log important events
  - [ ] Log levels configured (info, warn, error)
  - [ ] Logs aggregated (Vercel logs, Sentry, or external)

- [ ] **Log retention policy**:
  - [ ] Retention period set (30-90 days)
  - [ ] Sensitive data not logged (passwords, tokens)

### Uptime Monitoring

- [ ] **Uptime monitoring configured**:
  - [ ] Pingdom, UptimeRobot, or Vercel monitoring enabled
  - [ ] Monitors configured for:
    - [ ] `https://aptly-learning.com` (or domain)
    - [ ] `/api/health` health check endpoint
  - [ ] Alerts configured for downtime
  - [ ] Incident response process documented

---

## 6. Security Checklist

### HTTPS & TLS

- [ ] **HTTPS enforced**:
  - [ ] All URLs redirect to HTTPS
  - [ ] HSTS header configured (max-age ≥ 31536000)
  - [ ] Certificate valid and non-expired
  - [ ] Mixed content warnings resolved

- [ ] **TLS version**: TLS 1.2+ enforced

### Content Security Policy (CSP)

- [ ] **CSP header configured** in `next.config.ts` or middleware:
  ```
  Content-Security-Policy:
    default-src 'self'
    script-src 'self' 'unsafe-inline' cdn.vercel-insights.com
    style-src 'self' 'unsafe-inline'
    img-src 'self' data: https:
    font-src 'self' data:
    connect-src 'self' firebaseio.com firestore.googleapis.com
    frame-ancestors 'none'
  ```
  - [ ] Policy deployed and verified
  - [ ] No CSP violations in console
  - [ ] External scripts whitelisted

### CORS Configuration

- [ ] **CORS headers set**:
  - [ ] Firebase Storage CORS configured (see section 2)
  - [ ] API routes allow credentials
  - [ ] Allowed origins: production domain + localhost (dev only)

### Authentication & Authorization

- [ ] **Session management secure**:
  - [ ] Cookies HTTP-only, Secure, SameSite=Strict
  - [ ] Session timeout: 24-48 hours
  - [ ] Refresh token strategy implemented

- [ ] **Password security**:
  - [ ] Firebase Auth enforces strong passwords
  - [ ] Password reset via email working
  - [ ] No password stored in logs/errors

- [ ] **API authentication**:
  - [ ] All API routes require Firebase auth (except public endpoints)
  - [ ] Custom claims enforced for admin endpoints
  - [ ] API keys validated on every request

### Input Validation & Sanitization

- [ ] **Input validation on all API routes**:
  - [ ] Request body validation (Zod/TypeScript)
  - [ ] SQL injection impossible (Firestore)
  - [ ] XSS prevention: React sanitizes by default
  - [ ] File uploads validated (size, type)

- [ ] **Output encoding**:
  - [ ] All user-generated content sanitized
  - [ ] JSON responses properly encoded

### Dependency Security

- [ ] **Dependencies audited**:
  - [ ] `npm audit` passes (no critical/high vulnerabilities)
  - [ ] Outdated dependencies updated
  - [ ] Security patches applied

- [ ] **Supply chain security**:
  - [ ] Verified package publishers (npm)
  - [ ] No suspicious packages installed

### Secrets Management

- [ ] **Secrets not in repository**:
  - [ ] `.env.local` never committed
  - [ ] No API keys in code
  - [ ] Verify Git history: `git log --all -p | grep -i "api_key"`

- [ ] **Secret rotation policy**:
  - [ ] Plan for rotating API keys (Gemini, Stripe, etc.)
  - [ ] Firebase Admin SDK key rotation documented
  - [ ] Alert for unused/forgotten secrets

### Data Protection

- [ ] **GDPR compliance** (if serving EU users):
  - [ ] Privacy policy published
  - [ ] Cookie consent implemented
  - [ ] Data retention policy defined
  - [ ] User data export functionality (optional)

- [ ] **PII protection**:
  - [ ] User data encrypted in transit (HTTPS)
  - [ ] Sensitive data never logged
  - [ ] Database backups encrypted
  - [ ] Access logs for admin operations

---

## 7. Course Content & Features

### Content Setup

- [ ] **Course content ingested**:
  - [ ] Courses uploaded to Firestore
  - [ ] Videos uploaded to Firebase Storage
  - [ ] Quiz questions created and validated
  - [ ] Images/assets accessible

- [ ] **Content validation**:
  - [ ] All videos playable
  - [ ] Quiz questions render correctly
  - [ ] Reading material formatted properly
  - [ ] No broken links or missing assets

### Feature Verification

- [ ] **Learning flow working**:
  - [ ] Content loads without errors
  - [ ] Quiz questions functional
  - [ ] Atom completion tracked
  - [ ] Mastery calculations working

- [ ] **AI Coach functional**:
  - [ ] Coach chat accepts messages
  - [ ] AI responses generated (primary model working)
  - [ ] Fallback model switches on failure
  - [ ] Response quality acceptable

- [ ] **Progress tracking working**:
  - [ ] User progress saved
  - [ ] Mastery levels calculated
  - [ ] Review queue populated
  - [ ] Badges/achievements working

- [ ] **Gamification functional**:
  - [ ] XP awarded on completion
  - [ ] Streaks tracked
  - [ ] Notifications sent
  - [ ] Leaderboard (if applicable) working

---

## 8. Post-Launch Verification

### Smoke Tests (Automated)

Run these tests immediately after deployment:

- [ ] **Health check endpoint responds**:
  ```bash
  curl https://aptly-learning.com/api/health
  ```
  Expected: 200 OK

- [ ] **Homepage loads**:
  - [ ] Page loads without 5xx errors
  - [ ] Logo/branding visible
  - [ ] No console errors

- [ ] **Authentication flow works**:
  - [ ] Signup form loads
  - [ ] Signup with email works
  - [ ] Confirmation email sent
  - [ ] Login works
  - [ ] Logout clears session

- [ ] **Firebase connectivity verified**:
  - [ ] Firestore queries work
  - [ ] Authentication tokens valid
  - [ ] No permission denied errors

### Manual Testing Checklist

- [ ] **User Signup Flow**:
  - [ ] New user can sign up with email
  - [ ] Confirmation email received
  - [ ] Email verification link works
  - [ ] User redirected to onboarding
  - [ ] Profile creation works

- [ ] **Course Selection & Learning**:
  - [ ] User can view available courses
  - [ ] Can select and start a course
  - [ ] Content loads correctly
  - [ ] Can complete atoms/lessons
  - [ ] Progress saved across sessions

- [ ] **AI Coach**:
  - [ ] Coach chat loads
  - [ ] Can send messages
  - [ ] Receives AI responses
  - [ ] Response quality acceptable
  - [ ] No rate limiting errors (first attempts)

- [ ] **Mastery & Review**:
  - [ ] Mastery map displays correctly
  - [ ] Review queue shows due items
  - [ ] Review items work properly
  - [ ] Mastery levels update

- [ ] **Mobile Responsiveness**:
  - [ ] App works on iOS Safari
  - [ ] App works on Android Chrome
  - [ ] Touch interactions responsive
  - [ ] No horizontal scrolling

- [ ] **Payment Flow** (if applicable):
  - [ ] Stripe checkout loads
  - [ ] Test charge succeeds
  - [ ] Webhook received
  - [ ] User access granted

### Performance Validation

- [ ] **Page load performance**:
  - [ ] Lighthouse score ≥ 85 (mobile)
  - [ ] First Contentful Paint < 2 seconds
  - [ ] Largest Contentful Paint < 2.5 seconds
  - [ ] Cumulative Layout Shift < 0.1

- [ ] **API response times**:
  - [ ] Coach endpoint: < 5 seconds (with streaming)
  - [ ] Progress endpoint: < 1 second
  - [ ] Mastery endpoint: < 1 second

- [ ] **No errors in Sentry**:
  - [ ] Error count at 0 (or <5)
  - [ ] No critical errors
  - [ ] Review and close test errors

---

## 9. Post-Launch Monitoring (First 24 Hours)

### Continuous Monitoring

- [ ] **Error rates normal**:
  - [ ] Check Sentry dashboard hourly
  - [ ] No unexpected error spikes
  - [ ] Respond to critical errors immediately

- [ ] **Performance metrics normal**:
  - [ ] Vercel Analytics shows expected load times
  - [ ] No performance degradation
  - [ ] Database latency acceptable

- [ ] **User activity tracking**:
  - [ ] Signups tracked
  - [ ] Course starts tracked
  - [ ] Engagement metrics normal

- [ ] **Infrastructure stability**:
  - [ ] Vercel deployment stable
  - [ ] Firebase quotas not exceeded
  - [ ] No auto-scaling issues

### Incident Response

- [ ] **Incident response team on call**:
  - [ ] Team members assigned
  - [ ] Communication channels active
  - [ ] Escalation path clear

- [ ] **Rollback plan ready**:
  - [ ] Previous version tagged in Git
  - [ ] Rollback procedure documented
  - [ ] Can rollback within 5 minutes if needed

---

## 10. Documentation & Handoff

### Documentation

- [ ] **Deployment runbook created**:
  - [ ] Contains all deployment steps
  - [ ] Troubleshooting guide included
  - [ ] Rollback procedure documented
  - [ ] Located in accessible repository

- [ ] **Environment variable documentation**:
  - [ ] All variables documented
  - [ ] Purpose of each variable explained
  - [ ] Example values (non-secret) provided

- [ ] **Firebase setup documented**:
  - [ ] Database schema documented
  - [ ] Indexes listed with query purposes
  - [ ] Security rules explained

- [ ] **Monitoring & alerting documented**:
  - [ ] How to access Sentry
  - [ ] How to access analytics
  - [ ] Alert thresholds explained
  - [ ] Who receives notifications

### Handoff to Ops/Support

- [ ] **Operations team trained**:
  - [ ] Can access production systems
  - [ ] Familiar with monitoring dashboards
  - [ ] Know how to escalate issues
  - [ ] Have runbook memorized

- [ ] **Support documentation prepared**:
  - [ ] Common issues and solutions documented
  - [ ] FAQ prepared
  - [ ] Support contact info established

---

## 11. Sign-Off & Final Review

### Final Approval

- [ ] **Tech Lead Review**: _____________________ (Signature / Date)
  - [ ] All items checked
  - [ ] Deployment approved
  - [ ] Known risks documented

- [ ] **Product Owner Review**: _____________________ (Signature / Date)
  - [ ] Features working as expected
  - [ ] User experience acceptable
  - [ ] Launch decision made

- [ ] **Deployment executed by**: _____________________ (Name / Time)

- [ ] **Go-live confirmed**: _____________________ (Time / Date)

---

## Known Issues & Risks

Document any known issues or risks that were accepted before launch:

| Issue | Severity | Workaround | Owner | Target Fix Date |
|-------|----------|-----------|-------|-----------------|
|       |          |           |       |                 |

---

## Post-Launch Tasks (Next Week)

- [ ] Monitor metrics continuously
- [ ] Collect user feedback
- [ ] Address reported issues
- [ ] Optimize based on real usage data
- [ ] Schedule post-launch review meeting

---

## Quick Reference Commands

```bash
# Verify production build
npm run build

# Run all tests
npm run test && npm run test:e2e

# Deploy to Firebase
firebase deploy

# Deploy to Vercel
vercel --prod

# Check Firebase status
firebase status

# View Firestore rules
firebase rules:log

# Check Vercel deployment status
vercel list
```

---

## Additional Resources

- Firebase Console: https://console.firebase.google.com
- Vercel Dashboard: https://vercel.com/dashboard
- Sentry Dashboard: https://sentry.io
- Stripe Dashboard: https://dashboard.stripe.com
- Next.js Production Checklist: https://nextjs.org/learn/production
