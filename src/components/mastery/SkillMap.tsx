'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  CheckCircle,
  BookOpen,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { AI_AT_WORK_SKILL_MAP, getSkillsByModule } from '@/data/skillMap';

// ============================================
// TYPES
// ============================================

interface SkillWithState {
  id: string;
  name: string;
  lessonId: string;
  prerequisites: string[];
  pMastery: number;
  attempts: number;
  status: 'locked' | 'learning' | 'mastered';
}

interface SkillMapProps {
  className?: string;
  showModuleFilter?: boolean;
  onSkillClick?: (skillId: string) => void;
}

interface SkillData {
  states: Array<{
    skillId: string;
    pMastery: number;
    attempts: number;
    name: string;
  }>;
  summary: {
    total: number;
    mastered: number;
    learning: number;
    notStarted: number;
    averageMastery: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getSkillStatus(
  skillId: string,
  pMastery: number,
  attempts: number,
  masteredSkills: string[]
): 'locked' | 'learning' | 'mastered' {
  if (pMastery >= 0.95) return 'mastered';

  // Check if prerequisites are met
  const skill = AI_AT_WORK_SKILL_MAP.skills[skillId];
  if (!skill) return 'locked';

  const prereqsMet = skill.prerequisites.every((prereqId) =>
    masteredSkills.includes(prereqId)
  );

  if (!prereqsMet) return 'locked';

  return 'learning';
}

// ============================================
// SKILL CARD COMPONENT
// ============================================

function SkillCard({
  skill,
  onClick,
  isExpanded,
}: {
  skill: SkillWithState;
  onClick?: () => void;
  isExpanded?: boolean;
}) {
  const statusColors = {
    locked: 'bg-light-grey border-grey/20',
    learning: 'bg-light-teal/30 border-teal/30',
    mastered: 'bg-success-light border-success/30',
  };

  const statusIcons = {
    locked: <Lock size={16} className="text-grey" />,
    learning: <BookOpen size={16} className="text-teal" />,
    mastered: <CheckCircle size={16} className="text-success" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md',
        statusColors[skill.status],
        isExpanded && 'ring-2 ring-teal'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {statusIcons[skill.status]}
          <span
            className={cn(
              'text-sm font-medium truncate',
              skill.status === 'locked' ? 'text-grey' : 'text-navy'
            )}
          >
            {skill.name}
          </span>
        </div>
        {skill.status !== 'locked' && (
          <span
            className={cn(
              'text-xs font-semibold whitespace-nowrap',
              skill.status === 'mastered' ? 'text-success' : 'text-teal'
            )}
          >
            {Math.round(skill.pMastery * 100)}%
          </span>
        )}
      </div>

      {skill.status !== 'locked' && (
        <div className="mt-2">
          <ProgressBar
            value={skill.pMastery * 100}
            size="sm"
            color={skill.status === 'mastered' ? 'success' : 'teal'}
          />
        </div>
      )}

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-grey/20"
        >
          <div className="space-y-1 text-xs text-rich-black/60">
            <p>Lesson: {skill.lessonId}</p>
            <p>Attempts: {skill.attempts}</p>
            {skill.prerequisites.length > 0 && (
              <p>Prerequisites: {skill.prerequisites.length}</p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// MODULE SECTION COMPONENT
// ============================================

function ModuleSection({
  moduleNum,
  skills,
  selectedSkill,
  onSkillClick,
}: {
  moduleNum: string;
  skills: SkillWithState[];
  selectedSkill: string | null;
  onSkillClick?: (skillId: string) => void;
}) {
  const moduleNames: Record<string, string> = {
    '1': 'Module 1: Foundations',
    '2': 'Module 2: Prompting Fundamentals',
    '3': 'Module 3: Advanced Prompting & Custom GPTs',
    '4': 'Module 4: No-Code AI Agents',
  };

  const masteredCount = skills.filter((s) => s.status === 'mastered').length;
  const learningCount = skills.filter((s) => s.status === 'learning').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-navy">{moduleNames[moduleNum]}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-success font-medium">{masteredCount} mastered</span>
          <span className="text-rich-black/40">|</span>
          <span className="text-teal font-medium">{learningCount} learning</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onClick={() => onSkillClick?.(skill.id)}
            isExpanded={selectedSkill === skill.id}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// SUMMARY STATS COMPONENT
// ============================================

function SummaryStats({
  summary,
}: {
  summary: {
    total: number;
    mastered: number;
    learning: number;
    notStarted: number;
    averageMastery: number;
  };
}) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="text-center p-3 bg-light-grey rounded-lg">
        <p className="text-2xl font-bold text-navy">{summary.total}</p>
        <p className="text-xs text-rich-black/60">Total Skills</p>
      </div>
      <div className="text-center p-3 bg-success-light rounded-lg">
        <p className="text-2xl font-bold text-success">{summary.mastered}</p>
        <p className="text-xs text-rich-black/60">Mastered</p>
      </div>
      <div className="text-center p-3 bg-light-teal rounded-lg">
        <p className="text-2xl font-bold text-teal">{summary.learning}</p>
        <p className="text-xs text-rich-black/60">Learning</p>
      </div>
      <div className="text-center p-3 bg-light-grey rounded-lg">
        <p className="text-2xl font-bold text-grey">{summary.notStarted}</p>
        <p className="text-xs text-rich-black/60">Not Started</p>
      </div>
    </div>
  );
}

// ============================================
// MAIN SKILL MAP COMPONENT
// ============================================

export function SkillMap({ className, showModuleFilter = true, onSkillClick }: SkillMapProps) {
  const [skillData, setSkillData] = useState<SkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | 'all'>('all');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // Fetch skill data
  useEffect(() => {
    async function fetchSkills() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/skills');
        const data = await response.json();

        if (data.success) {
          setSkillData(data.data);
        } else {
          setError(data.error || 'Failed to load skills');
        }
      } catch (err) {
        console.error('Error fetching skills:', err);
        setError('Failed to load skills');
      } finally {
        setLoading(false);
      }
    }

    fetchSkills();
  }, []);

  // Process skills with states
  const skillsWithStates = useMemo(() => {
    if (!skillData) return {};

    const statesMap = new Map(
      skillData.states.map((s) => [s.skillId, { pMastery: s.pMastery, attempts: s.attempts }])
    );

    const masteredSkills = skillData.states
      .filter((s) => s.pMastery >= 0.95)
      .map((s) => s.skillId);

    const byModule = getSkillsByModule();

    const result: Record<string, SkillWithState[]> = {};

    for (const [moduleNum, skills] of Object.entries(byModule)) {
      result[moduleNum] = skills.map((skill) => {
        const state = statesMap.get(skill.id);
        const pMastery = state?.pMastery ?? 0;
        const attempts = state?.attempts ?? 0;

        return {
          id: skill.id,
          name: skill.name,
          lessonId: skill.lessonId,
          prerequisites: skill.prerequisites,
          pMastery,
          attempts,
          status: getSkillStatus(skill.id, pMastery, attempts, masteredSkills),
        };
      });
    }

    return result;
  }, [skillData]);

  // Handle skill click
  const handleSkillClick = (skillId: string) => {
    setSelectedSkill((prev) => (prev === skillId ? null : skillId));
    onSkillClick?.(skillId);
  };

  if (loading) {
    return (
      <Card variant="elevated" padding="lg" className={className}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-teal" />
          <span className="ml-2 text-rich-black/60">Loading skills...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" padding="lg" className={className}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle size={32} className="text-error mb-2" />
          <p className="text-rich-black/60">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!skillData) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Stats */}
      <Card variant="elevated" padding="lg">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/20 flex items-center justify-center">
            <TrendingUp size={20} className="text-teal" />
          </div>
          <div>
            <CardTitle>Skills Overview</CardTitle>
            <p className="text-sm text-rich-black/60">
              AI at Work Course - {skillData.summary.total} skills
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <SummaryStats summary={skillData.summary} />

          {/* Overall Progress */}
          <div className="mt-4 pt-4 border-t border-light-grey">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-navy">Overall Mastery</span>
              <span className="text-sm font-semibold text-teal">
                {Math.round(skillData.summary.averageMastery * 100)}%
              </span>
            </div>
            <ProgressBar
              value={skillData.summary.averageMastery * 100}
              size="md"
              color="teal"
            />
          </div>
        </CardContent>
      </Card>

      {/* Module Filter */}
      {showModuleFilter && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedModule === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedModule('all')}
          >
            All Modules
          </Button>
          {['1', '2', '3', '4'].map((m) => (
            <Button
              key={m}
              variant={selectedModule === m ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedModule(m)}
            >
              Module {m}
            </Button>
          ))}
        </div>
      )}

      {/* Skill Grid by Module */}
      <div className="space-y-6">
        {Object.entries(skillsWithStates)
          .filter(([moduleNum]) => selectedModule === 'all' || selectedModule === moduleNum)
          .map(([moduleNum, skills]) => (
            <ModuleSection
              key={moduleNum}
              moduleNum={moduleNum}
              skills={skills}
              selectedSkill={selectedSkill}
              onSkillClick={handleSkillClick}
            />
          ))}
      </div>

      {/* Legend */}
      <Card variant="outlined" padding="md">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success-light border-2 border-success/30" />
            <span className="text-rich-black/60">Mastered (95%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-light-teal border-2 border-teal/30" />
            <span className="text-rich-black/60">Learning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-light-grey border-2 border-grey/20" />
            <span className="text-rich-black/60">Locked (prerequisites not met)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
