import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getTraktAuthUrl } from '../api/trakt'
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
    PROFILE_COLORS,
  } = useApp()

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
