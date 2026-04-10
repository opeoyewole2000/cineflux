import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { searchMovies } from '../api/tmdb'
import MovieModal from './MovieModal'
import TVModal from './TVModal'
import styles from './Layout.module.css'

export default function Layout() {
  const { activeProfile } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [selectedShow, setSelectedShow] = useState(null)

  const initials = activeProfile?.name
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  async function handleSearch(e) {
    const q = e.target.value
    setQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await searchMovies(q)
      setSearchResults(res.results?.slice(0, 6) || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  function clearSearch() {
    setQuery('')
    setSearchResults([])
  }

  return (
    <div className={styles.wrap}>
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => navigate('/')}>
          CINE<span>FLUX</span>
        </div>

        <div className={styles.links}>
          <NavLink to="/" end className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>Home</NavLink>
          <NavLink to="/browse" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>Browse</NavLink>
          <NavLink to="/watchlist" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>Watchlist</NavLink>
        </div>

        <div className={styles.right}>
          <div className={styles.searchWrap}>
            <input
              className={styles.search}
              type="text"
              placeholder="Search movies..."
              value={query}
              onChange={handleSearch}
            />
            {searchResults.length > 0 && (
              <div className={styles.searchDropdown}>
                {searchResults.map(m => (
                  <div key={m.id} className={styles.searchItem} onClick={() => { setSelectedMovie(m); clearSearch() }}>
                    <div className={styles.searchThumb} style={{ background: '#18182a' }}>
                      {m.poster_path
                        ? <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 18 }}>🎬</span>}
                    </div>
                    <div>
                      <div className={styles.searchTitle}>{m.title}</div>
                      <div className={styles.searchYear}>{m.release_date?.slice(0, 4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.profileBtn} onClick={() => navigate('/account')}>
            <div className={styles.avatar} style={{ background: activeProfile?.color + '33', color: activeProfile?.color }}>
              {initials}
            </div>
            <span className={styles.profileName}>{activeProfile?.name}</span>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <Outlet context={{ setSelectedMovie, setSelectedShow }} />
      </main>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
      {selectedShow && (
        <TVModal show={selectedShow} onClose={() => setSelectedShow(null)} />
      )}
    </div>
  )
}
