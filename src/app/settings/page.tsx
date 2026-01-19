'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Volume2,
  Moon,
  Target,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Trophy,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Section } from '@/components/layout/AppLayout';
import { ExamModeSettings } from '@/components/settings/ExamModeSettings';
import { useAuth } from '@/store/authStore';
import { useUser, useUserProfileStore } from '@/store/userProfileStore';
import { cn } from '@/lib/utils';
import type { LearningPace, InterleavingIntensity } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { user, updatePreferences } = useUser();
  const { signOut } = useAuth();
  const setUser = useUserProfileStore((state) => state.setUser);
  const resetUser = useUserProfileStore((state) => state.resetUser);

  const [soundEffects, setSoundEffects] = useState(user?.preferences.soundEffectsEnabled ?? true);
  const [voiceEnabled, setVoiceEnabled] = useState(user?.preferences.voiceEnabled ?? true);
  const [reducedMotion, setReducedMotion] = useState(user?.preferences.reducedMotion ?? false);
  const [dailyGoal, setDailyGoal] = useState(user?.preferences.dailyGoalMinutes ?? 15);
  const [learningPace, setLearningPace] = useState<LearningPace>(user?.preferences.learningPace ?? 'moderate');
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Interleaving preferences (Phase 13)
  const [interleavingEnabled, setInterleavingEnabled] = useState(user?.preferences.interleavingEnabled ?? true);
  const [interleavingIntensity, setInterleavingIntensity] = useState<InterleavingIntensity>(user?.preferences.interleavingIntensity ?? 'moderate');

  // Coach timing preferences (Phase 3-2)
  const [showMilestones, setShowMilestones] = useState(user?.preferences.showMilestones ?? true);
  const [showTransitions, setShowTransitions] = useState(user?.preferences.showTransitions ?? true);
  const [showDifficultyPrep, setShowDifficultyPrep] = useState(user?.preferences.showDifficultyPrep ?? true);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  if (!user) return null;

  const handleToggle = (setting: 'sound' | 'voice' | 'motion', value: boolean) => {
    switch (setting) {
      case 'sound':
        setSoundEffects(value);
        updatePreferences({ soundEffectsEnabled: value });
        break;
      case 'voice':
        setVoiceEnabled(value);
        updatePreferences({ voiceEnabled: value });
        break;
      case 'motion':
        setReducedMotion(value);
        updatePreferences({ reducedMotion: value });
        break;
    }
  };

  const handleDailyGoalChange = (minutes: number) => {
    setDailyGoal(minutes);
    updatePreferences({ dailyGoalMinutes: minutes });
  };

  const handlePaceChange = (pace: LearningPace) => {
    setLearningPace(pace);
    updatePreferences({ learningPace: pace });
  };

  const handleInterleavingToggle = (enabled: boolean) => {
    setInterleavingEnabled(enabled);
    updatePreferences({ interleavingEnabled: enabled });
  };

  const handleInterleavingIntensityChange = (intensity: InterleavingIntensity) => {
    setInterleavingIntensity(intensity);
    updatePreferences({ interleavingIntensity: intensity });
  };

  // Coach timing preference handlers
  const handleTimingToggle = (setting: 'milestones' | 'transitions' | 'difficultyPrep', value: boolean) => {
    switch (setting) {
      case 'milestones':
        setShowMilestones(value);
        updatePreferences({ showMilestones: value });
        break;
      case 'transitions':
        setShowTransitions(value);
        updatePreferences({ showTransitions: value });
        break;
      case 'difficultyPrep':
        setShowDifficultyPrep(value);
        updatePreferences({ showDifficultyPrep: value });
        break;
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Sign out from Firebase and clear stores
      await signOut();
      resetUser();
      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditName(user.name);
    setEditEmail(user.email);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;

    setIsSavingProfile(true);
    try {
      // Update local store (optimistic update)
      setUser({
        ...user,
        name: editName.trim(),
        email: editEmail.trim(),
      });

      // Sync with backend API
      await fetch('/api/users/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: editName.trim(),
        }),
      });

      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateExamMode = async (settings: {
    certificationExamDate?: string | null;
    targetRetention?: number;
    examModeEnabled?: boolean;
  }) => {
    try {
      await fetch('/api/users/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          preferences: settings,
        }),
      });

      // Update local store
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          ...(settings.certificationExamDate !== undefined && {
            certificationExamDate: settings.certificationExamDate
              ? new Date(settings.certificationExamDate)
              : undefined,
          }),
          ...(settings.targetRetention !== undefined && {
            targetRetention: settings.targetRetention,
          }),
          ...(settings.examModeEnabled !== undefined && {
            examModeEnabled: settings.examModeEnabled,
          }),
        },
      });
    } catch (error) {
      console.error('Failed to update exam mode settings:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <Section delay={0} spacing="tight">
        <h1 className="h2 text-navy">Settings</h1>
        <p className="text-rich-black/60 mt-2">
          Customize your learning experience
        </p>
      </Section>

      {/* Profile Section */}
      <Section delay={0.1} spacing="normal">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} className="text-teal" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-navy">{user.name}</h3>
                <p className="text-sm text-rich-black/60">{user.email}</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={handleOpenEditModal}>
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Learning Preferences */}
      <Section delay={0.2} spacing="normal">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={20} className="text-teal" />
              Learning Preferences
            </CardTitle>
            <CardDescription>Adjust your learning goals and pace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Daily Goal */}
            <div>
              <label className="block text-sm font-medium text-navy mb-3">
                Daily Learning Goal
              </label>
              <div className="flex gap-2">
                {[10, 15, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleDailyGoalChange(mins)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm',
                      dailyGoal === mins
                        ? 'bg-teal text-white'
                        : 'bg-light-grey text-rich-black/60 hover:bg-grey/50'
                    )}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Pace */}
            <div>
              <label className="block text-sm font-medium text-navy mb-3">
                Learning Pace
              </label>
              <div className="space-y-2">
                {[
                  { value: 'relaxed' as LearningPace, label: 'Relaxed', desc: 'Take your time, no pressure' },
                  { value: 'moderate' as LearningPace, label: 'Moderate', desc: 'Balanced pace for steady progress' },
                  { value: 'intensive' as LearningPace, label: 'Intensive', desc: 'Fast-track your certification' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePaceChange(option.value)}
                    className={cn(
                      'w-full p-3 rounded-xl text-left flex items-center justify-between transition-all',
                      learningPace === option.value
                        ? 'bg-teal/10 border-2 border-teal'
                        : 'bg-light-grey border-2 border-transparent hover:bg-grey/50'
                    )}
                  >
                    <div>
                      <p className="font-medium text-navy">{option.label}</p>
                      <p className="text-sm text-rich-black/60">{option.desc}</p>
                    </div>
                    {learningPace === option.value && (
                      <Check size={20} className="text-teal" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Exam Mode Settings */}
      <Section delay={0.25} spacing="normal">
        <ExamModeSettings
          userId={user.id}
          examDate={user.preferences.certificationExamDate || null}
          targetRetention={user.preferences.targetRetention || 0.95}
          examModeEnabled={user.preferences.examModeEnabled || false}
          onUpdate={handleUpdateExamMode}
        />
      </Section>

      {/* Review Interleaving Settings (Phase 13) */}
      <Section delay={0.27} spacing="normal">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw size={20} className="text-teal" />
              Review Interleaving
            </CardTitle>
            <CardDescription>
              Mix review challenges into your learning sessions for better retention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Toggle */}
            <ToggleSetting
              icon={<RefreshCw size={18} />}
              label="Enable Review Mixing"
              description="Automatically include review items during learning"
              value={interleavingEnabled}
              onChange={handleInterleavingToggle}
            />

            {/* Intensity Selection */}
            {interleavingEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-navy mb-3">
                  Review Intensity
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'light' as InterleavingIntensity, label: 'Light', desc: '20% reviews - Gentle reinforcement', reviews: '~3 per session' },
                    { value: 'moderate' as InterleavingIntensity, label: 'Moderate', desc: '30% reviews - Balanced retention', reviews: '~5 per session' },
                    { value: 'heavy' as InterleavingIntensity, label: 'Heavy', desc: '50% reviews - Maximum reinforcement', reviews: '~7 per session' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleInterleavingIntensityChange(option.value)}
                      className={cn(
                        'w-full p-3 rounded-xl text-left flex items-center justify-between transition-all',
                        interleavingIntensity === option.value
                          ? 'bg-amber-50 border-2 border-amber-400'
                          : 'bg-light-grey border-2 border-transparent hover:bg-grey/50'
                      )}
                    >
                      <div>
                        <p className="font-medium text-navy">{option.label}</p>
                        <p className="text-sm text-rich-black/60">{option.desc}</p>
                        <p className="text-xs text-rich-black/40 mt-1">{option.reviews}</p>
                      </div>
                      {interleavingIntensity === option.value && (
                        <Check size={20} className="text-amber-500" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-rich-black/50 italic">
                  Research shows spaced interleaving improves long-term retention by up to 50%.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* Sound & Accessibility */}
      <Section delay={0.3} spacing="normal">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 size={20} className="text-teal" />
              Sound & Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleSetting
              icon={<Volume2 size={18} />}
              label="Sound Effects"
              description="Play sounds for celebrations and feedback"
              value={soundEffects}
              onChange={(v) => handleToggle('sound', v)}
            />
            <ToggleSetting
              icon={<Bell size={18} />}
              label="Voice Guidance"
              description="Enable voice for Coach interactions"
              value={voiceEnabled}
              onChange={(v) => handleToggle('voice', v)}
            />
            <ToggleSetting
              icon={<Moon size={18} />}
              label="Reduced Motion"
              description="Minimize animations for accessibility"
              value={reducedMotion}
              onChange={(v) => handleToggle('motion', v)}
            />
          </CardContent>
        </Card>
      </Section>

      {/* Coach Prompts Settings */}
      <Section delay={0.35} spacing="normal">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={20} className="text-teal" />
              Coach Prompts
            </CardTitle>
            <CardDescription>
              Control when Sage appears to celebrate and guide your learning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleSetting
              icon={<Trophy size={18} />}
              label="Mastery Milestones"
              description="Celebrate when you reach 50%, 75%, 90%, 95% mastery"
              value={showMilestones}
              onChange={(v) => handleTimingToggle('milestones', v)}
            />
            <ToggleSetting
              icon={<ArrowRight size={18} />}
              label="Session Transitions"
              description="Guidance when moving between warmup, main, and cooldown phases"
              value={showTransitions}
              onChange={(v) => handleTimingToggle('transitions', v)}
            />
            <ToggleSetting
              icon={<BookOpen size={18} />}
              label="Difficulty Preparation"
              description="Heads-up before challenging content or weak prerequisites"
              value={showDifficultyPrep}
              onChange={(v) => handleTimingToggle('difficultyPrep', v)}
            />
          </CardContent>
        </Card>
      </Section>

      {/* Account Actions */}
      <Section delay={0.4} spacing="normal">
        <Card variant="outlined" padding="lg">
          <CardContent className="space-y-2">
            <button
              onClick={() => router.push('/privacy')}
              className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-light-grey transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-rich-black/40" />
                <span className="text-navy">Privacy & Security</span>
              </div>
              <ChevronRight size={18} className="text-rich-black/40" />
            </button>
            <button
              onClick={() => router.push('/help')}
              className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-light-grey transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={18} className="text-rich-black/40" />
                <span className="text-navy">Help & Support</span>
              </div>
              <ChevronRight size={18} className="text-rich-black/40" />
            </button>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-error-light transition-colors group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {isSigningOut ? (
                  <Loader2 size={18} className="text-error animate-spin" />
                ) : (
                  <LogOut size={18} className="text-error" />
                )}
                <span className="text-error">{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
              </div>
            </button>
          </CardContent>
        </Card>
      </Section>

      {/* Version Info */}
      <Section delay={0.5} spacing="tight">
        <p className="text-center text-sm text-rich-black/40 py-4">
          Aptly v1.0.0 • Made for learners
        </p>
      </Section>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile"
        description="Update your profile information"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Your name"
            leftIcon={<User size={18} />}
            required
          />
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="you@example.com"
            disabled
            hint="Email cannot be changed"
          />
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSaveProfile}
              disabled={isSavingProfile || !editName.trim()}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ToggleSetting({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-light-grey/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-rich-black/40">{icon}</div>
        <div>
          <p className="font-medium text-navy">{label}</p>
          <p className="text-sm text-rich-black/60">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'w-12 h-7 rounded-full transition-colors relative',
          value ? 'bg-teal' : 'bg-grey'
        )}
      >
        <motion.div
          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
          animate={{ left: value ? 26 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
