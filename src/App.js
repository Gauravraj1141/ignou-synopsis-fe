import React from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

export default function App(){
  const [token, setToken] = React.useState(null)
  return (
    <div>
      {!token ? <Login onLogin={setToken} /> : <Dashboard token={token} />}
    </div>
  )
}
