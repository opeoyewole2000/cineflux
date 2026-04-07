const CLIENT_ID = import.meta.env.VITE_TRAKT_CLIENT_ID || ''
const CLIENT_SECRET = import.meta.env.VITE_TRAKT_CLIENT_SECRET || ''
const REDIRECT_URI = import.meta.env.VITE_TRAKT_REDIRECT_URI || 'http://localhost:5173/trakt/callback'
const BASE = 'https://api.trakt.tv'

export function getTraktAuthUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
  })
  return `https://trakt.tv/oauth/authorize?${params}`
}

export async function exchangeTraktCode(code) {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('Trakt auth failed')
  return res.json()
}

async function traktFetch(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': CLIENT_ID,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Trakt error: ${res.status}`)
  return res.json()
}

export async function getTraktProfile(token) {
  return traktFetch('/users/me', token)
}

export async function getTraktWatchlist(token) {
  return traktFetch('/users/me/watchlist/movies', token)
}

export async function getTraktWatchedHistory(token) {
  return traktFetch('/users/me/watched/movies', token)
}

export async function getTraktRatings(token) {
  return traktFetch('/users/me/ratings/movies', token)
}

export async function syncMovieToTrakt(token, tmdbId, title, year) {
  return traktFetch('/scrobble/stop', token, {
    method: 'POST',
    body: JSON.stringify({
      movie: { title, year, ids: { tmdb: tmdbId } },
      progress: 100,
    }),
  })
}

export async function addToTraktWatchlist(token, tmdbId, title, year) {
  return traktFetch('/sync/watchlist', token, {
    method: 'POST',
    body: JSON.stringify({
      movies: [{ title, year, ids: { tmdb: tmdbId } }],
    }),
  })
}

export async function rateTraktMovie(token, tmdbId, title, year, rating) {
  return traktFetch('/sync/ratings', token, {
    method: 'POST',
    body: JSON.stringify({
      movies: [{ title, year, rating, ids: { tmdb: tmdbId } }],
    }),
  })
}
