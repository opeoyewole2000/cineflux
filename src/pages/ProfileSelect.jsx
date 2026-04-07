import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import styles from './ProfileSelect.module.css'

export default function ProfileSelect() {
  const { profiles, selectProfile, addProfile, updateProfile, deleteProfile, PROFILE_COLORS } = useApp()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROFILE_COLORS[0])
  const [error, setError] = useState('')

  function pick(profile) {
    selectProfile(profile)
    navigate('/')
  }

  function openAdd() {
    setEditId(null)
    setName('')
    setColor(PROFILE_COLORS[0])
    setError('')
    setShowForm(true)
  }

  function openEdit(e, profile) {
    e.stopPropagation()
    setEditId(profile.id)
    setName(profile.name)
    setColor(profile.color)
    setError('')
    setShowForm(true)
  }

  function save() {
    if (!name.trim()) { setError('Please enter a name'); return }
    if (editId) {
      updateProfile(editId, { name: name.trim(), color })
    } else {
      const ok = addProfile(name.trim(), color)
      if (!ok) { setError('Maximum 5 profiles reached'); return }
    }
    setShowForm(false)
  }

  function initials(n) {
    return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.logo}>CINE<span>FLUX</span></div>
        <h1 className={styles.heading}>Who's watching?</h1>
        <p className={styles.sub}>Choose your profile to continue</p>

        <div className={styles.grid}>
          {profiles.map(p => (
            <div key={p.id} className={styles.card} onClick={() => pick(p)}>
              <div className={styles.avatar} style={{ background: p.color + '22', borderColor: p.color + '44' }}>
                <span style={{ color: p.color }}>{initials(p.name)}</span>
              </div>
              <div className={styles.cardName}>{p.name}</div>
              {p.isOwner && <div className={styles.ownerTag}>Owner</div>}
              <button className={styles.editBtn} onClick={e => openEdit(e, p)}>Edit</button>
            </div>
          ))}

          {profiles.length < 5 && (
            <div className={styles.card} onClick={openAdd}>
              <div className={styles.addAvatar}>
                <span>+</span>
              </div>
              <div className={styles.cardName} style={{ color: 'var(--text-muted)' }}>Add profile</div>
            </div>
          )}
        </div>

        <button className={styles.manageBtn} onClick={() => { pick(profiles[0]); navigate('/account') }}>
          Manage account
        </button>
      </div>

      {showForm && (
        <div className={styles.formBackdrop} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className={styles.form}>
            <h3 className={styles.formTitle}>{editId ? 'Edit profile' : 'New profile'}</h3>

            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. Alice"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                autoFocus
              />
              {error && <p className={styles.error}>{error}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Colour</label>
              <div className={styles.colorRow}>
                {PROFILE_COLORS.map(c => (
                  <div
                    key={c}
                    className={`${styles.colorDot} ${c === color ? styles.colorSel : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.preview}>
              <div className={styles.previewAv} style={{ background: color + '22', borderColor: color + '55' }}>
                <span style={{ color }}>{name ? initials(name) : '?'}</span>
              </div>
              <span className={styles.previewName}>{name || 'Preview'}</span>
            </div>

            <div className={styles.formActions}>
              <button className="btn-primary" onClick={save}>Save</button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              {editId && !profiles.find(p => p.id === editId)?.isOwner && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => { deleteProfile(editId); setShowForm(false) }}
                >Remove profile</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
