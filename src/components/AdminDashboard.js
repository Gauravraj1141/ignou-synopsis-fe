import React from 'react'
import axios from 'axios'
import './AdminDashboard.css'

export default function AdminDashboard({ token, onLogout }) {
  const [page, setPage] = React.useState('users')
  const [me, setMe] = React.useState(null)

  // Users state
  const [users, setUsers] = React.useState([])
  const [userSearch, setUserSearch] = React.useState('')
  const [usersLoading, setUsersLoading] = React.useState(false)

  // Attendance state
  const [attendance, setAttendance] = React.useState([])
  const [attSearch, setAttSearch] = React.useState('')
  const [attLoading, setAttLoading] = React.useState(false)

  // Add User modal
  const [showAddUser, setShowAddUser] = React.useState(false)
  const [addForm, setAddForm] = React.useState({ first_name: '', last_name: '', email: '', password: '', role: 'user' })
  const [addLoading, setAddLoading] = React.useState(false)
  const [addError, setAddError] = React.useState('')

  // Edit status modal
  const [editUser, setEditUser] = React.useState(null)
  const [editStatus, setEditStatus] = React.useState('')
  const [editLoading, setEditLoading] = React.useState(false)
  const [editError, setEditError] = React.useState('')

  // Delete confirm
  const [deleteUser, setDeleteUser] = React.useState(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // Face registration
  const [faceUser, setFaceUser] = React.useState('')
  const [faceCaptured, setFaceCaptured] = React.useState([]) // array of {blob, url}
  const [faceCamActive, setFaceCamActive] = React.useState(false)
  const [faceLoading, setFaceLoading] = React.useState(false)
  const [faceMsg, setFaceMsg] = React.useState({ type: '', text: '' })
  const faceVideoRef = React.useRef(null)
  const faceCanvasRef = React.useRef(null)
  const faceStreamRef = React.useRef(null)

  const api = React.useMemo(() => {
    const instance = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      headers: { Authorization: `Bearer ${token}` }
    })
    instance.interceptors.response.use(
      res => res,
      err => {
        if (err?.response?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user_role')
          onLogout()
        }
        return Promise.reject(err)
      }
    )
    return instance
  }, [token, onLogout])

  React.useEffect(() => {
    api.get('/auth/me/').then(r => setMe(r.data)).catch(() => {})
    // Pre-load data for dashboard stats
    loadUsers()
    loadAttendance()
  }, [api])

  React.useEffect(() => {
    if (page === 'users') loadUsers()
    if (page === 'attendance') loadAttendance()
    if (page === 'face') startFaceCamera()
    else stopFaceCamera()
    return () => stopFaceCamera()
  }, [page])

  // Assign stream once video element is in DOM
  React.useEffect(() => {
    if (faceCamActive && faceStreamRef.current && faceVideoRef.current) {
      faceVideoRef.current.srcObject = faceStreamRef.current
      faceVideoRef.current.play().catch(() => {})
    }
  }, [faceCamActive])

  async function startFaceCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      faceStreamRef.current = stream
      setFaceCamActive(true)
    } catch (e) {
      setFaceCamActive(false)
    }
  }

  function stopFaceCamera() {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(t => t.stop())
      faceStreamRef.current = null
    }
    setFaceCamActive(false)
  }

  function capturePhoto() {
    const video = faceVideoRef.current
    const canvas = faceCanvasRef.current
    if (!video || video.videoWidth === 0) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      setFaceCaptured(prev => [...prev, { blob, url }])
    }, 'image/jpeg', 0.9)
  }

  function removePhoto(idx) {
    setFaceCaptured(prev => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function loadUsers() {
    setUsersLoading(true)
    try {
      const res = await api.get('/user-list/')
      setUsers(res.data)
    } catch (e) {}
    setUsersLoading(false)
  }

  async function loadAttendance() {
    setAttLoading(true)
    try {
      const res = await api.get('/admin/attendance/')
      setAttendance(res.data)
    } catch (e) {}
    setAttLoading(false)
  }

  async function handleAddUser(e) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      await api.post('/auth/register/', addForm)
      setShowAddUser(false)
      setAddForm({ first_name: '', last_name: '', email: '', password: '', role: 'user' })
      await loadUsers()
    } catch (err) {
      const d = err?.response?.data
      const msg = d?.email?.[0] || d?.password?.[0] || d?.detail || JSON.stringify(d) || 'Failed to add user.'
      setAddError(msg)
    }
    setAddLoading(false)
  }

  async function handleUpdateStatus(e) {
    e.preventDefault()
    setEditError('')
    setEditLoading(true)
    try {
      await api.put('/update-status/', { user_id: editUser.user_id, status: editStatus })
      setEditUser(null)
      await loadUsers()
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Failed to update status.')
    }
    setEditLoading(false)
  }

  async function handleDelete() {
    if (!deleteUser) return
    setDeleteLoading(true)
    try {
      await api.delete(`/users/${deleteUser.user_id}/delete/`)
      setDeleteUser(null)
      await loadUsers()
    } catch (e) {}
    setDeleteLoading(false)
  }

  async function handleFaceRegister(e) {
    e.preventDefault()
    setFaceMsg({ type: '', text: '' })
    if (!faceUser) { setFaceMsg({ type: 'error', text: 'Please select a user.' }); return }
    if (faceCaptured.length < 3) { setFaceMsg({ type: 'error', text: 'Please capture all 3 photos first.' }); return }
    setFaceLoading(true)
    try {
      const formData = new FormData()
      formData.append('user_id', faceUser)
      faceCaptured.forEach((p, i) => formData.append('image', p.blob, `face_${i + 1}.jpg`))
      await api.post('/register-face/', formData)
      setFaceMsg({ type: 'success', text: 'Face registered successfully!' })
      faceCaptured.forEach(p => URL.revokeObjectURL(p.url))
      setFaceCaptured([])
      setFaceUser('')
      await loadUsers()
    } catch (err) {
      setFaceMsg({ type: 'error', text: err?.response?.data?.error || 'Face registration failed.' })
    }
    setFaceLoading(false)
  }

  function formatDate(str) {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
  }

  const today = new Date().toISOString().split('T')[0]
  const activeUsers = users.filter(u => u.status?.toLowerCase() === 'active').length
  const todayAtt = attendance.filter(a => a.date === today).length
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  )
  const filteredAtt = attendance.filter(a =>
    a.name?.toLowerCase().includes(attSearch.toLowerCase()) ||
    a.email?.toLowerCase().includes(attSearch.toLowerCase())
  )

  const displayName = me ? `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username : '...'
  const displayEmail = me?.email || me?.username || ''

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { key: 'users',     label: 'Users',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { key: 'attendance',label: 'Attendance',icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { key: 'reports',   label: 'Reports',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { key: 'face',      label: 'Face Registration', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><circle cx="12" cy="12" r="3"/></svg> },
  ]

  return (
    <div className="ad-layout">
      {/* ── Sidebar ── */}
      <aside className="ad-sidebar">
        <div className="ad-sidebar-top">
          <div className="ad-logo">
            <span className="ad-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </span>
            <span className="ad-logo-text">FaceTrack</span>
          </div>
          <p className="ad-sidebar-label">Admin Panel</p>

          <nav className="ad-nav">
            <p className="ad-nav-section">Navigation</p>
            {NAV.map(n => (
              <button
                key={n.key}
                className={`ad-nav-item${page === n.key ? ' active' : ''}`}
                onClick={() => setPage(n.key)}
              >
                {n.icon}{n.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="ad-sidebar-bottom">
          <div className="ad-user-info">
            <div className="ad-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div className="ad-user-details">
              <span className="ad-user-name">{displayName}</span>
              <span className="ad-user-email">{displayEmail}</span>
            </div>
          </div>
          <button className="ad-logout-btn" onClick={onLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ad-main">
        <header className="ad-header">
          <span>FaceTrack — AI-Powered Attendance System</span>
        </header>

        {/* ── Dashboard Page ── */}
        {page === 'dashboard' && (
          <div className="ad-content">
            <h1 className="ad-page-title">Dashboard</h1>
            <div className="ad-stats-grid">
              {[
                { label: 'Total Users', value: users.length || '—', color: 'blue', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
                { label: 'Active Users', value: activeUsers || '—', color: 'green', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> },
                { label: "Today's Attendance", value: todayAtt || '—', color: 'purple', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                { label: 'Total Records', value: attendance.length || '—', color: 'orange', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              ].map(s => (
                <div className="ad-stat-card" key={s.label}>
                  <div className={`ad-stat-icon ${s.color}`}>{s.icon}</div>
                  <div>
                    <p className="ad-stat-label">{s.label}</p>
                    <p className="ad-stat-value">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="ad-dash-hint">Select a section from the sidebar to manage users, attendance, or face registrations.</p>
          </div>
        )}

        {/* ── Users Page ── */}
        {page === 'users' && (
          <div className="ad-content">
            <div className="ad-page-header">
              <h1 className="ad-page-title">User Management</h1>
              <button className="ad-add-btn" onClick={() => { setShowAddUser(true); setAddError('') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add User
              </button>
            </div>

            <div className="ad-search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>

            <div className="ad-table-card">
              {usersLoading ? (
                <p className="ad-loading">Loading...</p>
              ) : (
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Role</th>
                      <th>Registered</th><th>Status</th><th style={{textAlign:'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} className="ad-empty">No users found.</td></tr>
                    )}
                    {filteredUsers.map(u => (
                      <tr key={u.user_id}>
                        <td className="ad-td-bold">{u.name}</td>
                        <td className="ad-td-muted">{u.email}</td>
                        <td>{u.role}</td>
                        <td>{formatDate(u.date_joined)}</td>
                        <td>
                          <span className={`ad-badge ${u.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="ad-actions">
                          <button className="ad-icon-btn edit" title="Edit status" onClick={() => { setEditUser(u); setEditStatus(u.status?.toLowerCase() === 'active' ? 'active' : 'inactive'); setEditError('') }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="ad-icon-btn del" title="Delete user" onClick={() => setDeleteUser(u)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6"/><path d="M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Attendance Page ── */}
        {page === 'attendance' && (
          <div className="ad-content">
            <h1 className="ad-page-title">Attendance Records</h1>
            <div className="ad-search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input placeholder="Search by name or email..." value={attSearch} onChange={e => setAttSearch(e.target.value)} />
            </div>
            <div className="ad-table-card">
              {attLoading ? (
                <p className="ad-loading">Loading...</p>
              ) : (
                <table className="ad-table">
                  <thead>
                    <tr><th>#</th><th>Name</th><th>Email</th><th>Date</th><th>Status</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {filteredAtt.length === 0 && (
                      <tr><td colSpan={6} className="ad-empty">No records found.</td></tr>
                    )}
                    {filteredAtt.map((a, i) => (
                      <tr key={a.id}>
                        <td className="ad-td-muted">{i + 1}</td>
                        <td className="ad-td-bold">{a.name}</td>
                        <td className="ad-td-muted">{a.email}</td>
                        <td>{formatDate(a.date)}</td>
                        <td><span className={`ad-badge ${a.status}`}>{a.status}</span></td>
                        <td className="ad-td-muted">{new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Reports Page ── */}
        {page === 'reports' && (
          <div className="ad-content">
            <h1 className="ad-page-title">Reports</h1>
            <div className="ad-table-card">
              <p className="ad-empty" style={{padding:'2rem'}}>Attendance summary report coming soon.</p>
            </div>
          </div>
        )}

        {/* ── Face Registration Page ── */}
        {page === 'face' && (
          <div className="ad-content">
            <h1 className="ad-page-title">Face Registration</h1>
            <div className="ad-face-layout">
              {/* Left — camera + controls */}
              <div className="ad-form-card" style={{flex: 1}}>
                <p className="ad-form-desc">Select a user, capture 3 clear face photos, then click Register Face.</p>
                <form onSubmit={handleFaceRegister} className="ad-face-form">
                  {/* User select */}
                  <div className="ad-form-group">
                    <label className="ad-label">Select User</label>
                    <select className="ad-select" value={faceUser}
                      onChange={e => { setFaceUser(e.target.value); setFaceMsg({ type: '', text: '' }) }}>
                      <option value="">— choose a user —</option>
                      {users.filter(u => u.role?.toLowerCase() !== 'admin').map(u => (
                        <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>

                  {/* Camera box */}
                  <div className="ad-face-cam-box">
                    {faceCamActive ? (
                      <video ref={faceVideoRef} className="ad-face-video" autoPlay playsInline muted />
                    ) : (
                      <div className="ad-face-cam-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5" width="44" height="44">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <p>Camera unavailable</p>
                      </div>
                    )}
                    <canvas ref={faceCanvasRef} style={{display:'none'}} />
                    {/* Photo counter overlay */}
                    <div className="ad-face-counter">
                      {[0,1,2].map(i => (
                        <span key={i} className={`ad-face-dot ${faceCaptured[i] ? 'filled' : ''}`} />
                      ))}
                    </div>
                  </div>

                  {/* Capture button */}
                  <button
                    type="button"
                    className="ad-capture-btn"
                    onClick={capturePhoto}
                    disabled={!faceCamActive || !faceUser || faceCaptured.length >= 3}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    {faceCaptured.length >= 3 ? '3 / 3 Photos Captured' : `Take Photo (${faceCaptured.length}/3)`}
                  </button>

                  {/* Thumbnails */}
                  <div className="ad-face-thumbs">
                    {[0,1,2].map(i => (
                      <div key={i} className={`ad-face-thumb ${faceCaptured[i] ? 'has-photo' : ''}`}>
                        {faceCaptured[i] ? (
                          <>
                            <img src={faceCaptured[i].url} alt={`Photo ${i+1}`} />
                            <button type="button" className="ad-thumb-remove" onClick={() => removePhoto(i)}
                              title="Remove">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                            <span className="ad-thumb-label">Photo {i+1}</span>
                          </>
                        ) : (
                          <span className="ad-thumb-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#ced4da" strokeWidth="1.5" width="28" height="28">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                            <p>Photo {i+1}</p>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {faceMsg.text && (
                    <div className={`ad-msg ${faceMsg.type}`}>{faceMsg.text}</div>
                  )}

                  <button
                    type="submit"
                    className="ad-submit-btn"
                    disabled={faceLoading || faceCaptured.length < 3 || !faceUser}
                  >
                    {faceLoading ? <span className="ad-spinner"/> : null}
                    {faceLoading ? 'Registering...' : 'Register Face'}
                  </button>
                </form>
              </div>

              {/* Right — instructions */}
              <div className="ad-face-instructions">
                <h3>Instructions</h3>
                <ol>
                  <li>Select the user from the dropdown</li>
                  <li>Ensure the face is clearly visible and well-lit</li>
                  <li>Click <strong>Take Photo</strong> to capture each photo</li>
                  <li>Capture exactly <strong>3 photos</strong> from slightly different angles</li>
                  <li>Remove and retake any photo if needed</li>
                  <li>Click <strong>Register Face</strong> to save</li>
                </ol>
                <div className="ad-face-tips">
                  <p><strong>Tips for best results:</strong></p>
                  <ul>
                    <li>Use good front-facing lighting</li>
                    <li>Avoid heavy shadows on the face</li>
                    <li>Look directly at the camera</li>
                    <li>Vary the angle slightly across 3 shots</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Add User Modal ── */}
      {showAddUser && (
        <div className="ad-modal-overlay" onClick={() => setShowAddUser(false)}>
          <div className="ad-modal" onClick={e => e.stopPropagation()}>
            <div className="ad-modal-header">
              <h2>Add New User</h2>
              <button className="ad-modal-close" onClick={() => setShowAddUser(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddUser} className="ad-modal-form">
              <div className="ad-modal-row">
                <div className="ad-form-group">
                  <label className="ad-label">First Name</label>
                  <input className="ad-input" value={addForm.first_name} onChange={e => setAddForm(p => ({...p, first_name: e.target.value}))} placeholder="First name" />
                </div>
                <div className="ad-form-group">
                  <label className="ad-label">Last Name</label>
                  <input className="ad-input" value={addForm.last_name} onChange={e => setAddForm(p => ({...p, last_name: e.target.value}))} placeholder="Last name" />
                </div>
              </div>
              <div className="ad-form-group">
                <label className="ad-label">Email</label>
                <input className="ad-input" type="email" value={addForm.email} onChange={e => setAddForm(p => ({...p, email: e.target.value}))} placeholder="email@example.com" required />
              </div>
              <div className="ad-form-group">
                <label className="ad-label">Password</label>
                <input className="ad-input" type="password" value={addForm.password} onChange={e => setAddForm(p => ({...p, password: e.target.value}))} placeholder="Min. 8 characters" required />
              </div>
              <div className="ad-form-group">
                <label className="ad-label">Role</label>
                <select className="ad-select" value={addForm.role} onChange={e => setAddForm(p => ({...p, role: e.target.value}))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {addError && <div className="ad-msg error">{addError}</div>}
              <div className="ad-modal-actions">
                <button type="button" className="ad-cancel-btn" onClick={() => setShowAddUser(false)}>Cancel</button>
                <button type="submit" className="ad-submit-btn" disabled={addLoading}>
                  {addLoading ? <span className="ad-spinner"/> : null}
                  {addLoading ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Status Modal ── */}
      {editUser && (
        <div className="ad-modal-overlay" onClick={() => setEditUser(null)}>
          <div className="ad-modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="ad-modal-header">
              <h2>Update Status</h2>
              <button className="ad-modal-close" onClick={() => setEditUser(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="ad-modal-form">
              <p style={{fontSize:'0.88rem', color:'#6b7280', marginBottom:'1rem'}}>
                Updating status for <strong>{editUser.name}</strong>
              </p>
              <div className="ad-form-group">
                <label className="ad-label">Status</label>
                <select className="ad-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {editError && <div className="ad-msg error">{editError}</div>}
              <div className="ad-modal-actions">
                <button type="button" className="ad-cancel-btn" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="ad-submit-btn" disabled={editLoading}>
                  {editLoading ? <span className="ad-spinner"/> : null}
                  {editLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteUser && (
        <div className="ad-modal-overlay" onClick={() => setDeleteUser(null)}>
          <div className="ad-modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="ad-modal-header">
              <h2>Delete User</h2>
              <button className="ad-modal-close" onClick={() => setDeleteUser(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="ad-modal-form">
              <p style={{fontSize:'0.88rem', color:'#374151', marginBottom:'1.5rem'}}>
                Are you sure you want to delete <strong>{deleteUser.name}</strong>? This action cannot be undone.
              </p>
              <div className="ad-modal-actions">
                <button type="button" className="ad-cancel-btn" onClick={() => setDeleteUser(null)}>Cancel</button>
                <button type="button" className="ad-delete-confirm-btn" disabled={deleteLoading} onClick={handleDelete}>
                  {deleteLoading ? <span className="ad-spinner"/> : null}
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
