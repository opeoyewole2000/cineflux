import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import MovieCard from '../components/MovieCard'
import { getMovieDetails } from '../api/tmdb'
import styles from './Watchlist.module.css'

export default function Watchlist() {
  const { setSelectedMovie } = useOutletContext()
  const { myWatchlist } = useApp()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!myWatchlist.length) { setMovies([]); setLoading(false); return }
    setLoading(true)
    Promise.all(myWatchlist.map(id => getMovieDetails(id)))
      .then(setMovies)
      .catch(() => setMovies([]))
      .finally(() => setLoading(false))
  }, [myWatchlist.join(',')])

  if (loading) return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>My Watchlist</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ width: 148, height: 220, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Watchlist</h1>
        {movies.length > 0 && (
          <span className={styles.count}>{movies.length} {movies.length === 1 ? 'film' : 'films'}</span>
        )}
      </div>

      {movies.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎬</div>
          <h3 className={styles.emptyTitle}>Your watchlist is empty</h3>
          <p className={styles.emptySub}>Browse movies and hit + to save them here</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {movies.map(m => (
            <MovieCard key={m.id} movie={m} onClick={() => setSelectedMovie(m)} showProgress />
          ))}
        </div>
      )}
    </div>
  )
}
