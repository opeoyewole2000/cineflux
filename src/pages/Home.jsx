import { useState, useEffect, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import MovieCard from '../components/MovieCard'
import {
  getTrending, getTopRated, getNowPlaying, getTrendingTV,
  backdropUrl, posterUrl, getGenreNames,
  GENRE_IDS
} from '../api/tmdb'
import styles from './Home.module.css'

const GENRES = ['All', 'Action', 'Sci-Fi', 'Drama', 'Thriller', 'Comedy', 'Horror']

export default function Home() {
  const { setSelectedMovie, setSelectedShow } = useOutletContext()
  const { myProgress, myRatings } = useApp()

  const [trending, setTrending] = useState([])
  const [topRated, setTopRated] = useState([])
  const [newReleases, setNewReleases] = useState([])
  const [trendingTV, setTrendingTV] = useState([])
  const [heroSlides, setHeroSlides] = useState([])
  const [heroIndex, setHeroIndex] = useState(0)
  const [genre, setGenre] = useState('All')
  const [loading, setLoading] = useState(true)
  const autoplayRef = useRef(null)

  const hero = heroSlides[heroIndex] || null

  const goTo = useCallback((i) => {
    setHeroIndex(i)
    clearInterval(autoplayRef.current)
    autoplayRef.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroSlides.length)
    }, 7000)
  }, [heroSlides.length])

  useEffect(() => {
    if (!heroSlides.length) return
    autoplayRef.current = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroSlides.length)
    }, 7000)
    return () => clearInterval(autoplayRef.current)
  }, [heroSlides.length])

  useEffect(() => {
    Promise.all([getTrending(), getTopRated(), getNowPlaying(), getTrendingTV()])
      .then(([trend, top, now, tv]) => {
        const t = trend.results || []
        const r = top.results || []
        const n = now.results || []
        const s = tv.results || []
        setTrending(t)
        setTopRated(r)
        setNewReleases(n)
        setTrendingTV(s)
        setHeroSlides(t.filter(m => m.backdrop_path).slice(0, 6))
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
      {heroSlides.length > 0 && (
        <div className={styles.heroWrap}>
          {heroSlides.map((slide, i) => (
            <div
              key={slide.id}
              className={`${styles.hero} ${i === heroIndex ? styles.heroActive : ''}`}
              style={{ backgroundImage: `url(${backdropUrl(slide.backdrop_path)})` }}
            >
              <div className={styles.heroOverlay} />
              <div className={styles.heroContent}>
                <div className="badge badge-accent">★ Trending</div>
                <h1 className={styles.heroTitle}>{slide.title}</h1>
                <div className={styles.heroMeta}>
                  <span>{slide.release_date?.slice(0, 4)}</span>
                  <span className={styles.heroDot}>·</span>
                  <span>{getGenreNames(slide.genre_ids)}</span>
                  {slide.vote_average > 0 && <>
                    <span className={styles.heroDot}>·</span>
                    <span className={styles.heroRating}>★ {slide.vote_average?.toFixed(1)}</span>
                  </>}
                </div>
                {slide.overview && (
                  <p className={styles.heroDesc}>{slide.overview.slice(0, 160)}…</p>
                )}
                <div className={styles.heroActions}>
                  <button className="btn-primary" onClick={() => setSelectedMovie(slide)}>▶ Watch now</button>
                  <button className="btn-secondary" onClick={() => setSelectedMovie(slide)}>+ Watchlist</button>
                </div>
              </div>
            </div>
          ))}

          {/* Prev / Next arrows */}
          <button className={`${styles.heroArrow} ${styles.heroArrowLeft}`} onClick={() => goTo((heroIndex - 1 + heroSlides.length) % heroSlides.length)}>‹</button>
          <button className={`${styles.heroArrow} ${styles.heroArrowRight}`} onClick={() => goTo((heroIndex + 1) % heroSlides.length)}>›</button>

          {/* Dot indicators */}
          <div className={styles.heroDots}>
            {heroSlides.map((_, i) => (
              <button key={i} className={`${styles.heroDot2} ${i === heroIndex ? styles.heroDotActive : ''}`} onClick={() => goTo(i)} />
            ))}
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

      {trendingTV.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Trending TV shows</h2>
            <span className="see-all">See all</span>
          </div>
          <div className="movie-row">
            {trendingTV.slice(0, 14).map(s => (
              <MovieCard
                key={s.id}
                movie={{ ...s, title: s.name || s.title }}
                onClick={() => setSelectedShow(s)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
