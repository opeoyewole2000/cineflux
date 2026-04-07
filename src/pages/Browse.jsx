import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import { getTrending, getTopRated, getNowPlaying, discoverByGenre, GENRE_IDS } from '../api/tmdb'
import styles from './Browse.module.css'

const GENRES = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Romance', 'Animation']
const SORTS = ['Popular', 'Top Rated', 'New']

export default function Browse() {
  const { setSelectedMovie } = useOutletContext()
  const [movies, setMovies] = useState([])
  const [genre, setGenre] = useState('All')
  const [sort, setSort] = useState('Popular')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const fetcher = genre === 'All'
      ? (sort === 'Top Rated' ? getTopRated : sort === 'New' ? getNowPlaying : getTrending)
      : () => discoverByGenre(GENRE_IDS[genre])

    fetcher()
      .then(res => setMovies(res.results || []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false))
  }, [genre, sort])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Browse</h1>
        <div className={styles.sortRow}>
          {SORTS.map(s => (
            <button
              key={s}
              className={`${styles.sortBtn} ${s === sort ? styles.sortActive : ''}`}
              onClick={() => setSort(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className={styles.genreRow}>
        {GENRES.map(g => (
          <button
            key={g}
            className={`${styles.genrePill} ${g === genre ? styles.genreActive : ''}`}
            onClick={() => setGenre(g)}
          >{g}</button>
        ))}
      </div>

      {loading ? (
        <div className={styles.grid}>
          {[...Array(12)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 148, height: 220, borderRadius: 12 }} />
          ))}
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
