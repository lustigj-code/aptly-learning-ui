'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Award,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExamDatePicker } from '@/components/certification/ExamDatePicker';
import { cn } from '@/lib/utils';

type ExamModeSettingsProps = {
  userId: string;
  examDate: Date | null;
  targetRetention: number;
  examModeEnabled: boolean;
  onUpdate: (settings: {
    certificationExamDate?: string | null;
    targetRetention?: number;
    examModeEnabled?: boolean;
  }) => Promise<void>;
};

export function ExamModeSettings({
  userId,
  examDate,
  targetRetention,
  examModeEnabled,
  onUpdate,
}: ExamModeSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(examModeEnabled);
  const [selectedDate, setSelectedDate] = useState<string>(
    examDate ? new Date(examDate).toISOString().split('T')[0] : ''
  );
  const [retention, setRetention] = useState(targetRetention * 100 || 95);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Calculate days until exam
  const daysUntilExam = selectedDate
    ? Math.ceil((new Date(selectedDate).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    : null;

  const handleToggleExamMode = async () => {
    setIsSaving(true);
    try {
      const newEnabled = !isEnabled;
      await onUpdate({ examModeEnabled: newEnabled });
      setIsEnabled(newEnabled);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    if (date) {
      setIsSaving(true);
      try {
        await onUpdate({
          certificationExamDate: new Date(date).toISOString(),
          examModeEnabled: true,
        });
        setIsEnabled(true);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRetentionChange = async (value: number) => {
    setRetention(value);
  };

  const handleRetentionBlur = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ targetRetention: retention / 100 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearExamDate = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        certificationExamDate: null,
        examModeEnabled: false,
      });
      setSelectedDate('');
      setIsEnabled(false);
      setShowConfirmClear(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award size={20} className="text-purple" />
          Certification Exam Mode
        </CardTitle>
        <CardDescription>
          Set your exam date to optimize your review schedule for certification success
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-light-grey/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="text-rich-black/40">
              <Target size={18} />
            </div>
            <div>
              <p className="font-medium text-navy">Enable Exam Mode</p>
              <p className="text-sm text-rich-black/60">
                Track your certification exam readiness
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleExamMode}
            disabled={isSaving}
            className={cn(
              'w-12 h-7 rounded-full transition-colors relative',
              isEnabled ? 'bg-purple' : 'bg-grey'
            )}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
              animate={{ left: isEnabled ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Exam Date Picker - Using enhanced component */}
        <div className={cn(!isEnabled && 'opacity-50 pointer-events-none')}>
          <label className="block text-sm font-medium text-navy mb-2">
            Certification Exam Date
          </label>
          <ExamDatePicker
            value={selectedDate ? new Date(selectedDate) : null}
            onChange={(date) => handleDateChange(date ? date.toISOString().split('T')[0] : '')}
            onClear={() => setShowConfirmClear(true)}
            disabled={!isEnabled}
            showDaysRemaining={true}
          />
        </div>

        {/* Target Retention Slider */}
        <div className={cn(!isEnabled && 'opacity-50 pointer-events-none')}>
          <label className="block text-sm font-medium text-navy mb-2">
            Target Retention Rate
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="80"
              max="99"
              value={retention}
              onChange={(e) => handleRetentionChange(parseInt(e.target.value))}
              onMouseUp={handleRetentionBlur}
              onTouchEnd={handleRetentionBlur}
              className="flex-1 h-2 bg-grey/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-purple [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              disabled={!isEnabled}
            />
            <span className="w-14 text-center font-bold text-purple">
              {retention}%
            </span>
          </div>
          <p className="text-xs text-rich-black/60 mt-1">
            Higher retention requires more frequent reviews
          </p>
        </div>

        {/* Workload Preview */}
        {isEnabled && selectedDate && daysUntilExam && daysUntilExam > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-purple/5 rounded-xl border border-purple/20"
          >
            <h4 className="font-medium text-navy flex items-center gap-2 mb-2">
              <Target size={16} className="text-purple" />
              Study Plan Preview
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-rich-black/60">Days remaining</p>
                <p className="font-bold text-navy">{daysUntilExam}</p>
              </div>
              <div>
                <p className="text-rich-black/60">Target retention</p>
                <p className="font-bold text-purple">{retention}%</p>
              </div>
            </div>
            <p className="text-xs text-rich-black/60 mt-3">
              Your dashboard will show exam readiness and daily review recommendations.
            </p>
          </motion.div>
        )}

        {/* Saving indicator */}
        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-sm text-rich-black/60">
            <Loader2 size={16} className="animate-spin" />
            Saving...
          </div>
        )}

        {/* Confirm Clear Modal */}
        {showConfirmClear && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl"
            >
              <h3 className="font-semibold text-navy text-lg mb-2">
                Clear Exam Date?
              </h3>
              <p className="text-rich-black/60 text-sm mb-4">
                This will disable Exam Mode and remove your certification exam tracking.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowConfirmClear(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-error hover:bg-error/90"
                  onClick={handleClearExamDate}
                >
                  Clear
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
