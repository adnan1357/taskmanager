'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VerificationCodeInput from '../../components/VerificationCodeInput'

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
  const [signupStep, setSignupStep] = useState(1) // 1 for personal info, 2 for password, 3 for verification
  const [verificationCode, setVerificationCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tempUserId, setTempUserId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

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

  // Get redirect URL from query params if present
  useEffect(() => {
    if (searchParams) {
      const redirect = searchParams.get('redirect')
      if (redirect) {
        setRedirectUrl(redirect)
        console.log('Will redirect to:', redirect)
      }
    }
  }, [searchParams])

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value
    })
  }

  const handlePersonalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Basic validation for personal info
    if (!signupData.firstName.trim() || !signupData.lastName.trim() || !signupData.email.trim()) {
      setError('Please fill in all fields')
      return
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signupData.email)) {
      setError('Please enter a valid email address')
      return
    }
    
    setSignupStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        })

        if (error) throw error
        if (data.session) {
          // Redirect to the URL from query params if present, otherwise to dashboard
          if (redirectUrl) {
            router.push(redirectUrl)
          } else {
            router.push('/dashboard')
          }
        }
      } else {
        if (signupData.password !== signupData.confirmPassword) {
          throw new Error('Passwords do not match')
        }

        console.log('Signing up user with admin API to bypass email confirmation');
        try {
          // Call our API route that uses admin.createUser
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: signupData.email,
              password: signupData.password,
              firstName: signupData.firstName,
              lastName: signupData.lastName,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to register user');
          }

          const data = await response.json();
          console.log('Signup response:', JSON.stringify(data, null, 2));

          if (data.requiresVerification && data.user) {
            // Store user ID for verification
            setTempUserId(data.user.id);
            // Move to verification step
            toast.success('Verification code sent to your email');
            setSignupStep(3);
            return;
          } else if (data.session) {
            router.push('/dashboard');
            return;
          } else if (data.user) {
            // User created but no session, go to login
            toast.success('Account created successfully! Please log in.');
            setIsLogin(true);
            return;
          }
        } catch (err) {
          console.error('Signup API error:', err);
          throw err;
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      
      // If the error indicates user already exists, switch to login view
      if (err instanceof Error && err.message.includes('already registered')) {
        setTimeout(() => {
          setIsLogin(true)
        }, 2000)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    
    try {
      if (!tempUserId || !verificationCode) {
        throw new Error('Missing required information')
      }
      
      console.log('Verifying code for user ID:', tempUserId)
      
      // Verify the code
      const response = await fetch('/api/auth/verify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signupData.email,
          code: verificationCode,
          userId: tempUserId,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Invalid verification code')
      }
      
      // Success - sign in the user and send to dashboard
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: signupData.email,
          password: signupData.password,
        });
        
        if (error) {
          console.error('Error signing in after verification:', error)
          if (error.message.includes('Email not confirmed')) {
            // Wait a moment and try again - there might be a delay in Supabase updating the email_confirmed_at field
            setTimeout(async () => {
              try {
                const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                  email: signupData.email,
                  password: signupData.password,
                });
                
                if (retryError) {
                  console.error('Retry sign-in failed:', retryError)
                  toast.success('Email verified! Please sign in.')
                  setIsLogin(true)
                } else if (retryData.session) {
                  toast.success('Email verified successfully!')
                  router.push('/dashboard')
                }
              } catch (e) {
                console.error('Error in retry sign-in:', e)
                toast.success('Email verified! Please sign in.')
                setIsLogin(true)
              } finally {
                setIsSubmitting(false)
              }
            }, 2000) // Wait 2 seconds and try again
            return
          }
          throw error
        }
        
        if (data.session) {
          toast.success('Email verified successfully!')
          router.push('/dashboard');
        } else {
          // Fallback
          toast.success('Email verified! Please sign in.')
          setIsLogin(true);
        }
      } catch (signInError) {
        console.error('Error signing in after verification:', signInError);
        toast.success('Email verified! Please sign in.')
        setIsLogin(true);
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      // Pass redirect URL as state parameter to be used after OAuth
      const redirectOptions = redirectUrl 
        ? { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectUrl)}` }
        : { redirectTo: `${window.location.origin}/auth/callback` };
        
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectOptions
      });
      
      if (error) throw error;
    } catch (err) {
      console.error('Google auth error:', err);
      setError('Failed to sign in with Google');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-500 to-purple-500 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link href="/" className="flex justify-center mb-8">
            <span className="text-2xl font-bold text-white">TaskMaster</span>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <div className="mt-8 bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 relative">
          {!isLogin && signupStep === 2 && (
            <button
              type="button"
              onClick={() => setSignupStep(1)}
              className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <form className="space-y-6" onSubmit={isLogin ? handleSubmit : signupStep === 1 ? handlePersonalInfoSubmit : signupStep === 3 ? handleVerification : handleSubmit}>
            {isLogin ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                  </div>
                </div>
              </>
            ) : signupStep === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First name
                    </label>
                    <div className="mt-1">
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={signupData.firstName}
                        onChange={handleSignupChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last name
                    </label>
                    <div className="mt-1">
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={signupData.lastName}
                        onChange={handleSignupChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={signupData.email}
                      onChange={handleSignupChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                  </div>
                </div>
              </>
            ) : signupStep === 3 ? (
              <>
                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <VerificationCodeInput
                    value={verificationCode}
                    onChange={setVerificationCode}
                    disabled={isSubmitting}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    We've sent a verification code to your email. It will expire in 10 minutes.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!tempUserId) return;
                      setIsSubmitting(true);
                      try {
                        const response = await fetch('/api/auth/verify', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            email: signupData.email,
                            firstName: signupData.firstName,
                            userId: tempUserId,
                          }),
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || 'Failed to resend code');
                        }
                        
                        toast.success('Verification code resent');
                      } catch (err) {
                        console.error('Error resending code:', err);
                        setError(err instanceof Error ? err.message : 'Failed to resend code');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className="text-sm text-purple-600 hover:text-purple-500"
                  >
                    Resend code
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={signupData.password}
                        onChange={handleSignupChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={signupData.confirmPassword}
                        onChange={handleSignupChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Loading...</span>
                ) : (
                  isLogin ? 'Sign in' : signupStep === 1 ? 'Continue' : signupStep === 3 ? 'Verify' : 'Sign up'
                )}
              </button>
            </div>
          </form>
          
          {/* Add Google login button */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={signInWithGoogle}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-sm text-purple-600 hover:text-purple-500"
            >
              {isLogin ? 'Don\'t have an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}