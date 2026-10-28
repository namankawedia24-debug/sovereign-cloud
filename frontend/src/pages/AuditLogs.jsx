
import { useEffect, useState } from 'react'
import { authenticatedFetch } from '../services/api'

function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLogs() {
    setLoading(true)
    setError('')

    try {
      const response = await authenticatedFetch('/audit-logs/')
      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('Unexpected audit-log response.')
      }

      setLogs(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  function formatDate(value) {
    if (!value) return '—'

    const date = new Date(value)

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString()
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Audit Logs
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Monitor file activity and security events.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-blue-400 hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300"
        >
          Unable to load audit logs: {error}
        </div>
      )}

      {loading ? (
        <p className="mt-5 text-sm text-slate-400">
          Loading audit logs...
        </p>
      ) : !error && logs.length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">
          No audit events found.
        </p>
      ) : !error ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="py-3 pr-4">Timestamp</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">User ID</th>
                <th className="py-3 pr-4">Resource</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">Details</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-800 align-top"
                >
                  <td className="whitespace-nowrap py-4 pr-4 text-slate-300">
                    {formatDate(log.created_at)}
                  </td>

                  <td className="py-4 pr-4 font-medium text-white">
                    {log.action}
                  </td>

                  <td className="py-4 pr-4">
                    {log.user_id ?? '—'}
                  </td>

                  <td className="py-4 pr-4">
                    <div>{log.resource_type}</div>
                    <div className="text-xs text-slate-500">
                      ID: {log.resource_id ?? '—'}
                    </div>
                  </td>

                  <td className="py-4 pr-4">
                    <span
                      className={
                        log.status === 'SUCCESS'
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }
                    >
                      {log.status}
                    </span>
                  </td>

                  <td className="max-w-xs break-words py-4 text-slate-400">
                    {log.details ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        Showing up to 100 recent events.
      </p>
    </section>
  )
}

export default AuditLogs
