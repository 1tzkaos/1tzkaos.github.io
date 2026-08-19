const STATS_URL = 'https://api.dexploit.dev/api/v1/stats'
const POLL_MS = 20_000
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const pad = (n) => String(n).padStart(2, '0')

function compact(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  if (n < 1000) return String(n)
  for (const [size, suffix] of [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) {
    if (n >= size) {
      const v = n / size
      return `${(v >= 100 ? v.toFixed(0) : v.toFixed(1)).replace(/\.0$/, '')}${suffix}`
    }
  }
}

/* Live UTC clock. Market data is quoted in UTC, so the site is too. */
function startClock() {
  const el = document.getElementById('clock')
  const tick = () => {
    const d = new Date()
    el.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
    el.setAttribute('datetime', d.toISOString())
  }
  tick()
  setInterval(tick, 1000)
}

/* Count up to the first real value, then swap in place on later polls. */
function setValue(node, text) {
  if (node.textContent === text) return
  node.textContent = text
  if (reduceMotion) return
  node.classList.remove('flash')
  void node.offsetWidth
  node.classList.add('flash')
}

function countUp(node, target) {
  if (reduceMotion || !Number.isFinite(target)) { setValue(node, compact(target)); return }
  const DURATION = 900
  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / DURATION)
    const eased = 1 - Math.pow(1 - t, 3)
    node.textContent = compact(Math.round(target * eased))
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

let first = true

async function poll() {
  const status = document.getElementById('readout-status')
  try {
    const res = await fetch(STATS_URL, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    const d = body?.data ?? body
    if (!d || typeof d !== 'object') throw new Error('unexpected shape')

    const cells = {
      candles: d.total_candles,
      pairs: d.pairs,
      protocols: d.protocols,
    }
    for (const [key, value] of Object.entries(cells)) {
      const node = document.querySelector(`[data-k="${key}"]`)
      if (!node || !Number.isFinite(value)) continue
      if (first) countUp(node, value)
      else setValue(node, compact(value))
    }

    const latest = document.querySelector('[data-k="latest"]')
    if (latest && d.newest_candle) {
      const t = new Date(d.newest_candle)
      if (!Number.isNaN(t.getTime())) {
        setValue(latest, `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())} UTC`)
      }
    }
    const synced = document.getElementById('synced')
    if (synced) {
      const n = new Date()
      synced.textContent = `${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}:${pad(n.getUTCSeconds())} UTC`
    }
    status.textContent = ''
    first = false
  } catch (err) {
    // Leave the last good numbers on screen; say plainly that they are not current.
    status.textContent = `Feed unreachable (${err.message}); values may be stale.`
  }
}

/* Reveal sections as they enter the viewport. */
function startReveals() {
  const targets = document.querySelectorAll('.reveal')
  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'))
    return
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('in')
      io.unobserve(e.target)
    }
  }, { rootMargin: '0px 0px -12% 0px' })
  targets.forEach((el) => io.observe(el))

  // Safety net. A screenshot runner never scrolls, so the observer may never
  // fire; without this the page would capture with its sections still hidden.
  setTimeout(() => targets.forEach((el) => el.classList.add('in')), 2500)
}

document.getElementById('year').textContent = String(new Date().getUTCFullYear())
startClock()
startReveals()
poll()
setInterval(poll, POLL_MS)
