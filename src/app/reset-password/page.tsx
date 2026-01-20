'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { confirmPasswordReset, AuthError, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { resetPasswordSchema } from '@/lib/auth/validation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [oobCode, setOobCode] = useState<string | null>(null)

  // Password strength indicator
  const passwordStrength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }
  const isPasswordStrong = Object.values(passwordStrength).every(Boolean)

  useEffect(() => {
    const code = searchParams.get('oobCode')
    if (!code) {
      setError('Invalid reset link. Please request a new one.')
      setIsVerifying(false)
      return
    }

    setOobCode(code)

    // Verify the code
    if (!auth) {
      setError('Authentication service not available')
      setIsVerifying(false)
      return
    }

    verifyPasswordResetCode(auth, code)
      .then(() => {
        setIsValid(true)
      })
      .catch((error: AuthError) => {
        console.error('Code verification error:', error)
        if (error.code === 'auth/expired-action-code') {
          setError('This reset link has expired. Please request a new one.')
        } else if (error.code === 'auth/invalid-action-code') {
          setError('Invalid reset link. Please request a new one.')
        } else {
          setError('Unable to verify reset link. Please try again.')
        }
      })
      .finally(() => {
        setIsVerifying(false)
      })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!oobCode) {
        throw new Error('Missing reset code')
      }

      // Validate input
      const validation = resetPasswordSchema.safeParse({
        password,
        confirmPassword,
      })
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

      // Reset password
      await confirmPasswordReset(auth, oobCode, password)

      // Redirect to login with success message
      router.push('/login?reset=success')
    } catch (err) {
      const authError = err as AuthError
      switch (authError.code) {
        case 'auth/weak-password':
          setError('Password is too weak. Use uppercase, number, and 8+ characters.')
          break
        case 'auth/expired-action-code':
          setError('This reset link has expired. Please request a new one.')
          break
        case 'auth/invalid-action-code':
          setError('Invalid reset link. Please request a new one.')
          break
        default:
          setError(authError.message || 'Failed to reset password')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-teal to-white flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl">
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal mx-auto mb-4" />
              <p className="text-gray-600">Verifying reset link...</p>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Invalid link state
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-teal to-white flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl">
            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="relative w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-center mb-2">Invalid Link</h2>
              <p className="text-gray-600 text-center mb-6">{error || 'This reset link is invalid or has expired.'}</p>

              <div className="space-y-3">
                <Link href="/forgot-password" className="block">
                  <Button className="w-full bg-teal hover:bg-teal-dark text-white font-semibold py-2 rounded-lg">
                    Request New Link
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button className="w-full border border-gray-300 hover:border-gray-400 bg-white text-gray-700 font-semibold py-2 rounded-lg">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Valid link - show reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-light-teal to-white flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-navy">
                Create New Password
              </h1>
              <p className="text-gray-600 mt-2">Enter a strong password for your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent disabled:bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength */}
                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 space-y-2"
                  >
                    <div className="text-xs font-medium text-gray-700">Password strength:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full transition-colors ${
                            passwordStrength.length
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className={passwordStrength.length ? 'text-green-700' : 'text-gray-600'}>
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full transition-colors ${
                            passwordStrength.uppercase
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className={passwordStrength.uppercase ? 'text-green-700' : 'text-gray-600'}>
                          One uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full transition-colors ${
                            passwordStrength.number
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className={passwordStrength.number ? 'text-green-700' : 'text-gray-600'}>
                          One number
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent disabled:bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Match indicator */}
                {confirmPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 flex items-center gap-2"
                  >
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-700">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs text-red-700">Passwords do not match</span>
                      </>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Reset Button */}
              <Button
                type="submit"
                disabled={isLoading || !isPasswordStrong}
                className="w-full bg-teal hover:bg-teal-dark text-white font-semibold py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>

            {/* Back to Sign In */}
            <Link
              href="/login"
              className="flex items-center justify-center mt-6 text-teal hover:text-teal-dark font-medium"
            >
              Back to Sign In
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
