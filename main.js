const STATS_URL = 'https://api.dexploit.dev/api/v1/stats'
const PROTOCOLS_URL = 'https://api.dexploit.dev/api/v1/protocols'
const POLL_MS = 20_000
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const pad = (n) => String(n).padStart(2, '0')
const utc = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`

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

/* ---------- projects ---------- */
const PROJECTS = [
  { code: 'DX-01', name: 'Dexploit', year: '2026', url: 'https://dexploit.dev',
    role: 'Built and operate',
    stack: 'Rust, ClickHouse, NATS, gRPC',
    body: 'Pre-parsed OHLCV candles, swap events and price streams across every major Solana DEX, over REST, WebSocket, gRPC and GraphQL. Rust services parse swaps out of on-chain program data and aggregate candles into ClickHouse; NATS moves events between the protocol workers and the gateway.' },
  { code: 'DX-02', name: 'Dexploit-MCP', year: 'npm', url: 'https://github.com/DexploitV1/Dexploit-MCP',
    role: 'Author',
    stack: 'TypeScript, Model Context Protocol',
    body: 'An MCP server that gives Claude Code, Claude Desktop and Cursor live access to the Dexploit API, so a model queries real Solana data instead of inventing it. Published to npm and installable with a single npx command.' },
  { code: 'PB-03', name: 'PoGoBot', year: '2026', url: 'https://github.com/1tzkaos/PoGoBot',
    role: 'Author',
    stack: 'Python, YOLOv8, OpenCV',
    body: 'Screen-reading game automation split into three separately testable layers: perception, decision, actuation. The state machine refuses to start at import if any state is missing a handler or a timeout, and the learning module will not write training data it cannot justify.' },
  { code: 'SB-04', name: 'solbot', year: 'private', url: null,
    role: 'Author',
    stack: 'TypeScript, Dexploit API',
    body: 'A paper-trading simulator that runs several strategy configurations in parallel lanes off one shared market feed, each with its own portfolio, so parameter sets are compared against identical ticks. Built as a demanding consumer of the Dexploit API.' },
]

function renderDetail(p) {
  const el = document.getElementById('proj-detail')
  el.innerHTML = `
    <div class="pd-code">${p.code} &nbsp;/&nbsp; ${p.year}</div>
    <h3 class="pd-title">${p.name}</h3>
    <p class="pd-body">${p.body}</p>
    <dl class="pd-meta">
      <dt>Role</dt><dd>${p.role}</dd>
      <dt>Stack</dt><dd>${p.stack}</dd>
    </dl>
    ${p.url
      ? `<a class="pd-link" href="${p.url}">Open &nearr;</a>`
      : `<span class="pd-link is-off">Private repository</span>`}
  `
  if (!reduceMotion) {
    el.classList.remove('pd-anim'); void el.offsetWidth; el.classList.add('pd-anim')
  }
}

function buildExplorer() {
  const list = document.getElementById('proj-list')
  document.getElementById('work-count').textContent = `(${PROJECTS.length})`
  PROJECTS.forEach((p, i) => {
    const li = document.createElement('li')
    const b = document.createElement('button')
    b.className = 'proj'
    b.type = 'button'
    b.setAttribute('aria-selected', i === 0 ? 'true' : 'false')
    b.innerHTML = `<span>${p.name}</span><sup>${p.year}</sup>`
    const select = () => {
      if (b.getAttribute('aria-selected') === 'true') return
      list.querySelectorAll('.proj').forEach((o) => o.setAttribute('aria-selected', 'false'))
      b.setAttribute('aria-selected', 'true')
      renderDetail(p)
    }
    // Hover drives it, focus and click do the same so it works without a mouse.
    b.addEventListener('mouseenter', select)
    b.addEventListener('focus', select)
    b.addEventListener('click', () => { if (p.url) window.location.href = p.url })
    li.appendChild(b)
    list.appendChild(li)
  })
  renderDetail(PROJECTS[0])
}

/* ---------- ticker ---------- */
async function buildTicker() {
  const track = document.getElementById('ticker')
  let names = []
  try {
    const res = await fetch(PROTOCOLS_URL)
    const body = await res.json()
    names = (body?.data?.protocols ?? body?.protocols ?? []).filter(Boolean)
  } catch { /* leave the strip empty rather than invent protocol names */ }
  if (!names.length) { track.closest('.ticker').style.display = 'none'; return }
  const once = names.map((n) => `<span>${n.replace(/_/g, ' ')}</span>`).join('')
  track.innerHTML = once + once      // duplicated so the -50% loop is seamless
}

/* ---------- clock ---------- */
function startClock() {
  const el = document.getElementById('clock')
  const tick = () => { const d = new Date(); el.textContent = utc(d); el.setAttribute('datetime', d.toISOString()) }
  tick(); setInterval(tick, 1000)
}

/* ---------- stage fades out past the hero ---------- */
function startStageFade() {
  const stage = document.getElementById('stage')
  const hero = document.querySelector('.hero')
  if (!stage || !hero) return
  let queued = false
  const apply = () => {
    queued = false
    const end = hero.offsetHeight * 0.85
    const o = Math.max(0, 1 - window.scrollY / end)
    stage.style.setProperty('--stage-o', o.toFixed(3))
    stage.style.visibility = o < 0.01 ? 'hidden' : 'visible'
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(apply) } }, { passive: true })
  addEventListener('resize', apply)
  apply()
}

/* ---------- live readout ---------- */
function setValue(node, text) {
  if (node.textContent === text) return
  node.textContent = text
  if (reduceMotion) return
  node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash')
}

function countUp(node, target) {
  if (reduceMotion || !Number.isFinite(target)) { setValue(node, compact(target)); return }
  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / 900)
    node.textContent = compact(Math.round(target * (1 - Math.pow(1 - t, 3))))
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

    for (const [key, value] of Object.entries({
      candles: d.total_candles, pairs: d.pairs, mints: d.mints, protocols: d.protocols,
    })) {
      const node = document.querySelector(`[data-k="${key}"]`)
      if (!node || !Number.isFinite(value)) continue
      first ? countUp(node, value) : setValue(node, compact(value))
    }
    document.getElementById('synced').textContent = `${utc(new Date())} UTC`
    status.textContent = ''
    first = false
  } catch (err) {
    status.textContent = ` Feed unreachable (${err.message}); figures may be stale.`
  }
}

document.getElementById('year').textContent = String(new Date().getUTCFullYear())
startClock()
startStageFade()
buildExplorer()
buildTicker()
poll()
setInterval(poll, POLL_MS)
