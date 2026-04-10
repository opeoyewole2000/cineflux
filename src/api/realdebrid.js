const RD_BASE = 'https://api.real-debrid.com/rest/1.0'
const OAUTH_BASE = 'https://api.real-debrid.com/oauth/v2'
// In dev, proxy OAuth through Vite to avoid CORS. In prod, use direct URL.
const OAUTH_PROXY = import.meta.env.DEV ? '/rd-oauth' : OAUTH_BASE
// Public open-source client ID — standard for community apps
const OS_CLIENT_ID = 'X245A4XAIBGVM'

async function rdFetch(path, token, options = {}) {
  const res = await fetch(`${RD_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(!options.json ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`RD ${res.status}: ${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : {}
}

// ── OAuth device flow ────────────────────────────────────────────────────────

export async function getDeviceCode() {
  const res = await fetch(
    `${OAUTH_PROXY}/device/code?client_id=${OS_CLIENT_ID}&new_credentials=yes`
  )
  if (!res.ok) throw new Error('Failed to start RD auth')
  return res.json()
  // { device_code, user_code, verification_url, expires_in, interval }
}

export async function pollDeviceCredentials(deviceCode) {
  const params = new URLSearchParams({
    client_id: OS_CLIENT_ID,
    code: deviceCode,
  })
  const res = await fetch(`${OAUTH_PROXY}/device/credentials?${params}`)
  if (!res.ok) {
    if (res.status === 403) return null // authorization pending — user hasn't approved yet
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error_description || body?.error || 'RD credential poll failed')
  }
  return res.json()
  // { client_id (personalized), client_secret }
}

export async function exchangeDeviceToken(clientId, clientSecret, deviceCode) {
  const res = await fetch(`${OAUTH_PROXY}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: deviceCode,
      grant_type: 'http://oauth.net/grant_type/device/1.0',
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error_description || body?.error || 'RD token exchange failed')
  }
  return res.json()
  // { access_token, refresh_token, expires_in }
}

// ── User ─────────────────────────────────────────────────────────────────────

export async function getRDUser(token) {
  return rdFetch('/user', token)
}

// ── Instant availability ──────────────────────────────────────────────────────

export async function checkInstantAvailability(token, infoHashes) {
  // RD limits URL length — batch into chunks of 20 hashes
  const BATCH = 20
  const cached = new Set()
  for (let i = 0; i < infoHashes.length; i += BATCH) {
    const chunk = infoHashes.slice(i, i + BATCH)
    const data = await rdFetch(`/torrents/instantAvailability/${chunk.join('/')}`, token)
    for (const [hash, val] of Object.entries(data)) {
      if (val?.rd?.length > 0) cached.add(hash.toLowerCase())
    }
  }
  return cached
}

// ── Torrents ─────────────────────────────────────────────────────────────────

export async function addMagnet(token, magnet) {
  const body = new URLSearchParams({ magnet })
  return rdFetch('/torrents/addMagnet', token, { method: 'POST', body })
  // { id, uri }
}

export async function selectFiles(token, torrentId) {
  const body = new URLSearchParams({ files: 'all' })
  return rdFetch(`/torrents/selectFiles/${torrentId}`, token, { method: 'POST', body })
}

export async function getTorrentInfo(token, torrentId) {
  return rdFetch(`/torrents/info/${torrentId}`, token)
  // { id, filename, status, links[], progress, ... }
}

export async function deleteTorrent(token, torrentId) {
  return rdFetch(`/torrents/delete/${torrentId}`, token, { method: 'DELETE' })
}

// ── Unrestrict ────────────────────────────────────────────────────────────────

export async function unrestrictLink(token, link) {
  const body = new URLSearchParams({ link })
  return rdFetch('/unrestrict/link', token, { method: 'POST', body })
  // { id, download, filename, mimeType, filesize, ... }
}

export async function getTranscodeUrl(token, unrestrictId) {
  // Returns HLS streams transcoded by RD — browser-compatible audio (AAC)
  const data = await rdFetch(`/streaming/transcode/${unrestrictId}`, token)
  // { apple: { full: hls_url, ... }, dash: {...}, liveMP4: {...}, h264WebM: {...} }
  return data
}

// ── High-level: magnet → stream result ───────────────────────────────────────

const TERMINAL_ERRORS = ['error', 'dead', 'magnet_error', 'virus', 'compressing', 'uploading']

export async function resolveStream(token, magnet, onStatus) {
  onStatus?.('Adding to Real-Debrid...')
  const { id } = await addMagnet(token, magnet)

  onStatus?.('Selecting files...')
  await selectFiles(token, id)

  onStatus?.('Waiting for Real-Debrid...')
  let info
  for (let i = 0; i < 60; i++) {
    info = await getTorrentInfo(token, id)

    if (info.status === 'downloaded') break

    if (TERMINAL_ERRORS.includes(info.status)) {
      await deleteTorrent(token, id).catch(() => {})
      throw new Error(`Torrent failed on RD: ${info.status}`)
    }

    onStatus?.(`Real-Debrid: ${info.status} (${info.progress ?? 0}%)`)
    await new Promise(r => setTimeout(r, 3000))
  }

  if (!info?.links?.length) throw new Error('No downloadable links returned by RD')

  onStatus?.('Unrestricting link...')
  const unrestricted = await unrestrictLink(token, info.links[0])

  return {
    hlsUrl: null,
    directUrl: unrestricted.download,
    filename: unrestricted.filename,
    filesize: unrestricted.filesize,
  }
}
