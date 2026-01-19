'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  AuthError,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { signUpSchema } from '@/lib/auth/validation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Password strength indicator
  const passwordStrength = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  }
  const isPasswordStrong = Object.values(passwordStrength).every(Boolean)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const createUserProfile = async (uid: string, email: string, name: string) => {
    try {
      // Note: In production, this should be done via Cloud Function
      // For now, we'll create it via the client-side API after auth
      const response = await fetch('/api/users/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email,
          name,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        }),
      })
      return response.ok
    } catch (error) {
      console.error('Error creating profile:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate input
      const validation = signUpSchema.safeParse(formData)
      if (!validation.success) {
        const firstError = validation.error.issues[0]
        setError(firstError.message)
        setIsLoading(false)
        return
      }

      if (!auth) {
        setError('Authentication service not available')
        setIsLoading(false)
        return
      }

      const { name, email, password } = validation.data

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: name,
      })

      // Create user profile in Firestore
      const profileCreated = await createUserProfile(userCredential.user.uid, email, name)

      if (!profileCreated) {
        console.warn('Profile creation failed, but auth succeeded')
      }

      // Try to create session cookie (optional - for server-side auth)
      // Client-side auth works without this via Firebase's built-in persistence
      try {
        const idToken = await userCredential.user.getIdToken()
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
      } catch (sessionError) {
        // Session cookie is optional - client auth still works
        console.warn('Session cookie creation failed (optional):', sessionError)
      }

      // Redirect to onboarding
      router.push('/onboarding')
    } catch (err) {
      const authError = err as AuthError
      switch (authError.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Try signing in instead.')
          break
        case 'auth/invalid-email':
          setError('Invalid email address')
          break
        case 'auth/weak-password':
          setError('Password is too weak. Use uppercase, number, and 8+ characters.')
          break
        case 'auth/operation-not-allowed':
          setError('Sign up is currently disabled')
          break
        default:
          setError(authError.message || 'Failed to create account')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setIsGoogleLoading(true)

    try {
      if (!auth) {
        setError('Authentication service not available')
        setIsGoogleLoading(false)
        return
      }

      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)

      // Create user profile
      await createUserProfile(
        userCredential.user.uid,
        userCredential.user.email || '',
        userCredential.user.displayName || 'User'
      )

      // Try to create session cookie (optional - for server-side auth)
      // Client-side auth works without this via Firebase's built-in persistence
      try {
        const idToken = await userCredential.user.getIdToken()
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
      } catch (sessionError) {
        // Session cookie is optional - client auth still works
        console.warn('Session cookie creation failed (optional):', sessionError)
      }

      // Redirect to onboarding
      router.push('/onboarding')
    } catch (err) {
      const authError = err as AuthError
      if (authError.code !== 'auth/popup-closed-by-user') {
        setError(authError.message || 'Failed to sign up with Google')
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-teal/30 via-white to-purple/10 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-bold bg-gradient-to-r from-navy to-teal bg-clip-text text-transparent">
              Aptly
            </span>
          </Link>
        </div>

        <Card className="shadow-xl border border-grey/20">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-navy">
                Get Started
              </h1>
              <p className="text-rich-black/60 mt-2">Create your account and start learning</p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 bg-error-light border border-error/20 rounded-xl flex gap-3"
              >
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <Input
                id="name"
                name="name"
                type="text"
                label="Full Name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading || isGoogleLoading}
                leftIcon={<User className="w-5 h-5" />}
                required
              />

              {/* Email Input */}
              <Input
                id="email"
                name="email"
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading || isGoogleLoading}
                leftIcon={<Mail className="w-5 h-5" />}
                required
              />

              {/* Password Input */}
              <div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  leftIcon={<Lock className="w-5 h-5" />}
                  required
                />

                {/* Password Strength Indicator */}
                {formData.password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 space-y-2"
                  >
                    <div className="text-xs font-medium text-navy">Password strength:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full flex-shrink-0 transition-colors ${
                            passwordStrength.length
                              ? 'bg-success'
                              : 'bg-grey'
                          }`}
                        />
                        <span className={passwordStrength.length ? 'text-success' : 'text-rich-black/60'}>
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full flex-shrink-0 transition-colors ${
                            passwordStrength.uppercase
                              ? 'bg-success'
                              : 'bg-grey'
                          }`}
                        />
                        <span className={passwordStrength.uppercase ? 'text-success' : 'text-rich-black/60'}>
                          One uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full flex-shrink-0 transition-colors ${
                            passwordStrength.number
                              ? 'bg-success'
                              : 'bg-grey'
                          }`}
                        />
                        <span className={passwordStrength.number ? 'text-success' : 'text-rich-black/60'}>
                          One number
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  label="Confirm Password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  leftIcon={<Lock className="w-5 h-5" />}
                  error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
                  success={formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword}
                  required
                />
              </div>

              {/* Sign Up Button */}
              <Button
                type="submit"
                disabled={isLoading || isGoogleLoading || !isPasswordStrong}
                variant="primary"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-grey" />
              <span className="px-3 text-sm text-rich-black/50">or</span>
              <div className="flex-1 border-t border-grey" />
            </div>

            {/* Google Sign Up */}
            <Button
              onClick={handleGoogleSignUp}
              disabled={isLoading || isGoogleLoading}
              variant="secondary"
              className="w-full"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing up...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </>
              )}
            </Button>

            {/* Sign In Link */}
            <p className="text-center text-rich-black/60 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-teal hover:text-teal-dark font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-rich-black/40 mt-6">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-teal hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-teal hover:underline">Privacy Policy</Link>
        </p>
      </motion.div>
    </div>
  )
}
