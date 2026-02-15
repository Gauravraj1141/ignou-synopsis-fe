import React from 'react'
import axios from 'axios'

export default function Login({onLogin}){
  const [username,setUsername]=React.useState('')
  const [password,setPassword]=React.useState('')

  async function submit(e){
    e.preventDefault()
    try{
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/token/`, {username,password})
      onLogin(res.data.access)
    }catch(err){
      alert('Login failed')
    }
  }

  return (
    <form onSubmit={submit}>
      <h3>Login</h3>
      <input placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  )
}
