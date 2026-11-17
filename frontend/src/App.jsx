
import { useEffect, useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  const [showRegister, setShowRegister] = useState(false)

  // Load saved theme, defaulting to dark mode.
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sovereign-theme') || 'dark'
  })

  // Apply and persist the selected theme.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.theme = theme
    localStorage.setItem('sovereign-theme', theme)
  }, [theme])

  function handleRegisterSuccess() {
    // Return to Login without unnecessarily reloading the application.
    setShowRegister(false)
  }

  return (
    <>
      {showRegister ? (
        <Register
          theme={theme}
          setTheme={setTheme}
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      ) : (
        <Login
          theme={theme}
          setTheme={setTheme}
          onSwitchToRegister={() => setShowRegister(true)}
        />
      )}
    </>
  )
}

export default App
