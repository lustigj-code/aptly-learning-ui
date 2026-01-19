/**
 * Skill Recommendations Component
 *
 * Displays skills in the Zone of Proximal Development (ZPD) that
 * the user is optimally ready to learn, based on hybrid ML model.
 *
 * Research-backed: Skills at 0.4-0.7 mastery are optimal for learning
 */

'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  TrendingUp,
  ChevronRight,
  Brain,
  CheckCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CircularProgress } from '@/components/ui/ProgressBar';
import { useSkillsReady, type SkillRecommendation } from '@/hooks/useSkillsReady';
import { cn } from '@/lib/utils';

interface SkillRecommendationsProps {
  maxDisplay?: number;
  showModelInfo?: boolean;
}

export function SkillRecommendations({
  maxDisplay = 4,
  showModelInfo = false,
}: SkillRecommendationsProps) {
  const router = useRouter();
  const { data, isLoading, error, topRecommendations, almostMasteredSkills } = useSkillsReady();

  if (isLoading) {
    return (
      <Card variant="elevated" padding="lg" className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-purple" />
            Recommended Next
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-light-grey/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Gracefully hide on error
  }

  const displaySkills = topRecommendations.slice(0, maxDisplay);

  if (displaySkills.length === 0) {
    return (
      <Card variant="elevated" padding="lg" className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="w-5 h-5 text-success" />
            Great Progress!
          </CardTitle>
          <CardDescription>
            You&apos;ve mastered the available skills. New content coming soon!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-purple" />
            Recommended Next
          </CardTitle>
          <CardDescription>
            Skills you&apos;re ready to master based on your progress
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          rightIcon={<ChevronRight size={16} />}
          onClick={() => router.push('/mastery')}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {displaySkills.map((skill, index) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SkillCard
              skill={skill}
              onClick={() => router.push(`/learn?skill=${skill.id}`)}
            />
          </motion.div>
        ))}

        {/* Almost Mastered Section */}
        {almostMasteredSkills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-grey/20">
            <p className="text-xs text-rich-black/60 mb-3 flex items-center gap-1">
              <TrendingUp size={12} />
              Almost mastered - just a bit more practice!
            </p>
            <div className="flex flex-wrap gap-2">
              {almostMasteredSkills.slice(0, 3).map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => router.push(`/learn?skill=${skill.id}`)}
                  className="px-3 py-1.5 text-xs bg-success/10 text-success-dark rounded-full hover:bg-success/20 transition-colors flex items-center gap-1"
                >
                  <span>{skill.name}</span>
                  <span className="text-success">{Math.round(skill.pMastery * 100)}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Model Info (for debugging/transparency) */}
        {showModelInfo && data.modelInfo && (
          <div className="mt-4 pt-4 border-t border-grey/20">
            <p className="text-xs text-rich-black/40">
              Model: {data.modelInfo.currentModel} ({data.modelInfo.interactionCount} interactions)
              {data.modelInfo.interactionsToHybrid > 0 && (
                <span> • {data.modelInfo.interactionsToHybrid} more for personalized predictions</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SkillCardProps {
  skill: SkillRecommendation;
  onClick: () => void;
}

function SkillCard({ skill, onClick }: SkillCardProps) {
  const masteryPercent = Math.round(skill.pMastery * 100);
  const isAlmostMastered = skill.pMastery >= 0.7;
  const isInZPD = skill.inZPD;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg border-2 transition-all text-left',
        'hover:shadow-md hover:border-teal/50',
        isAlmostMastered
          ? 'bg-success/5 border-success/30'
          : isInZPD
          ? 'bg-purple/5 border-purple/30'
          : 'bg-light-grey/30 border-grey/20'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Progress indicator */}
        <CircularProgress
          value={masteryPercent}
          size={40}
          strokeWidth={4}
          color={isAlmostMastered ? 'success' : isInZPD ? 'purple' : 'teal'}
        />

        {/* Skill info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-navy text-sm truncate">{skill.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-rich-black/60">
              {masteryPercent}% mastery
            </span>
            {isInZPD && (
              <span className="text-xs px-1.5 py-0.5 bg-purple/10 text-purple rounded">
                Optimal
              </span>
            )}
            {isAlmostMastered && (
              <span className="text-xs px-1.5 py-0.5 bg-success/10 text-success-dark rounded">
                Almost there!
              </span>
            )}
            {skill.modelUsed === 'hybrid' && (
              <span className="text-xs px-1.5 py-0.5 bg-teal/10 text-teal rounded flex items-center gap-0.5">
                <Brain size={10} />
                AI
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight size={20} className="text-grey flex-shrink-0" />
      </div>

      {/* Confidence bar */}
      {skill.confidence > 0 && (
        <div className="mt-2 pt-2 border-t border-grey/10">
          <div className="flex items-center justify-between text-xs text-rich-black/40">
            <span>Confidence</span>
            <span>{Math.round(skill.confidence * 100)}%</span>
          </div>
          <div className="h-1 bg-grey/20 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all"
              style={{ width: `${skill.confidence * 100}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

export default SkillRecommendations;
