
import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from '../services/api'

function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  async function loadLogs() {
    setLoading(true)
    setError('')

    try {
      const response = await authenticatedFetch('/audit-logs/')

      if (!response.ok) {
        throw new Error(`Unable to retrieve audit logs (${response.status}).`)
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('Unexpected audit-log response.')
      }

      setLogs(data)
    } catch (err) {
      setError(err.message || 'Something went wrong while loading audit logs.')
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
      ? String(value)
      : date.toLocaleString()
  }

  function formatDetails(value) {
    if (value === null || value === undefined || value === '') {
      return '—'
    }

    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  }

  const successfulLogs = logs.filter(
    (log) => String(log.status || '').toUpperCase() === 'SUCCESS'
  ).length

  const failedLogs = logs.filter(
    (log) => String(log.status || '').toUpperCase() !== 'SUCCESS'
  ).length

  const filteredLogs = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return logs.filter((log) => {
      const status = String(log.status || '').toUpperCase()

      const matchesStatus =
        statusFilter === 'ALL' || status === statusFilter

      const searchableText = [
        log.action,
        log.user_id,
        log.resource_type,
        log.resource_id,
        log.status,
        formatDetails(log.details),
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = searchableText.includes(searchTerm)

      return matchesStatus && matchesSearch
    })
  }, [logs, search, statusFilter])

  function getStatusStyle(status) {
    if (String(status || '').toUpperCase() === 'SUCCESS') {
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
    }

    return 'border-red-500/20 bg-red-500/10 text-red-400'
  }

  return (
    <section className="mt-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 8v4l3 2" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                Audit Logs
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Monitor file activity and security events.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-blue-400 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={loading ? 'animate-spin' : ''}
          >
            <path d="M20 7v5h-5" />
            <path d="M4 17v-5h5" />
            <path d="M5.6 9a7 7 0 0 1 11.5-2L20 12" />
            <path d="M18.4 15a7 7 0 0 1-11.5 2L4 12" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Total Events</p>
          <p className="mt-3 text-3xl font-bold text-white">
            {logs.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Recorded audit events
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/10 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Successful Events</p>
          <p className="mt-3 text-3xl font-bold text-emerald-400">
            {successfulLogs}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Events marked SUCCESS
          </p>
        </div>

        <div className="rounded-xl border border-red-500/10 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Other Events</p>
          <p className="mt-3 text-3xl font-bold text-red-400">
            {failedLogs}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Events not marked SUCCESS
          </p>
        </div>
      </div>

      {/* Main table container */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

        {/* Search and filters */}
        <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h3 className="font-semibold text-white">
              Activity History
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Review recorded system activities.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activity..."
              aria-label="Search audit logs"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 sm:w-56"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter audit logs by status"
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="ALL">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="m-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            <p className="font-medium">Unable to load audit logs</p>
            <p className="mt-1">{error}</p>

            <button
              type="button"
              onClick={loadLogs}
              className="mt-3 font-medium text-red-300 underline hover:text-red-200"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
            <p className="mt-4 text-sm text-slate-400">
              Loading audit logs...
            </p>
          </div>
        ) : !error && filteredLogs.length === 0 ? (

          /* Empty state */
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>

            <h3 className="mt-4 font-semibold text-white">
              {logs.length === 0
                ? 'No audit events yet'
                : 'No matching events found'}
            </h3>

            <p className="mt-2 max-w-sm text-sm text-slate-400">
              {logs.length === 0
                ? 'System activities will appear here when audit events are recorded.'
                : 'Try changing your search term or status filter.'}
            </p>

            {(search || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('ALL')
                }}
                className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                Clear filters
              </button>
            )}
          </div>

        ) : !error ? (

          /* Audit table */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Timestamp</th>
                  <th className="px-5 py-4 font-medium">Action</th>
                  <th className="px-5 py-4 font-medium">User ID</th>
                  <th className="px-5 py-4 font-medium">Resource</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map((log, index) => {
                  const status = String(log.status || 'UNKNOWN').toUpperCase()

                  return (
                    <tr
                      key={log.id ?? `${log.created_at}-${index}`}
                      className="align-top transition hover:bg-slate-800/40"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="px-5 py-4 font-medium text-white">
                        {log.action || '—'}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {log.user_id ?? '—'}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-slate-300">
                          {log.resource_type || '—'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ID: {log.resource_id ?? '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="max-w-xs break-words px-5 py-4 text-slate-400">
                        {formatDetails(log.details)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Footer */}
        {!loading && !error && logs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-5 py-4">
            <p className="text-xs text-slate-500">
              Showing {filteredLogs.length} of {logs.length} retrieved events.
            </p>

            <p className="text-xs text-slate-500">
              Audit activity overview
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AuditLogs
