import { describe, it, expect } from 'vitest'
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './validation'

describe('signUpSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid signup data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      }
      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('name validation', () => {
    it('rejects name shorter than 2 characters', () => {
      const data = {
        name: 'J',
        email: 'john@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      }
      const result = signUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters')
      }
    })

    it('rejects name longer than 100 characters', () => {
      const data = {
        name: 'A'.repeat(101),
        email: 'john@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      }
      const result = signUpSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('email validation', () => {
    it('rejects invalid email format', () => {
      const data = {
        name: 'John Doe',
        email: 'notanemail',
        password: 'Password1',
        confirmPassword: 'Password1',
      }
      const result = signUpSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('accepts various valid email formats', () => {
      const emails = ['user@domain.com', 'user+tag@domain.co.uk', 'user.name@sub.domain.org']
      emails.forEach((email) => {
        const data = {
          name: 'John Doe',
          email,
          password: 'Password1',
          confirmPassword: 'Password1',
        }
        const result = signUpSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('password validation', () => {
    it('rejects password shorter than 8 characters', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Pass1',
        confirmPassword: 'Pass1',
      }
      const result = signUpSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects password without uppercase letter', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password1',
        confirmPassword: 'password1',
      }
      const result = signUpSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects password without number', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password',
        confirmPassword: 'Password',
      }
      const result = signUpSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('password confirmation', () => {
    it('rejects mismatched passwords', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password1',
        confirmPassword: 'Password2',
      }
      const result = signUpSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmError = result.error.issues.find((i) => i.path.includes('confirmPassword'))
        expect(confirmError?.message).toContain('do not match')
      }
    })
  })
})

describe('signInSchema', () => {
  it('accepts valid signin data', () => {
    const result = signInSchema.safeParse({
      email: 'john@example.com',
      password: 'anypassword',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = signInSchema.safeParse({
      email: 'notanemail',
      password: 'password',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = signInSchema.safeParse({
      email: 'john@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'john@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts valid reset data', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewPassword1',
      confirmPassword: 'NewPassword1',
    })
    expect(result.success).toBe(true)
  })

  it('validates password requirements', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'weak',
      confirmPassword: 'weak',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Password1',
      confirmPassword: 'Password2',
    })
    expect(result.success).toBe(false)
  })
})
