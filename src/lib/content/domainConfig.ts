/**
 * Domain Configuration
 *
 * Defines domain-specific settings for different certification areas.
 * This makes the platform content-agnostic and extensible to any domain.
 */

// ============================================
// TYPES
// ============================================

export interface CertificationInfo {
  name: string;
  provider: string;
  examDuration: number; // minutes
  passingScore: number; // percentage
  examUrl?: string;
}

export interface LearningParams {
  defaultSessionMinutes: number;
  recommendedDailyMinutes: number;
  difficultyScale: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  prerequisiteStrength: 'strict' | 'recommended' | 'none';
}

export interface MasteryParams {
  /** Initial mastery probability for new concepts (0-1) */
  initialMastery: number;
  /** BKT transition rate - probability of learning after correct answer */
  transitionRate: number;
  /** Target retention for spaced repetition (0-1) */
  targetRetention: number;
  /** Minimum mastery threshold to consider a concept "learned" */
  masteryThreshold: number;
}

export interface DomainConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class (e.g., 'teal', 'purple', 'yellow')
  certification?: CertificationInfo;
  learningParams: LearningParams;
  masteryParams: MasteryParams;
  /** Keywords for search and filtering */
  keywords: string[];
  /** Whether this domain is currently active/available */
  isActive: boolean;
}

// ============================================
// DOMAIN CONFIGURATIONS
// ============================================

export const DOMAINS: Record<string, DomainConfig> = {
  'ai-at-work': {
    id: 'ai-at-work',
    name: 'AI at Work',
    slug: 'ai-at-work',
    description: 'Master ChatGPT and AI tools for professional success. Learn prompting, custom GPTs, and no-code automation.',
    icon: 'Brain',
    color: 'purple',
    certification: {
      name: 'AI Productivity Professional',
      provider: 'Aptly Learning',
      examDuration: 60,
      passingScore: 70,
    },
    learningParams: {
      defaultSessionMinutes: 20,
      recommendedDailyMinutes: 15,
      difficultyScale: 'intermediate',
      prerequisiteStrength: 'recommended',
    },
    masteryParams: {
      initialMastery: 0.2,
      transitionRate: 0.4,
      targetRetention: 0.9,
      masteryThreshold: 0.8,
    },
    keywords: ['ai', 'chatgpt', 'automation', 'productivity', 'prompt engineering'],
    isActive: true,
  },

  'social-media-marketing': {
    id: 'social-media-marketing',
    name: 'Social Media Marketing',
    slug: 'social-media-marketing',
    description: 'Prepare for the Meta Marketing Professional certification. Master social media strategy, advertising, and analytics.',
    icon: 'Share2',
    color: 'teal',
    certification: {
      name: 'Meta Marketing Professional',
      provider: 'Meta',
      examDuration: 105,
      passingScore: 70,
      examUrl: 'https://www.facebook.com/business/learn/certification',
    },
    learningParams: {
      defaultSessionMinutes: 30,
      recommendedDailyMinutes: 20,
      difficultyScale: 'intermediate',
      prerequisiteStrength: 'strict',
    },
    masteryParams: {
      initialMastery: 0.15,
      transitionRate: 0.35,
      targetRetention: 0.95,
      masteryThreshold: 0.85,
    },
    keywords: ['meta', 'facebook', 'instagram', 'advertising', 'social media', 'marketing'],
    isActive: true,
  },

  // Future domain template
  'data-analytics': {
    id: 'data-analytics',
    name: 'Data Analytics',
    slug: 'data-analytics',
    description: 'Learn data analysis fundamentals with Excel, SQL, and visualization tools. Prepare for industry certifications.',
    icon: 'BarChart3',
    color: 'navy',
    certification: {
      name: 'Data Analytics Professional',
      provider: 'Aptly Learning',
      examDuration: 90,
      passingScore: 75,
    },
    learningParams: {
      defaultSessionMinutes: 25,
      recommendedDailyMinutes: 20,
      difficultyScale: 'intermediate',
      prerequisiteStrength: 'recommended',
    },
    masteryParams: {
      initialMastery: 0.15,
      transitionRate: 0.3,
      targetRetention: 0.9,
      masteryThreshold: 0.85,
    },
    keywords: ['data', 'analytics', 'excel', 'sql', 'visualization', 'statistics'],
    isActive: false, // Not yet launched
  },

  'project-management': {
    id: 'project-management',
    name: 'Project Management',
    slug: 'project-management',
    description: 'Master project management methodologies and prepare for PMP, CAPM, or Agile certifications.',
    icon: 'FolderKanban',
    color: 'yellow',
    learningParams: {
      defaultSessionMinutes: 30,
      recommendedDailyMinutes: 25,
      difficultyScale: 'advanced',
      prerequisiteStrength: 'recommended',
    },
    masteryParams: {
      initialMastery: 0.1,
      transitionRate: 0.25,
      targetRetention: 0.95,
      masteryThreshold: 0.9,
    },
    keywords: ['project management', 'pmp', 'agile', 'scrum', 'planning'],
    isActive: false, // Not yet launched
  },
};

// ============================================
// LOOKUP FUNCTIONS
// ============================================

/**
 * Get domain configuration by ID
 */
export function getDomainConfig(domainId: string): DomainConfig | undefined {
  return DOMAINS[domainId];
}

/**
 * Get domain configuration from a course ID
 * Assumes course IDs follow pattern: domain-id or match domain slug
 */
export function getDomainFromCourse(courseId: string): DomainConfig | undefined {
  // Direct match
  if (DOMAINS[courseId]) {
    return DOMAINS[courseId];
  }

  // Check if course ID starts with any domain ID
  for (const domain of Object.values(DOMAINS)) {
    if (courseId.startsWith(domain.id) || courseId.startsWith(domain.slug)) {
      return domain;
    }
  }

  // Check social media marketing courses (course-1 through course-5)
  if (/^course-\d+$/.test(courseId)) {
    return DOMAINS['social-media-marketing'];
  }

  return undefined;
}

/**
 * Get all domain configurations
 */
export function getAllDomains(): DomainConfig[] {
  return Object.values(DOMAINS);
}

/**
 * Get all active domains (available for users to select)
 */
export function getActiveDomains(): DomainConfig[] {
  return Object.values(DOMAINS).filter(domain => domain.isActive);
}

/**
 * Get domain by slug (URL-friendly identifier)
 */
export function getDomainBySlug(slug: string): DomainConfig | undefined {
  return Object.values(DOMAINS).find(domain => domain.slug === slug);
}

/**
 * Search domains by keyword
 */
export function searchDomains(query: string): DomainConfig[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(DOMAINS).filter(domain =>
    domain.isActive && (
      domain.name.toLowerCase().includes(lowerQuery) ||
      domain.description.toLowerCase().includes(lowerQuery) ||
      domain.keywords.some(kw => kw.includes(lowerQuery))
    )
  );
}

/**
 * Get the default domain for new users
 */
export function getDefaultDomain(): DomainConfig {
  return DOMAINS['ai-at-work'];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get color class for domain
 */
export function getDomainColorClass(domainId: string, variant: 'bg' | 'text' | 'border' = 'bg'): string {
  const domain = getDomainConfig(domainId);
  if (!domain) return `${variant}-grey`;

  const colorMap: Record<string, string> = {
    purple: variant === 'bg' ? 'bg-purple' : variant === 'text' ? 'text-purple' : 'border-purple',
    teal: variant === 'bg' ? 'bg-teal' : variant === 'text' ? 'text-teal' : 'border-teal',
    navy: variant === 'bg' ? 'bg-navy' : variant === 'text' ? 'text-navy' : 'border-navy',
    yellow: variant === 'bg' ? 'bg-yellow' : variant === 'text' ? 'text-yellow' : 'border-yellow',
  };

  return colorMap[domain.color] || `${variant}-grey`;
}

/**
 * Get light color class for domain (for backgrounds)
 */
export function getDomainLightColorClass(domainId: string): string {
  const domain = getDomainConfig(domainId);
  if (!domain) return 'bg-light-grey';

  const colorMap: Record<string, string> = {
    purple: 'bg-purple/10',
    teal: 'bg-light-teal',
    navy: 'bg-navy/10',
    yellow: 'bg-yellow/10',
  };

  return colorMap[domain.color] || 'bg-light-grey';
}

/**
 * Check if user has completed a domain's certification
 * (placeholder for future certification tracking)
 */
export function isDomainCertified(
  domainId: string,
  userCertifications: string[]
): boolean {
  return userCertifications.includes(domainId);
}

/**
 * Get estimated weeks to complete domain based on daily study time
 */
export function getEstimatedWeeksToComplete(
  domainId: string,
  totalHours: number,
  dailyMinutes?: number
): number {
  const domain = getDomainConfig(domainId);
  const minutes = dailyMinutes || domain?.learningParams.recommendedDailyMinutes || 20;
  const totalMinutes = totalHours * 60;
  const daysNeeded = Math.ceil(totalMinutes / minutes);
  return Math.ceil(daysNeeded / 7);
}
