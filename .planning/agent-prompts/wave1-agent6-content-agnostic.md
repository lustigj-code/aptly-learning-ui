# Agent 1-6: Content-Agnostic Architecture

## Mission
Make the system work across any certification domain, not just the hardcoded courses.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/content/courseRegistry.ts    # Course registration
src/data/mockData.ts                 # Current course data structure
src/types/curriculum.ts              # Course/module/lesson types
src/app/onboarding/page.tsx          # Onboarding flow
src/lib/skillmap/skillMapGenerator.ts # AI skill map generation
```

## Current State
- System works for "Social Media Marketing" and "AI at Work" courses
- Course-specific logic is scattered throughout components
- No way to add new certification domains easily

## Changes to Make

### 1. Create `src/lib/content/domainConfig.ts`
Purpose: Domain-specific settings and metadata

```typescript
export interface DomainConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;

  // Certification info
  certification?: {
    name: string;
    provider: string;
    examDuration: number; // minutes
    passingScore: number; // percentage
    examUrl?: string;
  };

  // Learning parameters
  learningParams: {
    defaultSessionMinutes: number;
    recommendedDailyMinutes: number;
    difficultyScale: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    prerequisiteStrength: 'strict' | 'recommended' | 'none';
  };

  // BKT/FSRS tuning
  masteryParams?: {
    initialMastery: number;      // P(L0) default
    transitionRate: number;      // P(T) default
    targetRetention: number;     // For FSRS
  };
}

// Domain registry
export const DOMAINS: Record<string, DomainConfig> = {
  'social-media-marketing': {
    id: 'social-media-marketing',
    name: 'Social Media Marketing',
    slug: 'smm',
    description: 'Master social media strategy, content creation, and analytics',
    icon: '📱',
    color: '#E91E63',
    certification: {
      name: 'Meta Certified Digital Marketing Associate',
      provider: 'Meta',
      examDuration: 90,
      passingScore: 70,
    },
    learningParams: {
      defaultSessionMinutes: 20,
      recommendedDailyMinutes: 30,
      difficultyScale: 'beginner',
      prerequisiteStrength: 'recommended',
    },
  },
  'ai-at-work': {
    id: 'ai-at-work',
    name: 'AI at Work',
    slug: 'ai',
    description: 'Learn to leverage AI tools effectively in your workflow',
    icon: '🤖',
    color: '#2196F3',
    learningParams: {
      defaultSessionMinutes: 25,
      recommendedDailyMinutes: 45,
      difficultyScale: 'intermediate',
      prerequisiteStrength: 'strict',
    },
  },
};

// Helper functions
export function getDomainConfig(domainId: string): DomainConfig | undefined {
  return DOMAINS[domainId];
}

export function getDomainFromCourse(courseId: string): DomainConfig | undefined {
  const course = getCourseById(courseId);
  return course ? DOMAINS[course.domain] : undefined;
}

export function getAllDomains(): DomainConfig[] {
  return Object.values(DOMAINS);
}

export function getDomainsByDifficulty(
  difficulty: DomainConfig['learningParams']['difficultyScale']
): DomainConfig[] {
  return Object.values(DOMAINS).filter(
    d => d.learningParams.difficultyScale === difficulty
  );
}
```

### 2. Update Course Type
Modify `src/types/curriculum.ts`:

```typescript
export interface Course {
  id: string;
  title: string;
  description: string;
  domain: string;  // ADD THIS - links to DomainConfig
  // ... existing fields
}
```

### 3. Update Course Registry
Modify `src/lib/content/courseRegistry.ts`:

```typescript
import { getDomainConfig, DomainConfig } from './domainConfig';

// Add domain-aware methods
export function getCoursesByDomain(domainId: string): Course[] {
  return getAllCourses().filter(c => c.domain === domainId);
}

export function getCourseWithDomainConfig(courseId: string): {
  course: Course;
  domain: DomainConfig;
} | null {
  const course = getCourseById(courseId);
  if (!course) return null;

  const domain = getDomainConfig(course.domain);
  if (!domain) return null;

  return { course, domain };
}
```

### 4. Add Domain Selector to Onboarding
Modify `src/app/onboarding/page.tsx`:

```typescript
import { getAllDomains, DomainConfig } from '@/lib/content/domainConfig';

// Add step for domain selection:
function DomainSelectionStep({ onSelect }: { onSelect: (domain: string) => void }) {
  const domains = getAllDomains();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">What do you want to learn?</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {domains.map(domain => (
          <button
            key={domain.id}
            onClick={() => onSelect(domain.id)}
            className="p-6 border-2 rounded-xl hover:border-blue-500 transition-colors text-left"
          >
            <span className="text-4xl">{domain.icon}</span>
            <h3 className="text-xl font-semibold mt-2">{domain.name}</h3>
            <p className="text-gray-600 mt-1">{domain.description}</p>

            {domain.certification && (
              <div className="mt-4 text-sm text-gray-500">
                <span className="font-medium">Certification:</span> {domain.certification.name}
              </div>
            )}

            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                {domain.learningParams.difficultyScale}
              </span>
              <span className="text-xs text-gray-500">
                ~{domain.learningParams.recommendedDailyMinutes} min/day
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 5. Use Domain Config in Adaptive System
Modify `src/lib/adaptive/sessionBuilder.ts`:

```typescript
import { getDomainFromCourse } from '@/lib/content/domainConfig';

export async function buildSession(
  userId: string,
  options: SessionOptions
): Promise<Session> {
  const domain = getDomainFromCourse(options.courseId);

  // Use domain-specific parameters
  const sessionMinutes = options.availableTimeMinutes ??
    domain?.learningParams.defaultSessionMinutes ?? 20;

  const prerequisiteStrength = domain?.learningParams.prerequisiteStrength ?? 'recommended';

  // Apply domain-specific BKT parameters if available
  const masteryParams = domain?.masteryParams ?? DEFAULT_MASTERY_PARAMS;

  // ... rest of session building
}
```

### 6. Use Domain Config in BKT
Modify initialization in `src/lib/mastery/bkt.ts` or wherever BKT is initialized:

```typescript
import { getDomainFromCourse } from '@/lib/content/domainConfig';

export function initializeBKTForUser(
  userId: string,
  courseId: string
): BKTState {
  const domain = getDomainFromCourse(courseId);

  // Use domain-specific initial mastery if available
  const pL0 = domain?.masteryParams?.initialMastery ?? 0.1;
  const pT = domain?.masteryParams?.transitionRate ?? 0.3;

  return {
    pMastery: pL0,
    // ... rest of initialization
  };
}
```

### 7. Update Dashboard to be Domain-Aware
Show domain-specific info on dashboard:

```typescript
// In dashboard component:
import { getDomainFromCourse } from '@/lib/content/domainConfig';

function CourseHeader({ courseId }: { courseId: string }) {
  const data = getCourseWithDomainConfig(courseId);
  if (!data) return null;

  const { course, domain } = data;

  return (
    <div className="flex items-center gap-4">
      <span className="text-4xl">{domain.icon}</span>
      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="text-gray-600">{domain.description}</p>

        {domain.certification && (
          <div className="mt-2 text-sm">
            Prepares for: <span className="font-medium">{domain.certification.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Onboarding shows domain selection
4. Manual test: Selecting domain shows correct courses
5. Manual test: Different domains have different session defaults
6. Manual test: Certification info shows correctly
7. Add new domain to config, verify it appears in UI

## Do NOT Modify
- Existing course content in mockData
- Skill map generator (works with any content)
- FSRS/BKT core algorithms (just the initialization)

## How to Add New Domains
After this is complete, adding a new domain is simple:

1. Add config to `DOMAINS` in `domainConfig.ts`
2. Create course content with matching `domain` field
3. System auto-generates skill map via AI
4. Done - full adaptive learning for new domain

## Output
When complete:
- System is domain-agnostic
- Easy to add new certification domains
- Domain-specific parameters applied automatically
- Users select domain during onboarding
