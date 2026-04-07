import { createContext, useContext, useState, useEffect } from 'react'
import { getTraktWatchlist, getTraktRatings, getTraktWatchedHistory } from '../api/trakt'

const AppContext = createContext(null)

const DEFAULT_PROFILES = [
  { id: 'p1', name: 'John', color: '#533ab7', isOwner: true },
]

const PROFILE_COLORS = [
  '#533ab7', '#c0306a', '#0f6e56', '#993c1d',
  '#0c447c', '#854f0b', '#3b6d11', '#72243e',
]

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function AppProvider({ children }) {
  const [profiles, setProfiles] = useState(() => load('cf_profiles', DEFAULT_PROFILES))
  const [activeProfile, setActiveProfile] = useState(() => load('cf_active_profile', null))
  const [watchlists, setWatchlists] = useState(() => load('cf_watchlists', {}))
  const [ratings, setRatings] = useState(() => load('cf_ratings', {}))
  const [progress, setProgress] = useState(() => load('cf_progress', {}))
  const [traktToken, setTraktToken] = useState(() => load('cf_trakt_token', null))
  const [traktUser, setTraktUser] = useState(() => load('cf_trakt_user', null))
  const [traktSettings, setTraktSettings] = useState(() => load('cf_trakt_settings', {
    autoSync: true, syncRatings: true, syncWatchlist: false,
  }))

  useEffect(() => { save('cf_profiles', profiles) }, [profiles])
  useEffect(() => { save('cf_active_profile', activeProfile) }, [activeProfile])
  useEffect(() => { save('cf_watchlists', watchlists) }, [watchlists])
  useEffect(() => { save('cf_ratings', ratings) }, [ratings])
  useEffect(() => { save('cf_progress', progress) }, [progress])
  useEffect(() => { save('cf_trakt_token', traktToken) }, [traktToken])
  useEffect(() => { save('cf_trakt_user', traktUser) }, [traktUser])
  useEffect(() => { save('cf_trakt_settings', traktSettings) }, [traktSettings])

  const pid = activeProfile?.id

  const myWatchlist = watchlists[pid] || []
  const myRatings = ratings[pid] || {}
  const myProgress = progress[pid] || {}

  function selectProfile(profile) {
    setActiveProfile(profile)
  }

  function addProfile(name, color) {
    if (profiles.length >= 5) return false
    const profile = { id: `p_${Date.now()}`, name, color, isOwner: false }
    setProfiles(prev => [...prev, profile])
    return true
  }

  function updateProfile(id, updates) {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    if (activeProfile?.id === id) setActiveProfile(prev => ({ ...prev, ...updates }))
  }

  function deleteProfile(id) {
    setProfiles(prev => prev.filter(p => p.id !== id))
    setWatchlists(prev => { const n = { ...prev }; delete n[id]; return n })
    setRatings(prev => { const n = { ...prev }; delete n[id]; return n })
    setProgress(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function toggleWatchlist(movieId) {
    setWatchlists(prev => {
      const cur = prev[pid] || []
      const updated = cur.includes(movieId) ? cur.filter(id => id !== movieId) : [...cur, movieId]
      return { ...prev, [pid]: updated }
    })
  }

  function rateMovie(movieId, stars) {
    setRatings(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [movieId]: stars } }))
  }

  function updateProgress(movieId, pct) {
    setProgress(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [movieId]: pct } }))
  }

  async function syncTraktData(token, profileId) {
    const id = profileId || pid
    if (!token || !id) {
      console.warn('[Trakt] syncTraktData called with missing token or profile id', { token: !!token, id })
      return
    }

    try {
      const [watchlist, ratingsData, watched] = await Promise.all([
        getTraktWatchlist(token),
        getTraktRatings(token),
        getTraktWatchedHistory(token),
      ])

      // Merge watchlist (Trakt ids.tmdb → local watchlist)
      const traktWlIds = watchlist.map(i => i.movie?.ids?.tmdb).filter(Boolean)
      setWatchlists(prev => ({
        ...prev,
        [id]: [...new Set([...(prev[id] || []), ...traktWlIds])],
      }))

      // Merge ratings (Trakt 1–10 → CineFlux 1–5)
      const newRatings = {}
      ratingsData.forEach(i => {
        if (i.movie?.ids?.tmdb) newRatings[i.movie.ids.tmdb] = Math.round(i.rating / 2)
      })
      setRatings(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), ...newRatings },
      }))

      // Merge watched history (any plays → 100% progress)
      const newProgress = {}
      watched.forEach(i => {
        if (i.movie?.ids?.tmdb && i.plays > 0) newProgress[i.movie.ids.tmdb] = 100
      })
      setProgress(prev => ({
        ...prev,
        [id]: { ...(prev[id] || {}), ...newProgress },
      }))

      console.log('[Trakt] Sync complete', {
        watchlist: traktWlIds.length,
        ratings: Object.keys(newRatings).length,
        watched: Object.keys(newProgress).length,
      })
    } catch (err) {
      console.error('[Trakt] Sync failed:', err)
    }
  }

  function connectTrakt(token, user) {
    setTraktToken(token)
    setTraktUser(user)
    // pid may not yet reflect latest state here; pass it explicitly as fallback
    syncTraktData(token, pid)
  }

  function disconnectTrakt() {
    setTraktToken(null)
    setTraktUser(null)
  }

  return (
    <AppContext.Provider value={{
      profiles, activeProfile, selectProfile, addProfile, updateProfile, deleteProfile,
      myWatchlist, myRatings, myProgress,
      toggleWatchlist, rateMovie, updateProgress,
      traktToken, traktUser, traktSettings, setTraktSettings, connectTrakt, disconnectTrakt, syncTraktData,
      PROFILE_COLORS,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
