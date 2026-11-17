
import { useEffect, useState } from 'react'
import { authenticatedFetch, loginUser } from '../services/api'
import Dashboard from './Dashboard'

function Login({ onSwitchToRegister, theme = 'dark', setTheme }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [user, setUser] = useState(null)

  const isDark = theme === 'dark'

  useEffect(() => {
    let isActive = true

    async function restoreSession() {
      const token = sessionStorage.getItem('access_token')

      if (!token) {
        if (isActive) setCheckingSession(false)
        return
      }

      try {
        const response = await authenticatedFetch('/users/me')

        if (!response.ok) {
          throw new Error('Your session has expired. Please sign in again.')
        }

        const currentUser = await response.json()

        if (!currentUser) {
          throw new Error('Unable to retrieve your account details.')
        }

        if (isActive) setUser(currentUser)
      } catch (err) {
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('token_type')

        if (isActive) {
          setError(err.message || 'Please sign in again.')
        }
      } finally {
        if (isActive) setCheckingSession(false)
      }
    }

    restoreSession()

    return () => {
      isActive = false
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setError('Please enter your email address and password.')
      return
    }

    setLoading(true)

    try {
      const data = await loginUser(trimmedEmail, password)

      if (!data?.access_token) {
        throw new Error('Login failed. No access token was received.')
      }

      sessionStorage.setItem('access_token', data.access_token)
      sessionStorage.setItem('token_type', data.token_type || 'bearer')

      const response = await authenticatedFetch('/users/me')

      if (!response.ok) {
        throw new Error(
          'Unable to retrieve your account details. Please sign in again.'
        )
      }

      const loggedInUser = await response.json()

      if (!loggedInUser) {
        throw new Error('Unable to load your account details.')
      }

      setUser(loggedInUser)
    } catch (err) {
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('token_type')
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('token_type')
    setUser(null)
    setPassword('')
    setError('')
  }

  function toggleTheme() {
    if (setTheme) {
      setTheme(isDark ? 'light' : 'dark')
    }
  }

  const pageBackground = isDark
    ? 'bg-slate-950 text-white'
    : 'bg-slate-100 text-slate-900'

  const cardBackground = isDark
    ? 'border-slate-800 bg-slate-900/90'
    : 'border-slate-200 bg-white'

  const headingColor = isDark ? 'text-white' : 'text-slate-900'
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-600'

  const inputStyle = isDark
    ? 'border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'

  const labelStyle = isDark ? 'text-slate-300' : 'text-slate-700'

  if (checkingSession) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${pageBackground}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
          <p className={`text-sm ${mutedColor}`}>
            Verifying your secure session...
          </p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
      />
    )
  }

  return (
    <div className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 transition-colors duration-300 ${pageBackground}`}>

      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        disabled={!setTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`absolute right-5 top-5 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
          isDark
            ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            : 'border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
        }`}
      >
        <span>{isDark ? '☀' : '☾'}</span>
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>

      <div className="relative w-full max-w-md">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <h1 className={`text-3xl font-bold tracking-tight ${headingColor}`}>
            Sovereign <span className="text-blue-500">Cloud</span>
          </h1>

          <p className={`mt-2 text-sm ${mutedColor}`}>
            Secure storage. Sovereign control.
          </p>
        </div>

        {/* Login card */}
        <div className={`rounded-2xl border p-7 shadow-2xl transition-colors duration-300 sm:p-9 ${
          cardBackground
        } ${isDark ? 'shadow-black/30' : 'shadow-slate-300/40'}`}>

          <div className="mb-7">
            <h2 className={`text-2xl font-semibold ${headingColor}`}>
              Welcome back
            </h2>
            <p className={`mt-2 text-sm ${mutedColor}`}>
              Sign in to access your secure cloud workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className={`mb-2 block text-sm font-medium ${labelStyle}`}
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 ${inputStyle}`}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className={`mb-2 block text-sm font-medium ${labelStyle}`}
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className={`w-full rounded-xl border px-4 py-3 pr-16 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 ${inputStyle}`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-500 transition hover:text-blue-400 disabled:opacity-50"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500"
              >
                <span className="font-semibold">!</span>
                <p>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register link */}
          <div className={`mt-7 border-t pt-6 text-center ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <p className={`text-sm ${mutedColor}`}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                disabled={loading}
                className="font-semibold text-blue-500 transition hover:text-blue-400 disabled:opacity-50"
              >
                Create an account
              </button>
            </p>
          </div>
        </div>

        {/* Security footer */}
        <div className={`mt-6 flex items-center justify-center gap-2 text-center text-xs ${mutedColor}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Protected by role-based access and security policies.
        </div>

        <p className={`mt-3 text-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>
          Sovereign Cloud Platform
        </p>
      </div>
    </div>
  )
}

export default Login
