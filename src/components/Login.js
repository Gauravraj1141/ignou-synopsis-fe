import React from 'react'
import axios from 'axios'
import './Login.css'

export default function Login({ onLogin }) {
  const [role, setRole] = React.useState('user')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [serverError, setServerError] = React.useState('')
  const [errors, setErrors] = React.useState({ username: '', password: '' })

  function validate() {
    const newErrors = { username: '', password: '' }
    if (!username.trim()) newErrors.username = 'Username is required.'
    if (!password) newErrors.password = 'Password is required.'
    else if (password.length < 4)
      newErrors.password = 'Password must be at least 4 characters.'
    setErrors(newErrors)
    return !newErrors.username && !newErrors.password
  }

  async function submit(e) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setLoading(true)
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/login/`,
        { username, password, role }
      )
      onLogin(res.data.access || res.data.token, res.data.role || 'user')
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Invalid credentials. Please try again.'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        </div>

        <h1 className="login-title">FaceTrack</h1>
        <p className="login-subtitle">AI-Powered Attendance System</p>

        {/* Server error banner */}
        {serverError && (
          <div className="login-server-error">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {serverError}
          </div>
        )}

        <form onSubmit={submit} noValidate>

          {/* Email */}
          <div className={`login-form-group${errors.username ? ' error' : ''}`}>
            <label className="login-label" htmlFor="username">Email</label>
            <div className="login-input-wrapper">
              <input
                id="username"
                className="login-input"
                type="text"
                placeholder="admin@example.com"
                value={username}
                autoComplete="username"
                onChange={e => {
                  setUsername(e.target.value)
                  if (errors.username) setErrors(prev => ({ ...prev, username: '' }))
                  setServerError('')
                }}
              />
            </div>
            {errors.username && (
              <span className="login-error-msg">{errors.username}</span>
            )}
          </div>

          {/* Password */}
          <div className={`login-form-group${errors.password ? ' error' : ''}`}>
            <label className="login-label" htmlFor="password">Password</label>
            <div className="login-input-wrapper">
              <input
                id="password"
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                autoComplete="current-password"
                onChange={e => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }))
                  setServerError('')
                }}
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword(v => !v)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24">
                    <line x1="17.94" y1="17.94" x2="22" y2="22" />
                    <line x1="1" y1="1" x2="5.06" y2="5.06" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M6.35 6.35A18.48 18.48 0 0 0 1 12s4 8 11 8c1.73 0 3.35-.44 4.76-1.2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <span className="login-error-msg">{errors.password}</span>
            )}
          </div>

          {/* Login as */}
          <div style={{ marginBottom: '1.1rem' }}>
            <span className="login-role-label">Login as</span>
            <div className="login-role-toggle">
              <button
                type="button"
                className={`login-role-btn${role === 'admin' ? ' active' : ''}`}
                onClick={() => { setRole('admin'); setServerError('') }}
              >
                Admin
              </button>
              <button
                type="button"
                className={`login-role-btn${role === 'user' ? ' active' : ''}`}
                onClick={() => { setRole('user'); setServerError('') }}
              >
                User
              </button>
            </div>
          </div>

          {/* Submit */}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? <span className="login-spinner" /> : null}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">or</div>
        <p className="login-signup-text">
          Don't have an account? <a href="#">Sign up</a>
        </p>

      </div>
    </div>
  )
}
