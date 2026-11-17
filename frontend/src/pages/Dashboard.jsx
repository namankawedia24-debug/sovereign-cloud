
import { useEffect, useMemo, useState } from 'react'
import Files from './Files'
import AuditLogs from './AuditLogs'

function Dashboard({ user, onLogout, theme = 'dark', setTheme = () => {} }) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const isDark = theme === 'dark'

  const navigation = useMemo(
    () => [
      { name: 'Overview', id: 'dashboard', icon: '⌂' },
      { name: 'My Files', id: 'files', icon: '▤' },
      { name: 'Security Policies', id: 'policies', icon: '◈' },
      ...(isAdmin ? [{ name: 'Audit Logs', id: 'audit', icon: '◷' }] : []),
    ],
    [isAdmin]
  )

  // Track the section currently visible on screen.
  useEffect(() => {
    const sections = navigation
      .map((item) => document.getElementById(item.id))
      .filter(Boolean)

    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length) {
          setActiveSection(visible[0].target.id)
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [navigation])

  // Lock background scrolling while the mobile menu is open.
  useEffect(() => {
    if (!mobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleEscape(event) {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [mobileMenuOpen])

  function navigateTo(id) {
    const section = document.getElementById(id)
    if (!section) return

    setActiveSection(id)
    setMobileMenuOpen(false)
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function getInitials(name) {
    return (
      name
        ?.trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U'
    )
  }

  const currentSection =
    navigation.find((item) => item.id === activeSection)?.name || 'Overview'

  const initials = getInitials(user?.name)

  function NavigationItems({ mobile = false }) {
    return (
      <nav aria-label="Workspace navigation" className="space-y-2">
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigateTo(item.id)}
            aria-current={activeSection === item.id ? 'location' : undefined}
            className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
              activeSection === item.id
                ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-xl transition group-hover:scale-110">
              {item.icon}
            </span>
            <span>{item.name}</span>
            {activeSection === item.id && !mobile && (
              <span className="ml-auto h-2 w-2 rounded-full bg-blue-400" />
            )}
          </button>
        ))}
      </nav>
    )
  }

  function UserProfile({ compact = false }) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-slate-800/70 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/15 text-sm font-bold text-blue-400">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {user?.name || 'User'}
          </p>

          {!compact && (
            <p className="truncate text-xs text-slate-400">
              {user?.email || 'No email available'}
            </p>
          )}

          <span className="mt-1 inline-block rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            {user?.role || 'USER'}
          </span>
        </div>
      </div>
    )
  }

  function LogoutButton() {
    return (
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
      >
        <span aria-hidden="true">↪</span>
        Logout
      </button>
    )
  }

  function ThemeToggle() {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm font-medium text-slate-300 transition hover:border-blue-500/50 hover:bg-slate-800"
      >
        <span className="text-lg" aria-hidden="true">
          {isDark ? '☀' : '☾'}
        </span>
        <span className="hidden sm:inline">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      </button>
    )
  }

  return (
    <div
      data-theme={theme}
      className="dashboard-theme min-h-screen bg-slate-950 text-slate-100"
    >
      <style>{`
        .dashboard-theme {
          transition: background-color 180ms ease, color 180ms ease;
        }

        .dashboard-theme[data-theme="light"] {
          background: #f4f7fb;
          color: #172033;
        }

        .dashboard-theme[data-theme="light"] [class~="bg-slate-950"],
        .dashboard-theme[data-theme="light"] [class~="bg-slate-950/90"] {
          background-color: #f4f7fb;
        }

        .dashboard-theme[data-theme="light"] [class~="bg-slate-900"] {
          background-color: #ffffff;
        }

        .dashboard-theme[data-theme="light"] [class~="bg-slate-800"],
        .dashboard-theme[data-theme="light"] [class~="bg-slate-800/70"],
        .dashboard-theme[data-theme="light"] [class~="bg-slate-800/50"] {
          background-color: #eef2f8;
        }

        .dashboard-theme[data-theme="light"] [class~="text-white"],
        .dashboard-theme[data-theme="light"] [class~="text-slate-100"] {
          color: #172033;
        }

        .dashboard-theme[data-theme="light"] [class~="text-slate-300"] {
          color: #344258;
        }

        .dashboard-theme[data-theme="light"] [class~="text-slate-400"] {
          color: #64748b;
        }

        .dashboard-theme[data-theme="light"] [class~="text-slate-500"] {
          color: #718096;
        }

        .dashboard-theme[data-theme="light"] [class~="border-slate-800"],
        .dashboard-theme[data-theme="light"] [class~="border-slate-700"] {
          border-color: #dce3ed;
        }

        .dashboard-theme[data-theme="light"] [class~="bg-slate-900/50"] {
          background-color: rgb(255 255 255 / 75%);
        }

        .dashboard-theme[data-theme="light"] header {
          background-color: rgb(255 255 255 / 92%);
          border-color: #dce3ed;
        }

        .dashboard-theme[data-theme="light"] aside {
          border-color: #dce3ed;
        }

        .dashboard-theme[data-theme="light"] .dashboard-hero {
          background: linear-gradient(120deg, #e5efff, #f1f5ff 65%, #edf2ff);
          border-color: #cbdcf8;
        }

        .dashboard-theme[data-theme="light"] .dashboard-hero h1 {
          color: #172033;
        }

        .dashboard-theme[data-theme="light"] .dashboard-hero p {
          color: #475569;
        }

        .dashboard-theme button:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 3px;
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        <div className="border-b border-slate-800 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-lg">
              S
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Sovereign Cloud
              </h1>
              <p className="text-xs text-slate-400">
                Secure. Private. Sovereign.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>
          <NavigationItems />

          <div className="mt-10 rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg text-blue-400">◈</span>
              <p className="text-xs font-semibold text-blue-400">
                Data Sovereignty
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Manage your files with security classification and policy-based
              governance.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 p-4">
          <UserProfile />
          <div className="mt-4">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        >
          <aside
            className="flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile workspace navigation"
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                  S
                </div>
                <div>
                  <h2 className="font-bold text-white">Sovereign Cloud</h2>
                  <p className="text-xs text-slate-400">Secure Workspace</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close navigation"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
              <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Workspace
              </p>
              <NavigationItems mobile />
            </div>

            <div className="border-t border-slate-800 p-4">
              <UserProfile compact />
              <div className="mt-4">
                <LogoutButton />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="min-h-screen md:ml-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 text-xl text-slate-300 transition hover:bg-slate-800 md:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </button>

            <div>
              <p className="hidden text-xs text-slate-500 sm:block">
                Sovereign Cloud / Workspace
              </p>
              <h2 className="text-base font-bold text-white sm:mt-1 sm:text-lg">
                {currentSection}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-slate-400">
                {user?.role || 'USER'}
              </p>
            </div>

            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/15 text-sm font-bold text-blue-400"
              aria-label={`User initials: ${initials}`}
            >
              {initials}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
          {/* Overview */}
          <section id="dashboard" className="scroll-mt-24">
            <div className="dashboard-hero relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900 p-7 sm:p-10">
              <div className="relative z-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  SECURE CLOUD WORKSPACE
                </span>

                <h1 className="mt-5 max-w-2xl break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Welcome back, {user?.name || 'User'}
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                  Manage your digital assets, monitor security policies and
                  maintain control over your data with Sovereign Cloud.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigateTo('files')}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500"
                  >
                    Manage My Files →
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('policies')}
                    className="rounded-xl border border-slate-600 bg-slate-900/50 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-blue-300"
                  >
                    View Security Policies
                  </button>
                </div>
              </div>

              <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border border-blue-400/10 bg-blue-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 right-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="pointer-events-none absolute bottom-8 right-10 hidden text-8xl font-black text-blue-400/[0.04] lg:block">
                SC
              </div>
            </div>
          </section>

          {/* Feature Cards */}
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-white">
                Workspace Overview
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Access the core features of your cloud workspace.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => navigateTo('files')}
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl text-blue-400 transition group-hover:bg-blue-500/20">
                  ▤
                </div>
                <h3 className="mt-5 font-bold text-white">File Management</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Upload, download and organize your securely stored files.
                </p>
                <p className="mt-5 text-sm font-semibold text-blue-400">
                  Manage files →
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('policies')}
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl text-emerald-400 transition group-hover:bg-emerald-500/20">
                  ◈
                </div>
                <h3 className="mt-5 font-bold text-white">Security Policies</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Review file classifications and policy compliance.
                </p>
                <p className="mt-5 text-sm font-semibold text-emerald-400">
                  Review policies →
                </p>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigateTo('audit')}
                  className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-purple-500/40 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-2xl text-purple-400 transition group-hover:bg-purple-500/20">
                    ◷
                  </div>
                  <h3 className="mt-5 font-bold text-white">Audit Logs</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Monitor recorded security events and file activity.
                  </p>
                  <p className="mt-5 text-sm font-semibold text-purple-400">
                    View audit logs →
                  </p>
                </button>
              )}
            </div>
          </section>

          {/* Account Information */}
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5 sm:p-6">
              <div>
                <h2 className="font-bold text-white">Account Information</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Your registered account details.
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active Session
              </span>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {[
                ['Full Name', user?.name || 'Not available'],
                ['Email Address', user?.email || 'Not available'],
                ['Account Role', user?.role || 'Not available'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-800/50 p-4">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-2 break-words text-sm font-semibold text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* File Management */}
          <section id="files" className="scroll-mt-24">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-white">My Files</h2>
              <p className="mt-1 text-sm text-slate-400">
                Securely upload and manage your digital assets.
              </p>
            </div>
            <Files theme={theme} />
          </section>

          {/* Security Policies */}
          <section
            id="policies"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
          >
            <div className="border-b border-slate-800 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-xl text-emerald-400">
                  ◈
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Security Policies
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    File classification and data governance.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="max-w-3xl text-sm leading-7 text-slate-400">
                Files are assigned security classifications to support
                policy-based data governance. Use the policy check action in
                My Files to review compliance for individual files.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
                    PUBLIC
                  </span>
                  <h3 className="mt-4 font-semibold text-white">Public Data</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Files assigned the public classification.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400">
                    CONFIDENTIAL
                  </span>
                  <h3 className="mt-4 font-semibold text-white">
                    Confidential Data
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Files assigned the confidential classification.
                  </p>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                  <span className="inline-flex rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400">
                    RESTRICTED
                  </span>
                  <h3 className="mt-4 font-semibold text-white">
                    Restricted Data
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Files assigned the restricted classification.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Admin Audit Logs */}
          {isAdmin && (
            <section id="audit" className="scroll-mt-24">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white">Audit Logs</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Monitor recorded security events and file activity.
                </p>
              </div>
              <AuditLogs theme={theme} />
            </section>
          )}

          {/* Footer */}
          <footer className="border-t border-slate-800 py-7">
            <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  Sovereign Cloud
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Secure Storage. Sovereign Control.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                National Digital Infrastructure Prototype
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
