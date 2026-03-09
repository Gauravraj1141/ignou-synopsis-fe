import React from 'react'
import axios from 'axios'
import './Dashboard.css'

export default function Dashboard({ token, onLogout }) {
  const [me, setMe] = React.useState(null)
  const [report, setReport] = React.useState([])
  const [page, setPage] = React.useState('dashboard') // 'dashboard' | 'mark'
  const [todayRecord, setTodayRecord] = React.useState(null)

  // camera states
  const videoRef = React.useRef(null)
  const canvasRef = React.useRef(null)
  const streamRef = React.useRef(null)
  const [cameraActive, setCameraActive] = React.useState(false)
  const [scanLoading, setScanLoading] = React.useState(false)
  const [scanMsg, setScanMsg] = React.useState({ type: '', text: '' })

  const api = React.useMemo(() => {
    const instance = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      headers: { Authorization: `Bearer ${token}` }
    })
    // Auto-logout on 401 (expired / invalid token)
    instance.interceptors.response.use(
      res => res,
      err => {
        if (err?.response?.status === 401) {
          localStorage.removeItem('access_token')
          onLogout()
        }
        return Promise.reject(err)
      }
    )
    return instance
  }, [token, onLogout])

  // Load user & report
  React.useEffect(() => {
    async function load() {
      try {
        const [userRes, repRes] = await Promise.all([
          api.get('/auth/me/'),
          api.get('/attendance/report/')
        ])
        setMe(userRes.data)
        setReport(repRes.data)
        const today = new Date().toISOString().split('T')[0]
        const rec = repRes.data.find(r => r.date === today)
        setTodayRecord(rec || null)
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [api])

  // Step 1: acquire stream when page changes to 'mark'
  React.useEffect(() => {
    if (page === 'mark') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [page])

  // Step 2: once cameraActive=true the <video> element is in the DOM — assign stream
  React.useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [cameraActive])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setCameraActive(true) // triggers re-render → <video> mounts → useEffect above assigns srcObject
    } catch (e) {
      setCameraActive(false)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  async function handleScan() {
    if (!cameraActive) {
      setScanMsg({ type: 'error', text: 'Camera not available. Please allow camera access.' })
      return
    }
    setScanLoading(true)
    setScanMsg({ type: '', text: '' })
    try {
      // Capture frame from video
      const video = videoRef.current
      const canvas = canvasRef.current

      // Guard: ensure video has actual dimensions (stream is live)
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        setScanMsg({ type: 'error', text: 'Camera not ready. Please wait a moment and try again.' })
        setScanLoading(false)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)

      // Convert canvas to a Blob (JPEG)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      const formData = new FormData()
      formData.append('image', blob, 'capture.jpg')

      await api.post('/mark-attendance/', formData)
      setScanMsg({ type: 'success', text: 'Attendance marked successfully!' })

      // Refresh report & today record
      const repRes = await api.get('/attendance/report/')
      setReport(repRes.data)
      const today = new Date().toISOString().split('T')[0]
      setTodayRecord(repRes.data.find(r => r.date === today) || null)
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        'Something went wrong. Please try again.'
      setScanMsg({ type: 'error', text: msg })
    } finally {
      setScanLoading(false)
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.slice(0, 7)
  const totalPresent = report.filter(r => r.status === 'present').length
  const monthPresent = report.filter(r => r.status === 'present' && r.date.startsWith(thisMonth)).length
  const recentRecords = [...report].slice(0, 10)

  const displayName = me ? `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.username : '...'
  const displayEmail = me?.email || me?.username || ''

  return (
    <div className="db-layout">
      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-top">
          <div className="db-logo">
            <span className="db-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="db-logo-text">FaceTrack</span>
          </div>
          <p className="db-sidebar-label">User Panel</p>

          <nav className="db-nav">
            <p className="db-nav-section">Navigation</p>
            <button
              className={`db-nav-item${page === 'dashboard' ? ' active' : ''}`}
              onClick={() => { setPage('dashboard'); setScanMsg({ type: '', text: '' }) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Dashboard
            </button>
            <button
              className={`db-nav-item${page === 'mark' ? ' active' : ''}`}
              onClick={() => { setPage('mark'); setScanMsg({ type: '', text: '' }) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Mark Attendance
            </button>
          </nav>
        </div>

        <div className="db-sidebar-bottom">
          <div className="db-user-info">
            <div className="db-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div className="db-user-details">
              <span className="db-user-name">{displayName}</span>
              <span className="db-user-email">{displayEmail}</span>
            </div>
          </div>
          <button className="db-logout-btn" onClick={onLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="db-main">
        <header className="db-header">
          <span className="db-header-breadcrumb">FaceTrack — AI-Powered Attendance System</span>
        </header>

        {/* Dashboard Page */}
        {page === 'dashboard' && (
          <div className="db-content">
            <div className="db-page-title">
              <h1>Dashboard</h1>
              <p className="db-page-date">{formatDate(today)}</p>
            </div>

            {/* Stats */}
            <div className="db-stats-grid">
              <div className="db-stat-card">
                <div className="db-stat-icon green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="db-stat-label">Total Present</p>
                  <p className="db-stat-value">{totalPresent}</p>
                </div>
              </div>
              <div className="db-stat-card">
                <div className="db-stat-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <p className="db-stat-label">This Month</p>
                  <p className="db-stat-value">{monthPresent}</p>
                </div>
              </div>
              <div className="db-stat-card">
                <div className="db-stat-icon purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <p className="db-stat-label">Today's Status</p>
                  <p className="db-stat-value" style={{ fontSize: '1rem', textTransform: 'capitalize' }}>
                    {todayRecord ? todayRecord.status : 'Not Marked'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Attendance Table */}
            <div className="db-table-card">
              <h2 className="db-section-title">Recent Attendance</h2>
              {recentRecords.length === 0 ? (
                <p className="db-empty-msg">No attendance records found.</p>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{formatDate(r.date)}</td>
                        <td>
                          <span className={`db-badge ${r.status}`}>{r.status}</span>
                        </td>
                        <td>{new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Mark Attendance Page */}
        {page === 'mark' && (
          <div className="db-content">
            <div className="db-page-title">
              <h1>Mark Attendance</h1>
              <p className="db-page-date">{formatDate(today)}</p>
            </div>

            <div className="db-mark-grid">
              {/* Camera Card */}
              <div className="db-card db-camera-card">
                <div className="db-card-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Face Scanner
                </div>

                <div className="db-camera-box">
                  {cameraActive ? (
                    <video ref={videoRef} className="db-video" autoPlay playsInline muted />
                  ) : (
                    <div className="db-camera-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5" width="48" height="48">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                        <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <p>Camera preview</p>
                      <p className="db-camera-sub">Position your face in the frame</p>
                    </div>
                  )}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {scanMsg.text && (
                  <div className={`db-scan-msg ${scanMsg.type}`}>
                    {scanMsg.type === 'success' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                    {scanMsg.text}
                  </div>
                )}

                <button
                  className="db-scan-btn"
                  onClick={handleScan}
                  disabled={scanLoading || !!todayRecord}
                >
                  {scanLoading ? (
                    <span className="db-spinner" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                      <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                  {todayRecord ? 'Attendance Already Marked' : scanLoading ? 'Scanning...' : 'Scan Face & Mark Attendance'}
                </button>
              </div>

              {/* Right column */}
              <div className="db-side-col">
                {/* Today's Status */}
                <div className="db-card">
                  <h3 className="db-card-title">Today's Status</h3>
                  <div className="db-status-row">
                    <span className="db-status-label">Date</span>
                    <span className="db-status-value">{formatDate(today)}</span>
                  </div>
                  <div className="db-status-row">
                    <span className="db-status-label">Status</span>
                    <span className={`db-badge ${todayRecord ? 'present' : 'absent'}`}>
                      {todayRecord ? 'Present' : 'Not Marked'}
                    </span>
                  </div>
                  <div className="db-status-row">
                    <span className="db-status-label">Method</span>
                    <span className="db-status-value">Face Recognition</span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="db-card">
                  <h3 className="db-card-title">Instructions</h3>
                  <ol className="db-instructions">
                    <li>Ensure your face is clearly visible and well-lit</li>
                    <li>Click "Scan Face &amp; Mark Attendance"</li>
                    <li>Hold still while the system scans your face</li>
                    <li>Wait for confirmation — your attendance will be recorded</li>
                    <li>If scan fails, adjust lighting/position and retry</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
