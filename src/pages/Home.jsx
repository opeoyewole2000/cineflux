import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import MovieCard from '../components/MovieCard'
import {
  getTrending, getTopRated, getNowPlaying,
  backdropUrl, posterUrl, getGenreNames,
  GENRE_IDS
} from '../api/tmdb'
import styles from './Home.module.css'

const GENRES = ['All', 'Action', 'Sci-Fi', 'Drama', 'Thriller', 'Comedy', 'Horror']

export default function Home() {
  const { setSelectedMovie } = useOutletContext()
  const { myProgress, myRatings } = useApp()

  const [trending, setTrending] = useState([])
  const [topRated, setTopRated] = useState([])
  const [newReleases, setNewReleases] = useState([])
  const [hero, setHero] = useState(null)
  const [genre, setGenre] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTrending(), getTopRated(), getNowPlaying()])
      .then(([trend, top, now]) => {
        const t = trend.results || []
        const r = top.results || []
        const n = now.results || []
        setTrending(t)
        setTopRated(r)
        setNewReleases(n)
        setHero(t[0] || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const inProgress = trending.filter(m => (myProgress[m.id] || 0) > 0 && (myProgress[m.id] || 0) < 100)
    .concat(topRated.filter(m => (myProgress[m.id] || 0) > 0 && (myProgress[m.id] || 0) < 100))
    .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)

  function filteredTrending() {
    if (genre === 'All') return trending.slice(0, 14)
    const gid = GENRE_IDS[genre]
    return trending.filter(m => m.genre_ids?.includes(gid)).slice(0, 14)
  }

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.heroSkeleton + ' skeleton'} />
      <div style={{ padding: '0 1.5rem', marginTop: '1.5rem' }}>
        <div className={styles.rowSkeleton + ' skeleton'} style={{ width: 160, height: 20, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 148, height: 220, borderRadius: 12, flexShrink: 0 }} />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      {hero && (
        <div className={styles.hero} style={hero.backdrop_path ? { backgroundImage: `url(${backdropUrl(hero.backdrop_path)})` } : {}}>
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className="badge badge-accent">★ Featured</div>
            <h1 className={styles.heroTitle}>{hero.title}</h1>
            <div className={styles.heroMeta}>
              <span>{hero.release_date?.slice(0, 4)}</span>
              <span className={styles.heroDot}>·</span>
              <span>{getGenreNames(hero.genre_ids)}</span>
              {hero.vote_average > 0 && <>
                <span className={styles.heroDot}>·</span>
                <span className={styles.heroRating}>★ {hero.vote_average?.toFixed(1)}</span>
              </>}
            </div>
            {hero.overview && (
              <p className={styles.heroDesc}>{hero.overview.slice(0, 160)}…</p>
            )}
            <div className={styles.heroActions}>
              <button className="btn-primary" onClick={() => setSelectedMovie(hero)}>▶ Watch now</button>
              <button className="btn-secondary" onClick={() => setSelectedMovie(hero)}>+ Watchlist</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.genreRow}>
        {GENRES.map(g => (
          <button
            key={g}
            className={`${styles.genrePill} ${g === genre ? styles.genreActive : ''}`}
            onClick={() => setGenre(g)}
          >{g}</button>
        ))}
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Trending now</h2>
          <span className="see-all">See all</span>
        </div>
        <div className="movie-row">
          {filteredTrending().map(m => (
            <MovieCard key={m.id} movie={m} onClick={() => setSelectedMovie(m)} showProgress />
          ))}
        </div>
      </section>

      {inProgress.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Continue watching</h2>
            <span className="see-all">See all</span>
          </div>
          <div className="movie-row">
            {inProgress.map(m => (
              <MovieCard key={m.id} movie={m} onClick={() => setSelectedMovie(m)} wide showProgress />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Top rated</h2>
          <span className="see-all">See all</span>
        </div>
        <div className="movie-row">
          {topRated.slice(0, 12).map(m => (
            <MovieCard key={m.id} movie={m} onClick={() => setSelectedMovie(m)} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">New releases</h2>
          <span className="see-all">See all</span>
        </div>
        <div className="movie-row">
          {newReleases.slice(0, 12).map(m => (
            <MovieCard key={m.id} movie={m} onClick={() => setSelectedMovie(m)} />
          ))}
        </div>
      </section>
    </div>
  )
}
