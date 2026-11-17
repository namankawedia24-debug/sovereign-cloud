
import { useState } from 'react'
import { loginUser, registerUser } from '../services/api'

function Register({
  onRegisterSuccess,
  onSwitchToLogin,
  theme = 'dark',
  setTheme,
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [loading, setLoading] = useState(false)

  const isDark = theme === 'dark'

  function toggleTheme() {
    if (setTheme) {
      setTheme(isDark ? 'light' : 'dark')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setMessageType('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setMessage('Please fill in all the required fields.')
      setMessageType('error')
      return
    }

    if (password.length < 8) {
      setMessage('Password must contain at least 8 characters.')
      setMessageType('error')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setMessageType('error')
      return
    }

    setLoading(true)

    try {
      await registerUser(trimmedName, trimmedEmail, password)

      setMessage('Registration successful! Logging you in...')
      setMessageType('success')

      const loginData = await loginUser(trimmedEmail, password)

      if (!loginData?.access_token) {
        throw new Error(
          'Account created, but automatic login failed. Please sign in manually.'
        )
      }

      sessionStorage.setItem('access_token', loginData.access_token)
      sessionStorage.setItem('token_type', loginData.token_type || 'bearer')

      onRegisterSuccess()
    } catch (error) {
      setMessage(error.message || 'Something went wrong. Please try again.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const pageBackground = isDark
    ? 'bg-slate-950 text-white'
    : 'bg-slate-100 text-slate-900'

  const cardBackground = isDark
    ? 'border-slate-800 bg-slate-900/90 shadow-black/30'
    : 'border-slate-200 bg-white shadow-slate-300/40'

  const headingColor = isDark ? 'text-white' : 'text-slate-900'
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-600'
  const labelColor = isDark ? 'text-slate-300' : 'text-slate-700'

  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 ${
    isDark
      ? 'border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500'
      : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
  }`

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
        <div className="mb-7 text-center">
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

        {/* Registration card */}
        <div className={`rounded-2xl border p-7 shadow-2xl transition-colors duration-300 sm:p-9 ${cardBackground}`}>

          <div className="mb-7">
            <h2 className={`text-2xl font-semibold ${headingColor}`}>
              Create your account
            </h2>
            <p className={`mt-2 text-sm ${mutedColor}`}>
              Join Sovereign Cloud and take control of your data.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Full name */}
            <div>
              <label
                htmlFor="register-name"
                className={`mb-2 block text-sm font-medium ${labelColor}`}
              >
                Full Name
              </label>

              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                required
                disabled={loading}
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
                className={`mb-2 block text-sm font-medium ${labelColor}`}
              >
                Email Address
              </label>

              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading}
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="register-password"
                className={`mb-2 block text-sm font-medium ${labelColor}`}
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={loading}
                  className={`${inputClass} pr-16`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-500 transition hover:text-blue-400"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <p className={`mt-2 text-xs ${mutedColor}`}>
                Use at least 8 characters.
              </p>
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirm-password"
                className={`mb-2 block text-sm font-medium ${labelColor}`}
              >
                Confirm Password
              </label>

              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  className={`${inputClass} pr-16`}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-500 transition hover:text-blue-400"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Feedback */}
            {message && (
              <div
                role={messageType === 'error' ? 'alert' : 'status'}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  messageType === 'error'
                    ? 'border-red-500/20 bg-red-500/10 text-red-500'
                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                }`}
              >
                {message}
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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login navigation */}
          <div className={`mt-7 border-t pt-6 text-center ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <p className={`text-sm ${mutedColor}`}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                disabled={loading}
                className="font-semibold text-blue-500 transition hover:text-blue-400 disabled:opacity-50"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-6 flex items-center justify-center gap-2 text-center text-xs ${mutedColor}`}>
          <span>Protected by role-based access and security policies.</span>
        </div>

        <p className={`mt-3 text-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>
          Sovereign Cloud Platform
        </p>
      </div>
    </div>
  )
}

export default Register
