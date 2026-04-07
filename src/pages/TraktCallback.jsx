import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { exchangeTraktCode, getTraktProfile } from '../api/trakt'

export default function TraktCallback() {
  const navigate = useNavigate()
  const { connectTrakt } = useApp()
  const [status, setStatus] = useState('Connecting to Trakt...')
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
      setError('No authorisation code received from Trakt.')
      return
    }

    exchangeTraktCode(code)
      .then(async tokenData => {
        setStatus('Fetching your Trakt profile...')
        const user = await getTraktProfile(tokenData.access_token)
        connectTrakt(tokenData.access_token, user)
        setStatus('Connected! Redirecting...')
        setTimeout(() => navigate('/account'), 1200)
      })
      .catch(err => {
        setError('Failed to connect to Trakt. Please try again.')
        console.error(err)
      })
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#ed5f34' }}>trakt</div>
      {error ? (
        <>
          <p style={{ color: '#f09595', fontSize: 15 }}>{error}</p>
          <button className="btn-secondary" onClick={() => navigate('/account')}>Back to account</button>
        </>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{status}</p>
          <div style={{
            width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)',
            borderTop: '3px solid #ed5f34', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  )
}
