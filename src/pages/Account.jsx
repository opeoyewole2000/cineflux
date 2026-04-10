import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { getTraktAuthUrl } from '../api/trakt'
import { getDeviceCode, pollDeviceCredentials, exchangeDeviceToken, getRDUser } from '../api/realdebrid'
import styles from './Account.module.css'

function Toggle({ checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="switch-slider" />
    </label>
  )
}

export default function Account() {
  const navigate = useNavigate()
  const {
    profiles, activeProfile, selectProfile,
    addProfile, updateProfile, deleteProfile,
    traktToken, traktUser, traktSettings, setTraktSettings,
    connectTrakt, disconnectTrakt, syncTraktData,
    rdToken, rdUser, connectRD, disconnectRD,
    PROFILE_COLORS,
  } = useApp()

  const [rdStep, setRdStep] = useState(null) // null | 'pending' | 'polling'
  const [rdDeviceInfo, setRdDeviceInfo] = useState(null) // { user_code, verification_url, device_code }
  const [rdError, setRdError] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  async function handleRDConnect() {
    setRdError(null)
    try {
      setRdStep('pending')
      const info = await getDeviceCode()
      console.log('[RD] Device code response:', info)
      setRdDeviceInfo(info)
      setRdStep('polling')

      pollRef.current = setInterval(async () => {
        try {
          console.log('[RD] Polling credentials...')
          const creds = await pollDeviceCredentials(info.device_code)
          if (!creds) { console.log('[RD] Still waiting for user approval...'); return }
          console.log('[RD] Got credentials, exchanging for token...')
          clearInterval(pollRef.current)
          const tokenData = await exchangeDeviceToken(creds.client_id, creds.client_secret, info.device_code)
          console.log('[RD] Got token, fetching user...')
          const user = await getRDUser(tokenData.access_token)
          console.log('[RD] Connected as', user?.username)
          connectRD(tokenData.access_token, user, creds)
          setRdStep(null)
          setRdDeviceInfo(null)
        } catch (err) {
          console.error('[RD] Poll error:', err)
          clearInterval(pollRef.current)
          setRdStep(null)
          setRdError(err.message)
        }
      }, (info.interval || 5) * 1000)
    } catch (err) {
      setRdStep(null)
      setRdError(err.message)
    }
  }

  function cancelRDConnect() {
    clearInterval(pollRef.current)
    setRdStep(null)
    setRdDeviceInfo(null)
    setRdError(null)
  }

  function handleTraktConnect() {
    const url = getTraktAuthUrl()
    window.location.href = url
  }

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  function switchProfile(profile) {
    selectProfile(profile)
    navigate('/')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>Account & settings</h1>

        {/* Account */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Account details</h2>
          <div className={styles.row}><span className={styles.label}>Name</span><span>{activeProfile?.name || 'User'}</span></div>
          <div className={styles.row}><span className={styles.label}>Plan</span><span className={styles.planBadge}>Free</span></div>
          <div className={styles.row}><span className={styles.label}>Member since</span><span>2026</span></div>
        </div>

        {/* Trakt */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Trakt integration</h2>
          <div className={styles.traktHeader}>
            <div>
              <div className={styles.traktLogo}>trakt</div>
              <div className={styles.traktSub}>
                {traktToken ? 'Connected — watch history syncing' : 'Sync your watch history & ratings'}
              </div>
            </div>
            {traktToken
              ? <span className={`badge badge-trakt`}>● Connected</span>
              : <button className={styles.traktConnectBtn} onClick={handleTraktConnect}>Connect Trakt</button>}
          </div>

          {traktToken && (
            <>
              <div className={styles.divider} />
              {traktUser && (
                <div className={styles.row}><span className={styles.label}>Connected as</span><span>@{traktUser.username}</span></div>
              )}
              <div className={styles.row}>
                <span className={styles.label}>Auto-sync</span>
                <Toggle checked={traktSettings.autoSync} onChange={v => setTraktSettings(s => ({ ...s, autoSync: v }))} />
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Sync ratings</span>
                <Toggle checked={traktSettings.syncRatings} onChange={v => setTraktSettings(s => ({ ...s, syncRatings: v }))} />
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Sync watchlist</span>
                <Toggle checked={traktSettings.syncWatchlist} onChange={v => setTraktSettings(s => ({ ...s, syncWatchlist: v }))} />
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8 }}>
                <button className="btn-ghost" onClick={() => syncTraktData(traktToken)}>↻ Sync now</button>
                <button className="btn-ghost" onClick={disconnectTrakt} style={{ color: '#f09595' }}>Disconnect</button>
              </div>
            </>
          )}
        </div>

        {/* Real-Debrid */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Real-Debrid</h2>
          <div className={styles.traktHeader}>
            <div>
              <div className={styles.traktLogo} style={{ color: '#00d4ff' }}>real-debrid</div>
              <div className={styles.traktSub}>
                {rdToken ? `Connected as ${rdUser?.username || '...'}` : 'Stream movies via Real-Debrid'}
              </div>
            </div>
            {rdToken
              ? <span className="badge" style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>● Connected</span>
              : !rdStep && <button className={styles.traktConnectBtn} style={{ background: '#00d4ff', color: '#000' }} onClick={handleRDConnect}>Connect RD</button>
            }
          </div>

          {rdStep === 'polling' && rdDeviceInfo && (
            <>
              <div className={styles.divider} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Go to <strong style={{ color: 'var(--text)' }}>{rdDeviceInfo.verification_url}</strong> and enter this code:
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: 28, fontWeight: 700, letterSpacing: '0.2em',
                color: '#00d4ff', margin: '0.5rem 0 1rem',
              }}>
                {rdDeviceInfo.user_code}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Waiting for authorisation...
              </div>
              <button className="btn-ghost" onClick={cancelRDConnect} style={{ color: '#f09595' }}>Cancel</button>
            </>
          )}

          {rdError && (
            <div style={{ marginTop: '0.5rem', fontSize: 13, color: '#f09595' }}>{rdError}</div>
          )}

          {rdToken && (
            <>
              <div className={styles.divider} />
              {rdUser?.expiration && (
                <div className={styles.row}>
                  <span className={styles.label}>Premium until</span>
                  <span>{new Date(rdUser.expiration).toLocaleDateString()}</span>
                </div>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <button className="btn-ghost" onClick={disconnectRD} style={{ color: '#f09595' }}>Disconnect</button>
              </div>
            </>
          )}
        </div>

        {/* Profiles */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Profiles</h2>
            <span className={styles.cardSub}>up to 5</span>
          </div>

          <div className={styles.profileList}>
            {profiles.map(p => (
              <div key={p.id} className={styles.profileItem}>
                <div className={styles.profileLeft}>
                  <div
                    className={styles.profileAv}
                    style={{ background: p.color + '22', color: p.color }}
                    onClick={() => switchProfile(p)}
                    title={`Switch to ${p.name}`}
                  >{initials(p.name)}</div>
                  <div>
                    <div className={styles.profileName}>{p.name}</div>
                    <div className={styles.profileRole}>{p.isOwner ? 'Account owner' : 'Member'}</div>
                  </div>
                  {activeProfile?.id === p.id && <span className={styles.activeBadge}>Active</span>}
                </div>
                <div className={styles.profileActions}>
                  {!p.isOwner && (
                    <button className="btn-ghost" style={{ color: '#f09595', fontSize: 12 }} onClick={() => deleteProfile(p.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {profiles.length < 5 && (
            <button
              className="btn-ghost"
              style={{ marginTop: '0.75rem' }}
              onClick={() => navigate('/profiles')}
            >+ Add profile</button>
          )}
        </div>

        {/* Preferences */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Preferences</h2>
          <div className={styles.row}>
            <span className={styles.label}>Autoplay next episode</span>
            <Toggle checked={true} onChange={() => {}} />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Show progress bars</span>
            <Toggle checked={true} onChange={() => {}} />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Email notifications</span>
            <Toggle checked={false} onChange={() => {}} />
          </div>
        </div>

        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to home</button>
      </div>
    </div>
  )
}
