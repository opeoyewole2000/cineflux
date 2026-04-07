import { useApp } from '../context/AppContext'
import { posterUrl } from '../api/tmdb'
import styles from './MovieCard.module.css'

export default function MovieCard({ movie, onClick, showProgress = false, wide = false }) {
  const { myWatchlist, myRatings, myProgress, toggleWatchlist } = useApp()

  const inWL = myWatchlist.includes(movie.id)
  const userRating = myRatings[movie.id]
  const progress = myProgress[movie.id] || 0
  const rating = userRating ? `${userRating}/5` : (movie.vote_average?.toFixed(1) || '—')
  const year = movie.release_date?.slice(0, 4) || ''
  const poster = posterUrl(movie.poster_path, wide ? 'w500' : 'w342')

  const isNew = movie.release_date > '2024-01-01'
  const isTop = movie.vote_average >= 8.0

  function handleWL(e) {
    e.stopPropagation()
    toggleWatchlist(movie.id)
  }

  if (wide) {
    return (
      <div className={`${styles.wideCard} fade-in`} onClick={onClick}>
        <div className={styles.wideThumb}>
          {poster
            ? <img src={poster} alt={movie.title} className={styles.wideImg} />
            : <div className={styles.widePlaceholder}><span>🎬</span></div>}
          <div className={styles.playOverlay}>
            <div className={styles.playBtn}><div className={styles.playTriangle} /></div>
          </div>
          {progress > 0 && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <div className={styles.wideTitle}>{movie.title}</div>
        <div className={styles.wideMeta}>
          <span className={styles.star}>★</span>{rating}
          {progress > 0 && <span className={styles.progressLabel}>{Math.round(progress)}% watched</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.card} fade-in`} onClick={onClick}>
      <div className={styles.thumb}>
        {poster
          ? <img src={poster} alt={movie.title} className={styles.img} />
          : <div className={styles.placeholder}><span style={{ fontSize: 32 }}>🎬</span></div>}

        <div className={styles.badges}>
          {isNew && <span className="badge badge-new">NEW</span>}
          {!isNew && isTop && <span className="badge badge-top">TOP</span>}
        </div>

        <button
          className={`${styles.wlBtn} ${inWL ? styles.wlOn : ''}`}
          onClick={handleWL}
          title={inWL ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {inWL ? '★' : '+'}
        </button>

        {showProgress && progress > 0 && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className={styles.title}>{movie.title}</div>
      <div className={styles.meta}>
        <span className={styles.star}>★</span>
        <span>{rating}</span>
        <span className={styles.dot}>·</span>
        <span>{year}</span>
      </div>
    </div>
  )
}
