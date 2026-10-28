import Files from './Files'
import AuditLogs from './AuditLogs'

function Dashboard({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold">Sovereign Cloud</h1>
          <p className="text-sm text-slate-400">
            Secure storage. Sovereign control.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-bold">
          Welcome, {user.name}
        </h2>

        <p className="mt-2 text-slate-400">
          Manage your files and monitor their security policies.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="font-semibold">My Files</h3>
            <p className="mt-2 text-sm text-slate-400">
              Upload, download and manage your files.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="font-semibold">Security Policies</h3>
            <p className="mt-2 text-sm text-slate-400">
              Review file classifications and compliance.
            </p>
          </div>

          {user.role === 'ADMIN' && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="font-semibold">Audit Logs</h3>
              <p className="mt-2 text-sm text-slate-400">
                Review security events and file activity.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Signed in as</p>
          <p className="mt-1 font-medium">{user.email}</p>

          <p className="mt-4 text-sm text-slate-400">Your role</p>
          <span className="mt-2 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-400">
            {user.role}
          </span>
        </div>
        <Files />
        {user.role === 'ADMIN' && <AuditLogs />}
      </main>
    </div>
  )
}

export default Dashboard
