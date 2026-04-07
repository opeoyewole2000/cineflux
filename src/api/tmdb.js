const BASE = import.meta.env.VITE_TMDB_BASE_URL || 'https://api.themoviedb.org/3'
const KEY = import.meta.env.VITE_TMDB_API_KEY || ''
const IMG = import.meta.env.VITE_TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p'

async function tmdb(path, params = {}) {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('api_key', KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`)
  return res.json()
}

export function posterUrl(path, size = 'w342') {
  if (!path) return null
  return `${IMG}/${size}${path}`
}

export function backdropUrl(path, size = 'w1280') {
  if (!path) return null
  return `${IMG}/${size}${path}`
}

export async function getTrending(timeWindow = 'week') {
  return tmdb(`/trending/movie/${timeWindow}`)
}

export async function getNowPlaying() {
  return tmdb('/movie/now_playing')
}

export async function getTopRated() {
  return tmdb('/movie/top_rated')
}

export async function getPopular() {
  return tmdb('/movie/popular')
}

export async function getMovieDetails(id) {
  return tmdb(`/movie/${id}`, { append_to_response: 'videos,credits' })
}

export async function searchMovies(query) {
  return tmdb('/search/movie', { query, include_adult: false })
}

export async function discoverByGenre(genreId) {
  return tmdb('/discover/movie', {
    with_genres: genreId,
    sort_by: 'popularity.desc',
  })
}

export const GENRES = {
  28: 'Action', 35: 'Comedy', 18: 'Drama', 27: 'Horror',
  878: 'Sci-Fi', 53: 'Thriller', 10749: 'Romance', 16: 'Animation',
}

export const GENRE_IDS = {
  Action: 28, Comedy: 35, Drama: 18, Horror: 27,
  'Sci-Fi': 878, Thriller: 53, Romance: 10749, Animation: 16,
}

export function getGenreNames(genreIds = []) {
  return genreIds.map(id => GENRES[id]).filter(Boolean).slice(0, 2).join(', ')
}
