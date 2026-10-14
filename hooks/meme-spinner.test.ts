import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderPropsOf } from 'claude-code'

const SPINNER = {
  component: 'Spinner',
  props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } as unknown as RenderPropsOf['Spinner'],
} as const

// 엔진 대역: 스피너는 받은 단어와 꼬리를 그대로 그린다
const engine = (on: On) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on, {
    memes: { at: 1_000_000, memes: [{ text: '킹받는 중', emoji: '😤' }, { text: '가보자고', emoji: '🚀' }] },
  })
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    const p = e.props as { word: string; suffix: string }
    return h(Text, {}, `${p.word}${p.suffix}`) as never
  })
}

test('작업 중 스피너 단어를 한국 밈과 이모티콘으로 바꾼다', async ($, on) => {
  engine(on)
  await $.turn.start({ text: '해 줘', turnId: 't1' } as never)

  const ui = await $.ui.mount({ plugin: 'meme-spinner', surface: 'terminal', ...SPINNER })
  const text = (await ui.find({ type: 'Text' }))?.text ?? ''
  expect(text).toMatch(/^(킹받는 중 😤…|가보자고 🚀…)$/)
  await ui.unmount()
})

test('압축 중 같은 상태 문구는 건드리지 않는다', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount({
    plugin: 'meme-spinner',
    surface: 'terminal',
    component: 'Spinner',
    props: { ...SPINNER.props, message: 'Compacting' },
  })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Sauteing…')
  await ui.unmount()
})
