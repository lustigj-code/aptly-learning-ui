'use client';

import { useState } from 'react';
import { CardRenderer } from '@/components/learning/CardRenderer';
import type { Atom, AtomType } from '@/types';

/**
 * Demo page for CardRenderer component
 * Shows all states: skeleton, loading, loaded, error
 */
export default function CardRendererDemo() {
  const [currentDemo, setCurrentDemo] = useState<'skeleton' | 'loading' | 'loaded' | 'error'>('skeleton');
  const [atomType, setAtomType] = useState<AtomType>('video');

  // Mock atom data
  const mockAtom: Atom = {
    id: 'demo-atom-1',
    lessonId: 'demo-lesson-1',
    type: atomType,
    title: 'Understanding React Hooks',
    content: {
      videoUrl: 'https://example.com/video.mp4',
      transcript: 'This is a sample transcript...',
      duration: 480,
      chapters: [
        { time: 0, title: 'Introduction' },
        { time: 120, title: 'useState Hook' },
        { time: 300, title: 'useEffect Hook' },
      ],
      keyTakeaways: [
        'Hooks let you use state without classes',
        'useState is for local component state',
        'useEffect handles side effects',
      ],
    },
    estimatedMinutes: 8,
    isRequired: true,
    masteryThreshold: 0.8,
  };

  const mockError = new Error('Failed to load content. Please check your connection and try again.');

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-teal via-white to-light-grey/30 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-navy">CardRenderer Demo</h1>
          <p className="text-lg text-navy/70">
            Skeleton-first learning card component with optimistic rendering
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-navy mb-3">
              Card State
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['skeleton', 'loading', 'loaded', 'error'] as const).map((state) => (
                <button
                  key={state}
                  onClick={() => setCurrentDemo(state)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                    currentDemo === state
                      ? 'bg-teal text-white shadow-md'
                      : 'bg-light-grey text-navy hover:bg-grey/50'
                  }`}
                >
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-3">
              Atom Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['video', 'reading', 'quiz', 'practice'] as AtomType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setAtomType(type)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                    atomType === type
                      ? 'bg-purple text-white shadow-md'
                      : 'bg-light-grey text-navy hover:bg-grey/50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Info boxes */}
          <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-light-grey">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
                Entry Animation
              </h4>
              <p className="text-sm text-navy">
                Slides from right with scale
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
                Exit (Success)
              </h4>
              <p className="text-sm text-navy">
                Flies up (to Mastery Orb)
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
                Exit (Discard)
              </h4>
              <p className="text-sm text-navy">
                Snaps left
              </p>
            </div>
          </div>
        </div>

        {/* Card Renderer */}
        <div className="min-h-[500px] flex items-center justify-center">
          <CardRenderer
            atom={currentDemo === 'loaded' ? { ...mockAtom, type: atomType } : undefined}
            isLoading={currentDemo === 'loading'}
            error={currentDemo === 'error' ? mockError : null}
            onComplete={() => {
              console.log('Card content loaded!');
            }}
            onExit={(direction) => {
              console.log(`Card exited with direction: ${direction}`);
            }}
          />
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-navy">Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-navy">Instant Skeleton (0ms)</h3>
                <p className="text-sm text-navy/70">
                  Shows skeleton immediately for perceived performance
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-navy">Type-specific Skeletons</h3>
                <p className="text-sm text-navy/70">
                  Different layouts for video, reading, quiz, practice
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-navy">Smooth Transitions</h3>
                <p className="text-sm text-navy/70">
                  Gentle spring animations with Framer Motion
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-navy">Graceful Error Handling</h3>
                <p className="text-sm text-navy/70">
                  Friendly error state with retry option
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-navy">Accessibility First</h3>
                <p className="text-sm text-navy/70">
                  Respects prefers-reduced-motion settings
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-navy">Directional Exits</h3>
                <p className="text-sm text-navy/70">
                  Different animations for success vs. discard
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Example */}
        <div className="bg-navy rounded-2xl shadow-lg p-6 space-y-3">
          <h2 className="text-xl font-semibold text-white">Usage</h2>
          <pre className="bg-navy-light rounded-xl p-4 overflow-x-auto text-sm text-light-teal">
{`import { CardRenderer } from '@/components/learning/CardRenderer';

<CardRenderer
  atom={atom}
  isLoading={isLoading}
  error={error}
  onComplete={() => console.log('Loaded!')}
  onExit={(direction) => console.log(direction)}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
