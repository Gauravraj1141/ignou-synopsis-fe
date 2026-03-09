import React from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'

export default function App(){
  const [token, setToken] = React.useState(() => localStorage.getItem('access_token') || null)
  const [role, setRole] = React.useState(() => localStorage.getItem('user_role') || null)

  function handleLogin(t, r) {
    localStorage.setItem('access_token', t)
    localStorage.setItem('user_role', r)
    setToken(t)
    setRole(r)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_role')
    setToken(null)
    setRole(null)
  }

  if (!token) return <Login onLogin={handleLogin} />
  if (role === 'admin') return <AdminDashboard token={token} onLogout={handleLogout} />
  return <Dashboard token={token} onLogout={handleLogout} />
}
