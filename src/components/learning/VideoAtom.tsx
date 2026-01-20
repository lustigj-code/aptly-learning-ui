'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronDown, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTimeTracking, formatTimeMMSS } from '@/hooks/useTimeTracking';
import { useInteractionLogger } from '@/hooks/useInteractionLogger';
import { post } from '@/lib/api/client';
import type { Atom, VideoContent } from '@/types';

type VideoAtomProps = {
  atom: Atom & { type: 'video'; content: VideoContent };
  onComplete: () => void;
  isLoading?: boolean;
};

export function VideoAtom({ atom, onComplete, isLoading = false }: VideoAtomProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLIFrameElement>(null);

  // Track view start time for logging
  const viewStartTimeRef = useRef<number>(Date.now());
  const hasLoggedViewRef = useRef<boolean>(false);

  const { content } = atom;
  const chapters = content.chapters || [];
  const keyTakeaways = content.keyTakeaways || [];

  // Interaction logging for ML model training
  const { logContentView } = useInteractionLogger();

  // Time tracking - pauses when video is not playing
  const { elapsedSeconds, getTimeSpent, pause, resume } = useTimeTracking({
    atomId: atom.id,
    _lessonId: atom.lessonId,
  });

  // Log content view when component unmounts
  useEffect(() => {
    // Capture the ref value at effect creation time
    const startTime = viewStartTimeRef.current;

    return () => {
      if (!hasLoggedViewRef.current) {
        const viewDurationMs = Date.now() - startTime;
        logContentView({
          atomId: atom.id,
          atomType: 'video',
          viewDurationMs,
        });
        hasLoggedViewRef.current = true;
      }
    };
  }, [atom.id, logContentView]);

  // Sync time tracking with video play state
  useEffect(() => {
    if (isPlaying) {
      resume();
    } else {
      pause();
    }
  }, [isPlaying, pause, resume]);

  const submitCompletion = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await post('/api/progress/complete-atom', {
        atomId: atom.id,
        lessonId: atom.lessonId,
        moduleId: atom.lessonId.split('_')[0],
        courseId: atom.lessonId.split('_')[0],
        timeSpentSeconds: getTimeSpent(),
      });

      if (response.success) {
        onComplete();
      } else {
        console.error('Error completing atom:', response.error);
      }
    } catch (error) {
      console.error('Error completing atom:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [atom.id, atom.lessonId, getTimeSpent, onComplete]);

  // Auto-complete at 90% watched
  useEffect(() => {
    if (watchProgress >= 90 && !isCompleted) {
      setIsCompleted(true);
      submitCompletion();
    }
  }, [watchProgress, isCompleted, submitCompletion]);

  const handleManualComplete = async () => {
    // Log content view on completion
    if (!hasLoggedViewRef.current) {
      const viewDurationMs = Date.now() - viewStartTimeRef.current;
      logContentView({
        atomId: atom.id,
        atomType: 'video',
        viewDurationMs,
      });
      hasLoggedViewRef.current = true;
    }

    setIsCompleted(true);
    await submitCompletion();
  };

  // Simulate video progress for demo
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setWatchProgress((prev) => Math.min(prev + Math.random() * 2, 100));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/watch\?v=([^&]*)/,
      /youtu\.be\/([^?]*)/,
      /youtube\.com\/embed\/([^?]*)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Check if this is a local video file (MP4, WebM, etc.)
  const isLocalVideo = content.videoUrl.startsWith('/videos/') ||
                       content.videoUrl.endsWith('.mp4') ||
                       content.videoUrl.endsWith('.webm');

  const videoId = extractYouTubeVideoId(content.videoUrl);
  const youtubeEmbedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0` : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Video Player */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Player Container */}
        <div className="aspect-video w-full bg-navy rounded-2xl overflow-hidden shadow-lg">
          {isLocalVideo ? (
            <video
              src={content.videoUrl}
              className="w-full h-full"
              controls
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : youtubeEmbedUrl ? (
            <iframe
              ref={videoRef}
              src={youtubeEmbedUrl}
              title={atom.title}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center flex-col gap-4">
              <Play size={64} className="text-light-grey" />
              <p className="text-light-grey text-sm">Invalid video URL</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <ProgressBar
            value={watchProgress}
            max={100}
            size="md"
            showLabel={true}
            labelPosition="right"
            animated={true}
            className="flex-1"
          />
          <div className="flex items-center gap-1 text-sm text-rich-black/60">
            <Clock size={14} className={isPlaying ? 'text-teal' : 'text-grey'} />
            <span className="font-mono">{formatTimeMMSS(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Video Info */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-navy">{atom.title}</h2>
          <p className="text-sm text-rich-black/70">
            Duration: {content.duration || 0} minutes
          </p>
        </div>
      </motion.div>

      {/* Chapters Section */}
      {chapters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card variant="outlined" padding="lg" className="space-y-3">
            <button
              onClick={() => setCurrentChapter(currentChapter === -1 ? 0 : -1)}
              className="w-full flex items-center justify-between font-semibold text-navy hover:text-teal transition-colors"
            >
              <span>Chapters ({chapters.length})</span>
              <motion.div
                animate={{ rotate: currentChapter === -1 ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={20} />
              </motion.div>
            </button>

            <AnimatePresence>
              {currentChapter !== -1 && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {chapters.map((chapter, idx) => (
                    <motion.button
                      key={idx}
                      className={cn(
                        'w-full p-3 rounded-lg text-left transition-colors duration-200',
                        idx === currentChapter
                          ? 'bg-light-teal text-navy font-semibold'
                          : 'hover:bg-light-grey text-navy'
                      )}
                      onClick={() => setCurrentChapter(idx)}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <span>{chapter.title}</span>
                        <span className="text-sm text-rich-black/60">
                          {Math.floor(chapter.time / 60)}:{String(chapter.time % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

      {/* Key Takeaways Section */}
      {keyTakeaways.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card variant="gradient" padding="lg" className="space-y-4">
            <h3 className="text-lg font-semibold text-navy">Key Takeaways</h3>
            <ul className="space-y-3">
              {keyTakeaways.map((takeaway, idx) => (
                <motion.li
                  key={idx}
                  className="flex gap-3 items-start"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 + idx * 0.05 }}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-navy flex-1 pt-0.5">{takeaway}</p>
                </motion.li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      {/* Transcript Section */}
      {content.transcript && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card variant="outlined" padding="lg" className="space-y-3">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-between font-semibold text-navy hover:text-teal transition-colors"
            >
              <span>Transcript</span>
              <motion.div
                animate={{ rotate: showTranscript ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={20} />
              </motion.div>
            </button>

            <AnimatePresence>
              {showTranscript && (
                <motion.div
                  className="mt-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-light-grey rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-sm text-navy leading-relaxed whitespace-pre-wrap">
                      {content.transcript}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

      {/* Completion Section */}
      <motion.div
        className="flex gap-3 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        {isCompleted ? (
          <div className="flex-1 flex items-center justify-center gap-2 p-4 bg-success-light rounded-lg border border-success">
            <Check size={20} className="text-success" />
            <span className="font-semibold text-success">Completed!</span>
          </div>
        ) : (
          <>
            <Button
              variant="secondary"
              size="lg"
              fullWidth={true}
              onClick={handleManualComplete}
              isLoading={isSubmitting}
              isDisabled={isSubmitting || isLoading}
            >
              Mark as Complete
            </Button>
            {watchProgress < 90 && (
              <p className="text-xs text-rich-black/60 absolute bottom-0 right-0">
                Auto-complete at 90%
              </p>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
