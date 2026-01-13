/**
 * UI messages and copy
 * Centralized text for consistency
 *
 * Phase 6: Configuration & Deployment
 * Single source of truth for user-facing text
 */

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
  /** Generic fallback error message */
  GENERIC: 'Something went wrong. Please try again.',
  /** User not authenticated */
  UNAUTHORIZED: 'You must be logged in to access this feature.',
  /** Resource not found */
  NOT_FOUND: 'The requested resource was not found.',
  /** Rate limit exceeded */
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  /** User is offline */
  OFFLINE: 'You appear to be offline. Changes will sync when connected.',
  /** Session expired */
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  /** Invalid input */
  INVALID_INPUT: 'Please check your input and try again.',
  /** Server error */
  SERVER_ERROR: 'Server error. Please try again later.',
  /** Network error */
  NETWORK_ERROR: 'Network error. Please check your connection.',
  /** Permission denied */
  PERMISSION_DENIED: "You don't have permission to perform this action.",
  /** Content not available */
  CONTENT_UNAVAILABLE: 'This content is not currently available.',
  /** Quiz submission failed */
  QUIZ_SUBMIT_FAILED: 'Failed to submit quiz. Please try again.',
  /** Progress save failed */
  PROGRESS_SAVE_FAILED: 'Failed to save progress. Your work has been saved locally.',
  /** AI unavailable */
  AI_UNAVAILABLE: 'AI assistant is temporarily unavailable.',
} as const;

// ============================================
// SUCCESS MESSAGES
// ============================================

export const SUCCESS_MESSAGES = {
  /** Progress saved successfully */
  PROGRESS_SAVED: 'Progress saved!',
  /** Lesson completed */
  LESSON_COMPLETE: 'Lesson complete!',
  /** Module completed */
  MODULE_COMPLETE: 'Module complete! Great progress!',
  /** Course completed */
  COURSE_COMPLETE: 'Congratulations! Course completed!',
  /** Badge earned */
  BADGE_EARNED: 'Badge earned!',
  /** Streak maintained */
  STREAK_MAINTAINED: 'Streak maintained!',
  /** Profile updated */
  PROFILE_UPDATED: 'Profile updated successfully.',
  /** Settings saved */
  SETTINGS_SAVED: 'Settings saved.',
  /** Quiz passed */
  QUIZ_PASSED: 'Quiz passed! Well done!',
  /** Review completed */
  REVIEW_COMPLETE: 'Review session complete!',
  /** Goal achieved */
  GOAL_ACHIEVED: 'Daily goal achieved!',
  /** Level up */
  LEVEL_UP: 'Level up!',
} as const;

// ============================================
// COACH PROMPTS
// ============================================

export const COACH_PROMPTS = {
  /** Initial greeting */
  GREETING: "Hi! I'm here to help you learn. What would you like to work on?",
  /** Detected struggling */
  STRUGGLE_DETECTED: "I notice you might be having some trouble. Would you like a hint?",
  /** User idle prompt */
  IDLE_PROMPT: 'Still there? Let me know if you need any help!',
  /** Encouragement message */
  ENCOURAGEMENT: "Great job! You're making excellent progress.",
  /** Quiz hint offer */
  HINT_OFFER: 'Would you like a hint? I can guide you without giving away the answer.',
  /** Review reminder */
  REVIEW_REMINDER: 'You have some concepts due for review. Want to strengthen your knowledge?',
  /** Mastery celebration */
  MASTERY_ACHIEVED: "Excellent! You've mastered this concept!",
  /** Continue prompt */
  CONTINUE_PROMPT: 'Ready to continue to the next topic?',
  /** Practice suggestion */
  PRACTICE_SUGGESTION: "Let's practice what you've learned with some questions.",
  /** Welcome back */
  WELCOME_BACK: 'Welcome back! Ready to pick up where you left off?',
  /** Daily goal prompt */
  DAILY_GOAL_PROMPT: "You're close to your daily goal. Keep going!",
  /** Streak encouragement */
  STREAK_ENCOURAGEMENT: 'Keep up your streak! Every day counts.',
} as const;

// ============================================
// LOADING STATES
// ============================================

export const LOADING_MESSAGES = {
  /** Generic loading */
  LOADING: 'Loading...',
  /** Saving progress */
  SAVING: 'Saving...',
  /** Submitting data */
  SUBMITTING: 'Submitting...',
  /** Processing request */
  PROCESSING: 'Processing...',
  /** Syncing data */
  SYNCING: 'Syncing...',
  /** Loading content */
  LOADING_CONTENT: 'Loading content...',
  /** Preparing quiz */
  PREPARING_QUIZ: 'Preparing quiz...',
  /** Analyzing response */
  ANALYZING: 'Analyzing your response...',
  /** Generating feedback */
  GENERATING_FEEDBACK: 'Generating personalized feedback...',
  /** Loading dashboard */
  LOADING_DASHBOARD: 'Loading your dashboard...',
} as const;

// ============================================
// EMPTY STATES
// ============================================

export const EMPTY_STATES = {
  /** No courses */
  NO_COURSES: 'No courses available yet.',
  /** No lessons */
  NO_LESSONS: 'No lessons in this module yet.',
  /** No badges */
  NO_BADGES: 'No badges earned yet. Keep learning!',
  /** No reviews */
  NO_REVIEWS: 'No reviews due. Great job staying on top of your studies!',
  /** No notifications */
  NO_NOTIFICATIONS: 'No new notifications.',
  /** No search results */
  NO_RESULTS: 'No results found. Try a different search.',
  /** No activity */
  NO_ACTIVITY: 'No recent activity.',
  /** No progress */
  NO_PROGRESS: 'Start learning to track your progress!',
} as const;

// ============================================
// CONFIRMATION DIALOGS
// ============================================

export const CONFIRMATIONS = {
  /** Logout confirmation */
  LOGOUT: 'Are you sure you want to log out?',
  /** Reset progress */
  RESET_PROGRESS: 'Are you sure you want to reset your progress? This cannot be undone.',
  /** Cancel quiz */
  CANCEL_QUIZ: 'Are you sure you want to exit? Your progress will be lost.',
  /** Delete account */
  DELETE_ACCOUNT: 'Are you sure you want to delete your account? This action is permanent.',
  /** Skip lesson */
  SKIP_LESSON: 'Skip this lesson? You can always come back later.',
  /** Use streak freeze */
  USE_FREEZE: 'Use a streak freeze to protect your streak?',
} as const;

// ============================================
// BUTTON LABELS
// ============================================

export const BUTTON_LABELS = {
  /** Continue action */
  CONTINUE: 'Continue',
  /** Submit action */
  SUBMIT: 'Submit',
  /** Cancel action */
  CANCEL: 'Cancel',
  /** Confirm action */
  CONFIRM: 'Confirm',
  /** Save action */
  SAVE: 'Save',
  /** Start action */
  START: 'Start',
  /** Next action */
  NEXT: 'Next',
  /** Previous action */
  PREVIOUS: 'Previous',
  /** Skip action */
  SKIP: 'Skip',
  /** Retry action */
  RETRY: 'Try Again',
  /** Go back */
  BACK: 'Back',
  /** Close action */
  CLOSE: 'Close',
  /** Learn more */
  LEARN_MORE: 'Learn More',
  /** Get help */
  GET_HELP: 'Get Help',
  /** View all */
  VIEW_ALL: 'View All',
} as const;

// ============================================
// ACCESSIBILITY LABELS
// ============================================

export const A11Y_LABELS = {
  /** Close button */
  CLOSE_BUTTON: 'Close',
  /** Menu button */
  MENU_BUTTON: 'Open menu',
  /** Progress bar */
  PROGRESS_BAR: 'Learning progress',
  /** Loading indicator */
  LOADING_INDICATOR: 'Loading, please wait',
  /** Skip to content */
  SKIP_TO_CONTENT: 'Skip to main content',
  /** Navigation */
  NAVIGATION: 'Main navigation',
  /** Search input */
  SEARCH_INPUT: 'Search',
  /** Volume control */
  VOLUME_CONTROL: 'Volume control',
  /** Play button */
  PLAY_BUTTON: 'Play',
  /** Pause button */
  PAUSE_BUTTON: 'Pause',
} as const;
