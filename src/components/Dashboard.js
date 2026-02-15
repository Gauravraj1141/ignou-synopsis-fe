import React from 'react'
import axios from 'axios'

export default function Dashboard({token}){
  const [me,setMe]=React.useState(null)
  const [report,setReport]=React.useState([])

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: { Authorization: `Bearer ${token}` }
  })

  React.useEffect(()=>{
    async function load(){
      const user = await api.get('/auth/me/')
      setMe(user.data)
      const rep = await api.get('/attendance/report/')
      setReport(rep.data)
    }
    load()
  },[])

  async function mark(){
    await api.post('/attendance/mark/', { embedding: [] })
    const rep = await api.get('/attendance/report/')
    setReport(rep.data)
  }

  return (
    <div>
      <h3>Dashboard</h3>
      {me && <p>Logged in as {me.username}</p>}
      <button onClick={mark}>Mark Attendance</button>
      <h4>Attendance</h4>
      <ul>
        {report.map(r => (
          <li key={r.id}>{r.date} - {r.status}</li>
        ))}
      </ul>
    </div>
  )
}
