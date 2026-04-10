import { useEffect, useRef, useState } from 'react'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { useApp } from '../context/AppContext'
import { getExternalIds, getTVExternalIds } from '../api/tmdb'
import { getStreams, getTVStreams, pickBestStream, buildMagnet, streamLabel } from '../api/torrentio'
import { resolveStream, checkInstantAvailability } from '../api/realdebrid'
import styles from './Player.module.css'

const QUALITIES = ['2160p', '1080p', '720p', '480p']

function qualityOf(stream) {
  const text = ((stream.name || '') + ' ' + (stream.title || '')).toLowerCase()
  for (const q of QUALITIES) if (text.includes(q.toLowerCase())) return q
  return 'SD'
}

export default function Player({ movie, onClose }) {
  const { rdToken, updateProgress } = useApp()
  const videoRef = useRef(null)
  const plyrRef = useRef(null)
  const [status, setStatus] = useState('Looking up movie...')
  const [streamResult, setStreamResult] = useState(null)
  const [error, setError] = useState(null)
  const [selectedStream, setSelectedStream] = useState(null)
  const [allStreams, setAllStreams] = useState([])
  const [cachedHashes, setCachedHashes] = useState(new Set())
  const [showSources, setShowSources] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    loadStream()
    return () => {
      plyrRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (!streamResult || !videoRef.current) return

    plyrRef.current?.destroy()

    // Set src directly on the element before Plyr wraps it — avoids CORS issues
    videoRef.current.src = streamResult.directUrl

    const player = new Plyr(videoRef.current, {
      controls: [
        'play-large', 'play', 'rewind', 'fast-forward', 'progress',
        'current-time', 'duration', 'mute', 'volume',
        'settings', 'pip', 'fullscreen',
      ],
      settings: ['speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: true },
      tooltips: { controls: true, seek: true },
      clickToPlay: true,
      disableContextMenu: false,
      crossorigin: false,
    })

    plyrRef.current = player

    player.on('ready', () => {
      player.play().catch(() => {})
    })

    player.on('timeupdate', () => {
      if (!player.duration) return
      updateProgress(movie.id, Math.round((player.currentTime / player.duration) * 100))
    })

    return () => player.destroy()
  }, [streamResult])

  async function loadStream(stream = null) {
    setError(null)
    setStreamResult(null)
    plyrRef.current?.destroy()

    try {
      setStatus('Looking up ID...')
      let imdbId = movie.imdbId
      if (!imdbId) {
        const ext = movie.isTVEpisode
          ? await getTVExternalIds(movie.id)
          : await getExternalIds(movie.id)
        imdbId = ext?.imdb_id
      }
      if (!imdbId) throw new Error('No IMDB ID found')

      setStatus('Finding sources...')
      console.log('[Player] Fetching streams', { imdbId, isTVEpisode: movie.isTVEpisode, season: movie.season, episode: movie.episode })
      const streams = movie.isTVEpisode
        ? await getTVStreams(imdbId, movie.season, movie.episode)
        : await getStreams(imdbId)
      if (!streams.length) throw new Error('No sources found on Torrentio')
      setAllStreams(streams)

      let best = stream
      if (!best) {
        const withHash = streams.filter(s => s.infoHash)

        // Try cache check — skip silently if RD denies it
        try {
          setStatus('Checking Real-Debrid cache...')
          const hashes = withHash.map(s => s.infoHash.toLowerCase())
          const cached = await checkInstantAvailability(rdToken, hashes)
          setCachedHashes(cached)
          const cachedStreams = withHash.filter(s => cached.has(s.infoHash.toLowerCase()))
          if (cachedStreams.length > 0) {
            best = pickBestStream(cachedStreams)
          }
        } catch {
          // Cache check unavailable — fall through to best source
        }

        if (!best) best = pickBestStream(withHash)
      }
      if (!best) throw new Error('No compatible sources found')
      setSelectedStream(best)

      const magnet = buildMagnet(best.infoHash, movie.title)
      const result = await resolveStream(rdToken, magnet, setStatus)
      setStreamResult(result)
    } catch (err) {
      console.error('[Player]', err)
      setError(err.message)
    }
  }

  function pickSource(stream) {
    setShowSources(false)
    loadStream(stream)
  }

  const streamsByQuality = allStreams.filter(s => s.infoHash).reduce((acc, s) => {
    const q = qualityOf(s)
    if (!acc[q]) acc[q] = []
    acc[q].push(s)
    return acc
  }, {})

  const isReady = !!streamResult
  const onlyHEVC = allStreams.filter(s => s.infoHash).length > 0 && allStreams.filter(s => s.infoHash).every(s =>
    /x265|hevc|h265/i.test((s.name || '') + (s.title || ''))
  )

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.playerWrap}>
        <div className={styles.playerHeader}>
          <span className={styles.playerTitle}>{movie.title}</span>
          <div className={styles.headerActions}>
            {isReady && Object.keys(streamsByQuality).length > 1 && (
              <div className={styles.qualityPicker}>
                {QUALITIES.filter(q => streamsByQuality[q]).map(q => (
                  <button
                    key={q}
                    className={`${styles.qualityBtn} ${qualityOf(selectedStream) === q ? styles.qualityActive : ''}`}
                    onClick={() => pickSource(streamsByQuality[q][0])}
                  >{q}</button>
                ))}
              </div>
            )}
            {allStreams.length > 0 && (
              <button className={styles.sourcesBtn} onClick={() => setShowSources(s => !s)}>
                ⚙ Sources
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.screen}>
          <video ref={videoRef} className={styles.video} />
          {!isReady && (
            <div className={styles.loading}>
              {error ? (
                <>
                  <div className={styles.errorIcon}>⚠</div>
                  <div className={styles.errorMsg}>{error}</div>
                  <button className="btn-secondary" onClick={() => loadStream()}>Try again</button>
                </>
              ) : (
                <>
                  <div className={styles.spinner} />
                  <div className={styles.statusMsg}>{status}</div>
                  {selectedStream && (
                    <div className={styles.streamInfo}>{streamLabel(selectedStream)}</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {isReady && onlyHEVC && (
          <div style={{
            background: 'rgba(240,149,149,0.1)', borderTop: '1px solid rgba(240,149,149,0.2)',
            padding: '8px 1rem', fontSize: 12, color: '#f09595',
          }}>
            ⚠ Only x265/HEVC sources available — audio may not work in browsers. Pick a source manually via ⚙ Sources.
          </div>
        )}

        {showSources && allStreams.length > 0 && (
          <div className={styles.sourceList}>
            <div className={styles.sourceListTitle}>Available sources</div>
            {allStreams.filter(s => s.infoHash).slice(0, 12).map((s, i) => (
              <button
                key={i}
                className={`${styles.sourceItem} ${selectedStream?.infoHash === s.infoHash ? styles.sourceActive : ''}`}
                onClick={() => pickSource(s)}
              >
                <span className={styles.sourceName}>
                  <span className={styles.sourceQuality}>{qualityOf(s)}</span>
                  {cachedHashes.has(s.infoHash?.toLowerCase()) && (
                    <span style={{ color: '#4caf50', fontSize: 10, marginRight: 5 }}>⚡</span>
                  )}
                  {s.name?.split('\n')[1] || s.name?.split('\n')[0]}
                  {/x265|hevc|h265/i.test((s.name || '') + (s.title || '')) && (
                    <span style={{ color: '#f09595', fontSize: 10, marginLeft: 6 }}>x265 ⚠</span>
                  )}
                </span>
                <span className={styles.sourceSeeds}>
                  {s.title?.match(/👤\s*(\d+)/)?.[1] ? `👤 ${s.title.match(/👤\s*(\d+)/)[1]}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
