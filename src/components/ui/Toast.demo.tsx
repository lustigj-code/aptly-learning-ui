'use client';

import { useToast } from './Toast';

/**
 * Toast Component Demo
 *
 * Demonstrates all toast variants and features:
 * - Success, Error, Warning, Info variants
 * - Badge, Streak, and XP gamification toasts
 * - Progress bar for timed toasts
 * - Smooth entry/exit animations
 * - Stacking behavior
 * - Dark mode support
 */
export function ToastDemo() {
  const toast = useToast();

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Toast Component Demo</h2>

      {/* Standard Variants */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Standard Variants</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toast.success('Success!', 'Your action was completed successfully.')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Success Toast
          </button>

          <button
            onClick={() => toast.error('Error occurred', 'Something went wrong. Please try again.')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Error Toast
          </button>

          <button
            onClick={() => toast.warning('Warning', 'Please review this before proceeding.')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            Warning Toast
          </button>

          <button
            onClick={() => toast.info('Did you know?', 'You can dismiss toasts by clicking the X button.')}
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition"
          >
            Info Toast
          </button>
        </div>
      </div>

      {/* Gamification Toasts */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Gamification Toasts</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toast.badge('Master Learner', 'Completed 50 lessons')}
            className="px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition"
          >
            Badge Toast
          </button>

          <button
            onClick={() => toast.streak(7)}
            className="px-4 py-2 bg-warning text-white rounded-lg hover:bg-warning/90 transition"
          >
            Streak Toast
          </button>

          <button
            onClick={() => toast.xp(100)}
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition"
          >
            XP Toast
          </button>
        </div>
      </div>

      {/* Progress Bar Demo */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Progress Bar</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              toast.addToast({
                type: 'info',
                title: 'Processing...',
                description: 'Watch the progress bar at the bottom',
                duration: 5000,
                showProgress: true,
              })
            }
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition"
          >
            With Progress Bar
          </button>

          <button
            onClick={() =>
              toast.addToast({
                type: 'success',
                title: 'No Progress Bar',
                description: 'This toast has no progress indicator',
                duration: 3000,
                showProgress: false,
              })
            }
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Without Progress Bar
          </button>
        </div>
      </div>

      {/* Stacking Demo */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Stacking Behavior</h3>
        <button
          onClick={() => {
            toast.success('First toast', 'This is the first notification');
            setTimeout(() => toast.info('Second toast', 'This is the second notification'), 200);
            setTimeout(() => toast.warning('Third toast', 'This is the third notification'), 400);
          }}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
        >
          Trigger Multiple Toasts
        </button>
      </div>

      {/* Custom Duration */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Custom Duration</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              toast.addToast({
                type: 'info',
                title: 'Quick Toast',
                description: 'This disappears in 1 second',
                duration: 1000,
              })
            }
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition"
          >
            1 Second Toast
          </button>

          <button
            onClick={() =>
              toast.addToast({
                type: 'info',
                title: 'Persistent Toast',
                description: 'This stays for 10 seconds',
                duration: 10000,
              })
            }
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition"
          >
            10 Second Toast
          </button>

          <button
            onClick={() =>
              toast.addToast({
                type: 'warning',
                title: 'Permanent Toast',
                description: 'This stays until you dismiss it',
                duration: 0,
                showProgress: false,
              })
            }
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            Permanent Toast
          </button>
        </div>
      </div>
    </div>
  );
}
