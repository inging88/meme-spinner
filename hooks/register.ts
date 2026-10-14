import type { EngineInterface, Register, Timer } from 'claude-code'

// 밈 목록의 정본은 GitHub 저장소의 memes.json 이다. 거기를 고치면 설치한 사람도 재설치 없이 받는다
const REMOTE = 'https://raw.githubusercontent.com/inging88/meme-spinner/main/memes.json'
const REFRESH_MS = 6 * 60 * 60 * 1000 // 6시간마다 새 목록을 받는다
const ROTATE_MS = 4000 // 작업 중 4초마다 다른 밈
const STORE_KEY = 'memes'
const MAX_MEMES = 500
const MAX_TEXT = 40

type Meme = { text: string; emoji: string }
type Cached = { at: number; memes: Meme[] }
type Dollar = EngineInterface

// 받아 오지도 읽지도 못했을 때 쓰는 최소 목록
const FALLBACK: Meme[] = [
  { text: '킹받는 중', emoji: '😤' },
  { text: '가보자고', emoji: '🚀' },
  { text: '오히려 좋아', emoji: '😎' },
  { text: '뇌 풀가동 중', emoji: '🧠' },
]

let memes: Meme[] = FALLBACK
let loading: Promise<void> | undefined
let current: Meme = FALLBACK[0]!
// 셔플 가방: 목록을 섞어 하나씩 꺼내고, 다 꺼낸 뒤에야 다시 섞는다. 한 바퀴 안에서는 같은 밈이 두 번 안 나온다.
// 남은 순서를 $.store 에 두어 재시작 · 다시 불러오기 뒤에도 이어 간다
let bag: string[] = []
let bagLoaded = false
const BAG_KEY = 'bag'
let timer: Timer | undefined

// 남이 올린 목록이라도 화면을 깨지 않게: 문자열만, 길이 제한, 개수 제한
function sanitize(raw: unknown): Meme[] {
  const list = (raw as { memes?: unknown } | null)?.memes
  if (!Array.isArray(list)) return []

  return list
    .filter(
      (m): m is Meme =>
        typeof m?.text === 'string' && typeof m?.emoji === 'string' && m.text.trim() !== '' && m.text.length <= MAX_TEXT,
    )
    .map(m => ({ text: m.text.replace(/[\u0000-\u001f\u007f]/g, ''), emoji: Array.from(m.emoji).slice(0, 2).join('') }))
    .slice(0, MAX_MEMES)
}

async function bundled($: Dollar): Promise<Meme[]> {
  try {
    return sanitize(JSON.parse(await $.fs.read(`${$.plugin.root}/memes.json`)))
  } catch {
    return []
  }
}

async function refresh($: Dollar, force = false): Promise<number> {
  const now = await $.clock.now()
  const cached = (await $.store.get(STORE_KEY).catch(() => undefined)) as Cached | undefined

  if (cached && Array.isArray(cached.memes) && cached.memes.length > 0) {
    memes = cached.memes
    if (!force && now - cached.at < REFRESH_MS) return 0
  } else {
    const own = await bundled($)
    if (own.length > 0) memes = own
  }

  try {
    const r = await $.http.fetch(REMOTE)
    const fresh = r.ok ? sanitize(JSON.parse(r.text)) : []
    if (fresh.length > 0) {
      if (fresh.map(m => m.text).join('|') !== memes.map(m => m.text).join('|')) bag = []
      memes = fresh
      await $.store.set(STORE_KEY, { at: now, memes: fresh } satisfies Cached)
    }
    return fresh.length
  } catch {
    // 오프라인이면 갖고 있는 목록으로 계속 간다
    return 0
  }
}

function ensureLoaded($: Dollar) {
  loading ??= refresh($).then(() => undefined, () => undefined)
  return loading
}

function shuffle(texts: string[]): string[] {
  const a = [...texts]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  // 새 바퀴의 첫 밈이 직전 밈과 같지 않게
  if (a.length > 1 && a[0] === current.text) [a[0], a[1]] = [a[1]!, a[0]!]
  return a
}

async function nextMeme($: Dollar) {
  if (!bagLoaded) {
    bagLoaded = true
    const saved = await $.store.get(BAG_KEY).catch(() => undefined)
    if (Array.isArray(saved)) bag = saved.filter((t): t is string => typeof t === 'string')
  }

  const byText = new Map(memes.map(m => [m.text, m]))
  // 목록이 바뀌어 없어진 밈은 가방에서 버린다
  bag = bag.filter(t => byText.has(t))
  if (bag.length === 0) bag = shuffle(memes.map(m => m.text))

  current = byText.get(bag.shift()!) ?? FALLBACK[0]!
  void $.store.set(BAG_KEY, bag).catch(() => undefined)
}

function stop() {
  timer?.cancel()
  timer = undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'meme-refresh', description: '밈 목록을 GitHub 에서 지금 바로 새로 받는다' })
    return next(e)
  })

  // 6시간을 기다리지 않고 지금 받는다
  on('command.run', { command: 'meme-refresh' }, async $ => {
    const n = await refresh($, true)
    loading = Promise.resolve()
    return { text: n > 0 ? `밈 ${n}개를 새로 받았습니다.` : `새로 받지 못했습니다(오프라인?). 지금 목록 ${memes.length}개로 계속합니다.` }
  })

  on('turn.start', async ($, e, next) => {
    const result = await next(e)

    if (e.agentId === undefined) {
      await ensureLoaded($)
      await nextMeme($)
      stop()
      timer = $.clock.every(ROTATE_MS, () => {
        void nextMeme($).then(() => $.ui.invalidate('ui.render'))
      })
    }

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      stop()
      // 다음 확인 때 6시간이 지났으면 새로 받는다
      loading = undefined
    }
    return result
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    await ensureLoaded($)
    const p = e.props

    // 압축 중 같은 상태 문구는 엔진 것을 그대로 둔다
    if (p.message !== null) return next(e)

    const m = current
    // 이모티콘은 반짝이는 단어 밖(suffix)에 둔다: 단어 안에 두면 반짝임 색에 묻힌다
    return next({ ...e, props: { ...p, word: m.text, suffix: ` ${m.emoji}…` } })
  })
}
