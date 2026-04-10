const BASE = 'https://torrentio.strem.fun'

export async function getStreams(imdbId) {
  const res = await fetch(`${BASE}/stream/movie/${imdbId}.json`)
  if (!res.ok) throw new Error(`Torrentio error: ${res.status}`)
  const data = await res.json()
  return data.streams || []
}

export async function getTVStreams(imdbId, season, episode) {
  const res = await fetch(`${BASE}/stream/series/${imdbId}:${season}:${episode}.json`)
  if (!res.ok) throw new Error(`Torrentio error: ${res.status}`)
  const data = await res.json()
  return data.streams || []
}

function qualityScore(stream) {
  const text = ((stream.name || '') + ' ' + (stream.title || '')).toLowerCase()

  // Heavily penalise x265/HEVC — not supported in most browsers
  const isHEVC = text.includes('x265') || text.includes('hevc') || text.includes('h265')

  let score = 0
  if (text.includes('1080p')) score = 50       // 1080p x264 is the sweet spot
  else if (text.includes('2160p') || text.includes('4k')) score = 30  // 4K is often x265
  else if (text.includes('720p')) score = 20
  else score = 10

  if (isHEVC) score -= 40  // push HEVC to the bottom
  if (text.includes('x264') || text.includes('h264') || text.includes('avc')) score += 20
  if (text.includes('bluray') || text.includes('blu-ray')) score += 5
  if (text.includes('webrip') || text.includes('web-dl')) score += 3

  return score
}

function seeders(stream) {
  // Torrentio title format: "Movie.Name\n👤 150 💾 4.2 GB"
  const match = stream.title?.match(/👤\s*(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

export function pickBestStream(streams) {
  const withHash = streams.filter(s => s.infoHash)
  if (!withHash.length) return null
  return withHash.sort((a, b) => {
    const qDiff = qualityScore(b) - qualityScore(a)
    if (qDiff !== 0) return qDiff
    return seeders(b) - seeders(a)
  })[0]
}

export function buildMagnet(infoHash, title = '') {
  const trackers = [
    'udp://open.demonii.com:1337/announce',
    'udp://tracker.openbittorrent.com:80',
    'udp://tracker.coppersurfer.tk:6969',
    'udp://glotorrents.pw:6969/announce',
    'udp://tracker.leechers-paradise.org:6969',
  ]
  const parts = [`xt=urn:btih:${infoHash}`]
  if (title) parts.push(`dn=${encodeURIComponent(title)}`)
  trackers.forEach(t => parts.push(`tr=${encodeURIComponent(t)}`))
  return `magnet:?${parts.join('&')}`
}

export function streamLabel(stream) {
  if (!stream) return 'Unknown'
  const name = stream.name || ''
  // Torrentio name format: "Torrentio\n1080p" or "Torrentio\n4K"
  const quality = name.split('\n')[1] || ''
  const size = stream.title?.match(/💾\s*([\d.]+ \w+)/)?.[1] || ''
  return [quality, size].filter(Boolean).join(' · ')
}
