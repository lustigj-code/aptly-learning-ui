# Aptly Learning

A beautiful, gamified learning platform for professional certification. Built with Next.js 16, React, and Tailwind CSS.

**Design Philosophy**: *"Duolingo Meets Professional Certification"* - Inspired by Headspace and Masterclass.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwindcss)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-ff69b4?logo=framer)

---

## Features

- **Gamified Learning** - Streaks, XP, badges, and progress tracking
- **AI Coach** - Personalized learning assistance powered by Google Gemini
- **Beautiful UI** - Apple-level polish with smooth animations
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Accessible** - WCAG compliant with proper focus states

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + CSS Variables |
| **Animations** | Framer Motion |
| **State** | Zustand |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Auth |
| **AI** | Google Gemini |
| **Monitoring** | Sentry + PostHog |

---

## Design System

### Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Navy** | `#0A004A` | Primary text, backgrounds |
| **Teal** | `#21A8B0` | Primary actions, links |
| **Yellow** | `#FFDE00` | Celebrations, highlights |
| **Purple** | `#3B336E` | Secondary accents |
| **Success** | `#88B644` | Positive feedback |
| **Error** | `#E84133` | Error states |

### Animation Timing

| Tier | Duration | Usage |
|------|----------|-------|
| **Instant** | 100ms | Micro-feedback, toggles |
| **Standard** | 200ms | Most transitions |
| **Elaborate** | 400ms | Page transitions, celebrations |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (for auth/database)

### Installation

```bash
# Clone the repository
git clone https://github.com/lustigj-code/aptly-learning-ui.git
cd aptly-learning-ui

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# AI Services
GOOGLE_GENAI_API_KEY=
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main dashboard
│   ├── learn/              # Learning experience
│   ├── progress/           # Progress tracking
│   └── achievements/       # Badges & achievements
├── components/
│   ├── ui/                 # Core UI components
│   │   ├── Button.tsx      # Polished button with animations
│   │   ├── Card.tsx        # Card variants (elevated, glass, etc.)
│   │   ├── Input.tsx       # Form inputs with validation states
│   │   ├── ProgressBar.tsx # Animated progress with shimmer
│   │   └── Toast.tsx       # Notification system
│   ├── layout/             # Layout components
│   └── learning/           # Learning-specific components
├── lib/
│   ├── firebase/           # Firebase configuration
│   ├── services/           # Business logic services
│   └── utils/              # Utility functions
├── store/                  # Zustand state management
└── types/                  # TypeScript type definitions
```

---

## UI Components

### Button

```tsx
<Button variant="primary" size="lg" rightIcon={<ArrowRight />}>
  Continue Learning
</Button>
```

**Variants**: `primary`, `secondary`, `ghost`, `danger`, `success`, `celebration`
**Sizes**: `sm`, `md`, `lg`, `xl` (44px touch target on md+)

### Card

```tsx
<Card variant="interactive" padding="lg">
  <CardHeader>
    <CardTitle>Course Progress</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

**Variants**: `default`, `elevated`, `outlined`, `interactive`, `glass`, `gradient`

### ProgressBar

```tsx
<ProgressBar value={75} color="teal" shimmer />
```

Auto-shimmer and glow effect at 100% completion.

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Run ESLint
```

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

---

## License

This project is proprietary software. All rights reserved.

---

## Acknowledgments

- Design inspired by [Duolingo](https://duolingo.com), [Headspace](https://headspace.com), and [Masterclass](https://masterclass.com)
- UI components built with [shadcn/ui](https://ui.shadcn.com) patterns
- Animations powered by [Framer Motion](https://framer.com/motion)

---

Built with care by the Aptly team.
