import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getTVDetails, getTVSeason, getTVExternalIds, backdropUrl, posterUrl } from '../api/tmdb'
import Player from './Player'
import styles from './MovieModal.module.css'
import tvStyles from './TVModal.module.css'

export default function TVModal({ show, onClose }) {
  const { myWatchlist, myRatings, toggleWatchlist, rateMovie, traktToken, rdToken } = useApp()
  const [details, setDetails] = useState(null)
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [episodes, setEpisodes] = useState([])
  const [hoverStar, setHoverStar] = useState(0)
  const [playerEpisode, setPlayerEpisode] = useState(null) // { season, episode, title }
  const [imdbId, setImdbId] = useState(null)

  const inWL = myWatchlist.includes(show.id)
  const userRating = myRatings[show.id] || 0

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    getTVDetails(show.id).then(d => {
      setDetails(d)
      const realSeasons = (d.seasons || []).filter(s => s.season_number > 0)
      setSeasons(realSeasons)
      if (realSeasons.length) setSelectedSeason(realSeasons[0].season_number)
      setImdbId(d.external_ids?.imdb_id || null)
    }).catch(() => {})
  }, [show.id])

  useEffect(() => {
    if (!selectedSeason) return
    getTVSeason(show.id, selectedSeason).then(s => {
      setEpisodes(s.episodes || [])
    }).catch(() => {})
  }, [show.id, selectedSeason])

  const m = details || show
  const backdrop = backdropUrl(m.backdrop_path)
  const poster = posterUrl(m.poster_path, 'w342')
  const year = (m.first_air_date || m.release_date || '').slice(0, 4)
  const genres = m.genres?.map(g => g.name).slice(0, 3).join(', ') || ''
  const trailer = details?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')

  if (playerEpisode) {
    const episodeMovie = {
      id: show.id,
      title: `${m.name || m.title} S${String(playerEpisode.season).padStart(2,'0')}E${String(playerEpisode.episode).padStart(2,'0')}`,
      imdbId,
      isTVEpisode: true,
      season: playerEpisode.season,
      episode: playerEpisode.episode,
    }
    return <Player movie={episodeMovie} onClose={() => setPlayerEpisode(null)} />
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 680 }}>
        <div className={styles.hero} style={backdrop ? { backgroundImage: `url(${backdrop})` } : {}}>
          <div className={styles.heroOverlay} />
          {poster && <img src={poster} alt={m.name || m.title} className={styles.poster} />}
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{m.name || m.title}</h2>
            {traktToken && <span className="badge badge-trakt">● Trakt</span>}
          </div>

          <div className={styles.meta}>
            {year && <span>{year}</span>}
            {m.number_of_seasons > 0 && <><span className={styles.dot}>·</span><span>{m.number_of_seasons} seasons</span></>}
            {genres && <><span className={styles.dot}>·</span><span>{genres}</span></>}
            {m.vote_average > 0 && <><span className={styles.dot}>·</span><span className={styles.imdb}>★ {m.vote_average?.toFixed(1)}</span></>}
          </div>

          {m.overview && <p className={styles.overview}>{m.overview.slice(0, 200)}…</p>}

          <div className={styles.ratingSection}>
            <span className={styles.ratingLabel}>Your rating:</span>
            <div className={styles.stars}>
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  className={`${styles.star} ${n <= (hoverStar || userRating) ? styles.starOn : ''}`}
                  onMouseEnter={() => setHoverStar(n)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => rateMovie(show.id, n)}
                >★</button>
              ))}
              {userRating > 0 && <span className={styles.ratingVal}>{userRating}/5</span>}
            </div>
          </div>

          <div className={styles.actions} style={{ marginBottom: '1.25rem' }}>
            <button className="btn-secondary" onClick={() => toggleWatchlist(show.id)}>
              {inWL ? '★ In watchlist' : '+ Watchlist'}
            </button>
            {trailer && (
              <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                ▶ Trailer
              </a>
            )}
          </div>

          {/* Season tabs */}
          {seasons.length > 0 && (
            <>
              <div className={tvStyles.seasonTabs}>
                {seasons.map(s => (
                  <button
                    key={s.season_number}
                    className={`${tvStyles.seasonTab} ${selectedSeason === s.season_number ? tvStyles.seasonTabActive : ''}`}
                    onClick={() => setSelectedSeason(s.season_number)}
                  >S{s.season_number}</button>
                ))}
              </div>

              <div className={tvStyles.episodeList}>
                {episodes.map(ep => (
                  <div key={ep.episode_number} className={tvStyles.episode}>
                    <div className={tvStyles.episodeThumb}>
                      {ep.still_path
                        ? <img src={posterUrl(ep.still_path, 'w300')} alt={ep.name} className={tvStyles.episodeImg} />
                        : <div className={tvStyles.episodePlaceholder}>▶</div>}
                    </div>
                    <div className={tvStyles.episodeInfo}>
                      <div className={tvStyles.episodeTitle}>
                        <span className={tvStyles.episodeNum}>E{ep.episode_number}</span>
                        {ep.name}
                      </div>
                      {ep.overview && (
                        <div className={tvStyles.episodeOverview}>{ep.overview.slice(0, 120)}…</div>
                      )}
                    </div>
                    {rdToken && (
                      <button
                        className={tvStyles.playBtn}
                        onClick={() => setPlayerEpisode({ season: selectedSeason, episode: ep.episode_number })}
                      >▶</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
