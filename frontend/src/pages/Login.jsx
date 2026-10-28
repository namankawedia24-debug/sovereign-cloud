
import { authenticatedFetch, loginUser } from '../services/api'
import { useState } from 'react'
import Dashboard from './Dashboard'

function Login({ onSwitchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginUser(email, password)

      sessionStorage.setItem('access_token', data.access_token)
      sessionStorage.setItem('token_type', data.token_type)

      const response = await authenticatedFetch('/users/me')
      const loggedInUser = await response.json()

      setUser(loggedInUser)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={() => {
          sessionStorage.removeItem('access_token')
          sessionStorage.removeItem('token_type')
          setUser(null)
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Sovereign Cloud
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Secure storage. Sovereign control.
          </p>
        </div>

        <h2 className="mb-6 text-xl font-semibold text-white">
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-300"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            Register
          </button>
        </p>

        <p className="mt-5 text-center text-xs text-slate-500">
          Protected by role-based access and security policies.
        </p>
      </div>
    </div>
  )
}

export default Login
