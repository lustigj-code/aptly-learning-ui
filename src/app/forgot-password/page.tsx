'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { sendPasswordResetEmail, AuthError } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { forgotPasswordSchema } from '@/lib/auth/validation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)

    try {
      // Validate input
      const validation = forgotPasswordSchema.safeParse({ email })
      if (!validation.success) {
        setError(validation.error.issues[0].message)
        setIsLoading(false)
        return
      }

      if (!auth) {
        setError('Authentication service not available')
        setIsLoading(false)
        return
      }

      // Send password reset email
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      })

      setSuccess(true)
      setEmail('')
    } catch (err) {
      const authError = err as AuthError
      // Don't reveal if email exists or not for security
      if (authError.code === 'auth/invalid-email') {
        setError('Please enter a valid email address')
      } else {
        setSuccess(true) // Show success anyway for security
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex justify-center mb-6"
              >
                <div className="relative w-16 h-16 bg-success-light rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
              </motion.div>

              {/* Message */}
              <h2 className="text-2xl font-bold text-center text-navy mb-2">Check your email</h2>
              <p className="text-rich-black/60 text-center mb-6">
                We&apos;ve sent you a link to reset your password. Check your email and click the link to continue.
              </p>

              {/* Hint */}
              <div className="bg-light-teal/30 border border-teal/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-navy">
                  <strong>Tip:</strong> The link will expire in 24 hours. If you don&apos;t see the email, check your spam folder.
                </p>
              </div>

              {/* Back to Login */}
              <Link href="/login" className="block">
                <Button variant="primary" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    )
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
                Reset Password
              </h1>
              <p className="text-rich-black/60 mt-2">We&apos;ll send you a link to reset your password</p>
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
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-navy mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-rich-black/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email}
                variant="primary"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            {/* Back to Login */}
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 mt-6 text-teal hover:text-teal-dark font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
