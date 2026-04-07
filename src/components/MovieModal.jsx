import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getMovieDetails, backdropUrl, posterUrl, getGenreNames } from '../api/tmdb'
import styles from './MovieModal.module.css'

export default function MovieModal({ movie, onClose }) {
  const { myWatchlist, myRatings, myProgress, toggleWatchlist, rateMovie, updateProgress, traktToken } = useApp()
  const [details, setDetails] = useState(null)
  const [hoverStar, setHoverStar] = useState(0)

  const inWL = myWatchlist.includes(movie.id)
  const userRating = myRatings[movie.id] || 0
  const progress = myProgress[movie.id] || 0

  useEffect(() => {
    getMovieDetails(movie.id).then(setDetails).catch(() => {})
  }, [movie.id])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const m = details || movie
  const backdrop = backdropUrl(m.backdrop_path)
  const poster = posterUrl(m.poster_path, 'w342')
  const year = m.release_date?.slice(0, 4) || ''
  const runtime = m.runtime ? `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m` : ''
  const genres = m.genres ? m.genres.map(g => g.name).slice(0, 3).join(', ') : getGenreNames(m.genre_ids)
  const trailer = details?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')

  function handleWatch() {
    updateProgress(movie.id, Math.min(100, progress + 20))
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.hero} style={backdrop ? { backgroundImage: `url(${backdrop})` } : {}}>
          <div className={styles.heroOverlay} />
          {poster && <img src={poster} alt={m.title} className={styles.poster} />}
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{m.title}</h2>
            {traktToken && <span className="badge badge-trakt">● Trakt synced</span>}
          </div>

          <div className={styles.meta}>
            {year && <span>{year}</span>}
            {runtime && <><span className={styles.dot}>·</span><span>{runtime}</span></>}
            {genres && <><span className={styles.dot}>·</span><span>{genres}</span></>}
            {m.vote_average > 0 && <><span className={styles.dot}>·</span><span className={styles.imdb}>★ {m.vote_average?.toFixed(1)}</span></>}
          </div>

          {progress > 0 && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
              <span className={styles.progressLabel}>{Math.round(progress)}% watched</span>
            </div>
          )}

          {m.overview && <p className={styles.overview}>{m.overview}</p>}

          <div className={styles.ratingSection}>
            <span className={styles.ratingLabel}>Your rating:</span>
            <div className={styles.stars}>
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  className={`${styles.star} ${n <= (hoverStar || userRating) ? styles.starOn : ''}`}
                  onMouseEnter={() => setHoverStar(n)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => rateMovie(movie.id, n)}
                >★</button>
              ))}
              {userRating > 0 && <span className={styles.ratingVal}>{userRating}/5</span>}
            </div>
          </div>

          <div className={styles.actions}>
            <button className="btn-primary" onClick={handleWatch}>▶ Watch now</button>
            <button className="btn-secondary" onClick={() => toggleWatchlist(movie.id)}>
              {inWL ? '★ In watchlist' : '+ Watchlist'}
            </button>
            {trailer && (
              <a
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >▶ Trailer</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
