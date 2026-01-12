'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineBadge } from '@/components/ui/Badge';
import {
  FlaskConical,
  ChevronRight,
  ChevronLeft,
  Check,
  Users,
  Target,
  Settings,
  BarChart3,
  Calendar,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExperimentConfig {
  useAdaptiveSequencing: boolean;
  useStruggleDetection: boolean;
  useProactiveCoach: boolean;
  usePretests: boolean;
  useContentVariants: boolean;
  useSocraticMode: boolean;
}

interface ExperimentFormData {
  name: string;
  description: string;
  controlConfig: ExperimentConfig;
  treatmentConfig: ExperimentConfig;
  allocation: {
    control: number;
    treatment: number;
  };
  targetAudience: 'all' | 'new_users' | 'specific_courses';
  targetCourses: string[];
  metrics: string[];
  sampleSizeTarget: number;
  startDate: string;
  endDate: string;
}

interface CreateExperimentFormProps {
  onSubmit: (data: ExperimentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const defaultConfig: ExperimentConfig = {
  useAdaptiveSequencing: true,
  useStruggleDetection: true,
  useProactiveCoach: true,
  usePretests: true,
  useContentVariants: true,
  useSocraticMode: false,
};

const availableMetrics = [
  { id: 'courseCompletionRate', label: 'Course Completion Rate', description: 'Percentage who finish full course' },
  { id: 'lessonCompletionRate', label: 'Lesson Completion Rate', description: 'Percentage who finish lessons they start' },
  { id: 'skillMasteryRate', label: 'Skill Mastery Rate', description: 'Percentage of skills reaching 95% mastery' },
  { id: 'averageTimeToMastery', label: 'Time to Mastery', description: 'Minutes to reach mastery per skill' },
  { id: 'retentionRate', label: 'Retention Rate', description: 'Percentage retained on delayed test' },
  { id: 'quizAccuracy', label: 'Quiz Accuracy', description: 'Average quiz score' },
  { id: 'returnRate.day1', label: 'Day 1 Return', description: 'Percentage who return next day' },
  { id: 'returnRate.day7', label: 'Day 7 Return', description: 'Percentage who return within week' },
  { id: 'interventionSuccessRate', label: 'Intervention Success', description: 'Percentage of struggles resolved' },
  { id: 'coachUtilization', label: 'Coach Utilization', description: 'Percentage of sessions using coach' },
  { id: 'contentSkipRate', label: 'Content Skip Rate', description: 'Percentage of content skipped via pre-tests' },
];

const featureLabels: Record<keyof ExperimentConfig, { label: string; description: string }> = {
  useAdaptiveSequencing: { label: 'Adaptive Sequencing', description: 'Dynamically adjust learning path based on performance' },
  useStruggleDetection: { label: 'Struggle Detection', description: 'Detect when users are struggling and intervene' },
  useProactiveCoach: { label: 'Proactive Coach', description: 'Coach proactively offers help before being asked' },
  usePretests: { label: 'Pre-tests', description: 'Allow skipping content based on pre-test performance' },
  useContentVariants: { label: 'Content Variants', description: 'Show different content variants based on learning style' },
  useSocraticMode: { label: 'Socratic Mode', description: 'Coach uses questioning instead of direct answers' },
};

const allocationOptions = [
  { control: 0.5, treatment: 0.5, label: '50/50' },
  { control: 0.3, treatment: 0.7, label: '30/70' },
  { control: 0.2, treatment: 0.8, label: '20/80' },
  { control: 0.1, treatment: 0.9, label: '10/90' },
];

const STEPS = [
  { id: 'basics', label: 'Basics', icon: FlaskConical },
  { id: 'variants', label: 'Variants', icon: Settings },
  { id: 'audience', label: 'Audience', icon: Users },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
];

export function CreateExperimentForm({ onSubmit, onCancel, isLoading }: CreateExperimentFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ExperimentFormData>({
    name: '',
    description: '',
    controlConfig: { ...defaultConfig },
    treatmentConfig: { ...defaultConfig },
    allocation: { control: 0.5, treatment: 0.5 },
    targetAudience: 'all',
    targetCourses: [],
    metrics: ['courseCompletionRate', 'skillMasteryRate', 'retentionRate'],
    sampleSizeTarget: 200,
    startDate: '',
    endDate: '',
  });

  const updateFormData = (updates: Partial<ExperimentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const toggleFeature = (variant: 'control' | 'treatment', feature: keyof ExperimentConfig) => {
    const configKey = variant === 'control' ? 'controlConfig' : 'treatmentConfig';
    setFormData(prev => ({
      ...prev,
      [configKey]: {
        ...prev[configKey],
        [feature]: !prev[configKey][feature],
      },
    }));
  };

  const toggleMetric = (metricId: string) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(m => m !== metricId)
        : [...prev.metrics, metricId],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basics
        return formData.name.trim() !== '' && formData.description.trim() !== '';
      case 1: // Variants
        return true;
      case 2: // Audience
        return formData.targetAudience !== 'specific_courses' || formData.targetCourses.length > 0;
      case 3: // Metrics
        return formData.metrics.length >= 1;
      case 4: // Schedule
        return formData.sampleSizeTarget > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Experiment Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="e.g., Socratic Sage vs Standard Coach"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Describe what you're testing and why..."
                className="w-full px-4 py-3 rounded-lg border border-grey focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all resize-none"
                rows={4}
              />
            </div>
            <div className="p-4 bg-light-teal/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                <div className="text-sm text-rich-black/70">
                  <p className="font-medium text-navy mb-1">Good experiment names are:</p>
                  <ul className="list-disc list-inside space-y-1 text-rich-black/60">
                    <li>Descriptive of what is being tested</li>
                    <li>Clear about control vs treatment</li>
                    <li>Easy to remember and reference</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {/* Traffic Allocation */}
            <div>
              <label className="block text-sm font-medium text-navy mb-3">
                Traffic Allocation
              </label>
              <div className="flex gap-2">
                {allocationOptions.map(option => (
                  <button
                    key={option.label}
                    onClick={() => updateFormData({ allocation: { control: option.control, treatment: option.treatment } })}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-lg border-2 transition-all',
                      formData.allocation.control === option.control
                        ? 'border-teal bg-teal/10 text-teal'
                        : 'border-grey hover:border-muted-teal text-rich-black/60'
                    )}
                  >
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs opacity-60">Control / Treatment</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Variant Configurations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Control */}
              <Card variant="default" padding="md" className="border-2 border-grey">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-grey" />
                    <CardTitle className="text-base">Control Group</CardTitle>
                    <InlineBadge variant="default" size="sm">{formData.allocation.control * 100}%</InlineBadge>
                  </div>
                  <CardDescription className="text-xs">
                    Features enabled for the control group
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {(Object.keys(featureLabels) as (keyof ExperimentConfig)[]).map(feature => (
                      <button
                        key={feature}
                        onClick={() => toggleFeature('control', feature)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left',
                          formData.controlConfig[feature]
                            ? 'border-success bg-success-light/50'
                            : 'border-light-grey hover:border-grey'
                        )}
                      >
                        <div>
                          <div className="text-sm font-medium text-navy">{featureLabels[feature].label}</div>
                          <div className="text-xs text-rich-black/50">{featureLabels[feature].description}</div>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center',
                          formData.controlConfig[feature] ? 'bg-success text-white' : 'bg-light-grey'
                        )}>
                          {formData.controlConfig[feature] && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Treatment */}
              <Card variant="default" padding="md" className="border-2 border-teal">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal" />
                    <CardTitle className="text-base">Treatment Group</CardTitle>
                    <InlineBadge variant="teal" size="sm">{formData.allocation.treatment * 100}%</InlineBadge>
                  </div>
                  <CardDescription className="text-xs">
                    Features enabled for the treatment group
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {(Object.keys(featureLabels) as (keyof ExperimentConfig)[]).map(feature => (
                      <button
                        key={feature}
                        onClick={() => toggleFeature('treatment', feature)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left',
                          formData.treatmentConfig[feature]
                            ? 'border-success bg-success-light/50'
                            : 'border-light-grey hover:border-grey'
                        )}
                      >
                        <div>
                          <div className="text-sm font-medium text-navy">{featureLabels[feature].label}</div>
                          <div className="text-xs text-rich-black/50">{featureLabels[feature].description}</div>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center',
                          formData.treatmentConfig[feature] ? 'bg-success text-white' : 'bg-light-grey'
                        )}>
                          {formData.treatmentConfig[feature] && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy mb-3">
                Target Audience
              </label>
              <div className="space-y-3">
                {[
                  { id: 'all', label: 'All Users', description: 'Include all users in the experiment' },
                  { id: 'new_users', label: 'New Users Only', description: 'Only include users who sign up after experiment starts' },
                  { id: 'specific_courses', label: 'Specific Courses', description: 'Only include users enrolled in specific courses' },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData({ targetAudience: option.id as ExperimentFormData['targetAudience'] })}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                      formData.targetAudience === option.id
                        ? 'border-teal bg-teal/5'
                        : 'border-grey hover:border-muted-teal'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      formData.targetAudience === option.id
                        ? 'border-teal bg-teal'
                        : 'border-grey'
                    )}>
                      {formData.targetAudience === option.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-navy">{option.label}</div>
                      <div className="text-sm text-rich-black/60">{option.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {formData.targetAudience === 'specific_courses' && (
              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  Select Courses
                </label>
                <Input
                  placeholder="Enter course IDs separated by commas"
                  value={formData.targetCourses.join(', ')}
                  onChange={(e) => updateFormData({
                    targetCourses: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
                <p className="text-xs text-rich-black/50 mt-1">
                  e.g., ai-at-work, data-science-101
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy mb-3">
                Success Metrics
                <span className="text-rich-black/50 font-normal ml-2">
                  (Select at least 1)
                </span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableMetrics.map(metric => (
                  <button
                    key={metric.id}
                    onClick={() => toggleMetric(metric.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                      formData.metrics.includes(metric.id)
                        ? 'border-teal bg-teal/5'
                        : 'border-light-grey hover:border-grey'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                      formData.metrics.includes(metric.id)
                        ? 'bg-teal text-white'
                        : 'bg-light-grey'
                    )}>
                      {formData.metrics.includes(metric.id) && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy">{metric.label}</div>
                      <div className="text-xs text-rich-black/50">{metric.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-light-grey rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-navy" />
                <span className="font-medium text-navy">Selected Metrics ({formData.metrics.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.metrics.map(metricId => {
                  const metric = availableMetrics.find(m => m.id === metricId);
                  return (
                    <InlineBadge key={metricId} variant="teal" size="sm">
                      {metric?.label || metricId}
                    </InlineBadge>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Target Sample Size
              </label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={10}
                  max={10000}
                  value={formData.sampleSizeTarget}
                  onChange={(e) => updateFormData({ sampleSizeTarget: parseInt(e.target.value) || 200 })}
                  className="w-32"
                />
                <span className="text-sm text-rich-black/60">total users</span>
              </div>
              <p className="text-xs text-rich-black/50 mt-1">
                Recommended: 200+ users for statistically significant results
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  Start Date (Optional)
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateFormData({ startDate: e.target.value })}
                />
                <p className="text-xs text-rich-black/50 mt-1">
                  Leave empty to start manually
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  End Date (Optional)
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateFormData({ endDate: e.target.value })}
                />
                <p className="text-xs text-rich-black/50 mt-1">
                  Leave empty for no end date
                </p>
              </div>
            </div>

            {/* Summary */}
            <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-light-teal/50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Experiment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-rich-black/60">Name</span>
                    <span className="font-medium text-navy">{formData.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rich-black/60">Traffic Split</span>
                    <span className="font-medium text-navy">
                      {formData.allocation.control * 100}% / {formData.allocation.treatment * 100}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rich-black/60">Target Audience</span>
                    <span className="font-medium text-navy capitalize">
                      {formData.targetAudience.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rich-black/60">Sample Size</span>
                    <span className="font-medium text-navy">{formData.sampleSizeTarget} users</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rich-black/60">Metrics</span>
                    <span className="font-medium text-navy">{formData.metrics.length} selected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index < currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-teal text-white'
                      : isCompleted
                      ? 'bg-success-light text-success cursor-pointer hover:bg-success/20'
                      : 'bg-light-grey text-rich-black/40 cursor-not-allowed'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'w-8 h-0.5 mx-2',
                    isCompleted ? 'bg-success' : 'bg-light-grey'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card variant="elevated" padding="lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <CardFooter className="mt-8 pt-6 border-t border-light-grey flex justify-between">
          <div>
            {currentStep > 0 ? (
              <Button
                variant="ghost"
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
          <div>
            {currentStep < STEPS.length - 1 ? (
              <Button
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
              >
                Continue
              </Button>
            ) : (
              <Button
                leftIcon={<FlaskConical className="w-4 h-4" />}
                onClick={handleSubmit}
                disabled={!canProceed()}
                isLoading={isLoading}
              >
                Create Experiment
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
