'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface SignupData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Signup state
  const [signupData, setSignupData] = useState<SignupData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value
    })
  }

  const handleRedirectAfterAuth = () => {
    // Add a small delay to allow the session to be set
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        })

        if (error) {
          console.error('Login error:', error)
          throw error
        }

        if (data.session) {
          // Set the session cookie
          await supabase.auth.setSession(data.session)
          window.location.href = '/dashboard'
        }
      } else {
        // Validate passwords match
        if (signupData.password !== signupData.confirmPassword) {
          throw new Error('Passwords do not match')
        }

        console.log('Starting signup process...')
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            data: {
              first_name: signupData.firstName,
              last_name: signupData.lastName,
            }
          }
        })
        
        if (signUpError) {
          console.error('Signup error:', signUpError)
          throw signUpError
        }
        
        console.log('Signup successful:', signUpData)
        
        if (signUpData.user) {
          try {
            // Create a record in the users table
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: signUpData.user.id,
                full_name: `${signupData.firstName} ${signupData.lastName}`,
                avatar_url: null,
              })
            
            if (profileError) {
              console.error('Profile creation error:', profileError)
              throw profileError
            }

            console.log('Profile created successfully')

            // Sign in immediately
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: signupData.email,
              password: signupData.password,
            })
            
            if (signInError) {
              console.error('Sign in error:', signInError)
              throw signInError
            }
            
            console.log('Sign in successful')
            handleRedirectAfterAuth() // Remove await here too
          } catch (profileErr) {
            console.error('Profile/signin error:', profileErr)
            throw profileErr
          }
        } else {
          throw new Error('No user data returned from signup')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4 p-4">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? 'Login' : 'Sign Up'}
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            // Login Form
            <>
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded border p-2"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full rounded border p-2"
                required
                minLength={6}
              />
            </>
          ) : (
            // Signup Form
            <>
              <div className="flex gap-4">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={signupData.firstName}
                  onChange={handleSignupChange}
                  className="w-full rounded border p-2"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={signupData.lastName}
                  onChange={handleSignupChange}
                  className="w-full rounded border p-2"
                  required
                />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={signupData.email}
                onChange={handleSignupChange}
                className="w-full rounded border p-2"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={signupData.password}
                onChange={handleSignupChange}
                className="w-full rounded border p-2"
                required
                minLength={6}
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={signupData.confirmPassword}
                onChange={handleSignupChange}
                className="w-full rounded border p-2"
                required
                minLength={6}
              />
            </>
          )}
          
          <button
            type="submit"
            className="w-full rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
            }}
            className="text-blue-500 hover:underline"
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  )
}