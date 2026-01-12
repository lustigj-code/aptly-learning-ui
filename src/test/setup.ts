import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js headers/cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}))

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  arrayUnion: vi.fn((items) => items),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
}))

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}))

// Mock Firebase Admin SDK
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
      })),
    })),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => new Date()),
    arrayUnion: vi.fn((items) => items),
    increment: vi.fn((n) => n),
  },
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(() => Promise.resolve({ uid: 'test-user-id' })),
    verifySessionCookie: vi.fn(() => Promise.resolve({ uid: 'test-user-id' })),
    createSessionCookie: vi.fn(() => Promise.resolve('mock-session-cookie')),
  })),
}))

// Mock the app's Firebase config module
vi.mock('@/lib/firebase/config', () => ({
  app: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
  db: {},
  storage: {},
}))

// Mock the app's Firebase auth module
vi.mock('@/lib/firebase/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOutUser: vi.fn(),
  getIdToken: vi.fn(() => Promise.resolve('mock-id-token')),
}))

// Mock the app's Firebase admin module
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
            set: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
    })),
  },
  adminAuth: {
    verifyIdToken: vi.fn(() => Promise.resolve({ uid: 'test-user-id' })),
    verifySessionCookie: vi.fn(() => Promise.resolve({ uid: 'test-user-id' })),
    createSessionCookie: vi.fn(() => Promise.resolve('mock-session-cookie')),
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock the app's unified store
vi.mock('@/store/unifiedStore', () => ({
  useUnifiedStore: vi.fn(() => ({
    user: {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    },
    isAuthenticated: true,
    isLoading: false,
    progress: {
      atomsCompleted: [],
      lessonsCompleted: [],
      modulesCompleted: [],
      coursesCompleted: [],
      xp: 0,
      totalTimeSpentMinutes: 0,
      overallPercentage: 0,
    },
  })),
  useUser: vi.fn(() => ({
    user: {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    },
    isAuthenticated: true,
    isLoading: false,
  })),
  useAuth: vi.fn(() => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    isLoading: false,
  })),
  useProgress: vi.fn(() => ({
    progress: {
      atomsCompleted: [],
      lessonsCompleted: [],
      modulesCompleted: [],
      coursesCompleted: [],
      xp: 0,
      totalTimeSpentMinutes: 0,
      overallPercentage: 0,
    },
    isLoading: false,
    completeAtom: vi.fn(),
    completeLesson: vi.fn(),
  })),
  useSyncStatus: vi.fn(() => ({
    isSyncing: false,
    lastSyncTime: new Date(),
    error: null,
  })),
  useOfflineSync: vi.fn(() => ({
    queueAction: vi.fn(),
    pendingActions: [],
  })),
  useAuthInitialize: vi.fn(() => true),
  createNewUser: vi.fn(() => ({})),
  useAuthStore: vi.fn(() => ({})),
  useUserStore: vi.fn(() => ({})),
}))

// Mock the useCoach hook
vi.mock('@/hooks/useCoach', () => ({
  useCoach: vi.fn(() => ({
    messages: [],
    isLoading: false,
    sendMessage: vi.fn(() => Promise.resolve({ content: 'Mock AI response' })),
    getQuizHelp: vi.fn(() => Promise.resolve({ content: 'Mock quiz help' })),
    getSummary: vi.fn(() => Promise.resolve({ content: 'Mock summary' })),
    clearConversation: vi.fn(),
  })),
}))

// Mock the useTimeTracking hook
vi.mock('@/hooks/useTimeTracking', () => ({
  useTimeTracking: vi.fn(() => ({
    elapsedSeconds: 0,
    isActive: true,
    getTimeSpent: vi.fn(() => 60),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
  })),
  formatTimeMMSS: vi.fn((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }),
}))

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  get: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  post: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  put: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  del: vi.fn(() => Promise.resolve({ success: true, data: {} })),
}))
