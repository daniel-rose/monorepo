import { expect, test } from 'claude-code/testing'

import SWITCH_FIXTURE from './switch.fixture'
import switchEngine from './switchEngine'

const { underHook: UNDER_HOOK, ran, answered, setUp, start } = switchEngine
const { switchCommand, end } = switchEngine

test('arms the switch and writes the handoff at /exit', async ($, on) => {
  const engineered = setUp(on, UNDER_HOOK)
  await start($)

  expect(await switchCommand($)).toBe(
    'after /exit this session continues as account "seat-2" of profile "private". If "seat-2" is in another organization, Claude cannot reuse the earlier thinking there (slower, more tokens). "/ccprofile-switch off" cancels.'
  )
  await end($, 'prompt_input_exit')

  expect(engineered.runs).toEqual([['ccprofile', 'switch', '--json']])
  expect(engineered.written.map(text => JSON.parse(text) as unknown)).toEqual([
    SWITCH_FIXTURE.handoff,
  ])
})

test('drops the switch on /clear', async ($, on) => {
  const engineered = setUp(on, UNDER_HOOK)
  await start($)
  await switchCommand($)

  await end($, 'clear')
  await end($, 'prompt_input_exit')

  expect(engineered.written).toEqual([])
})

test('"off" cancels an armed switch', async ($, on) => {
  const engineered = setUp(on, UNDER_HOOK)
  await start($)
  await switchCommand($)

  expect(await switchCommand($, 'off')).toBe('switch cancelled')
  expect(await switchCommand($, 'off')).toBe('no switch pending')
  await end($, 'prompt_input_exit')

  expect(engineered.written).toEqual([])
})

test('refuses outside the hook v4 without asking ccprofile', async ($, on) => {
  const engineered = setUp(on, {})
  await start($)

  expect(await switchCommand($)).toBe(
    'start claude through the ccprofile hook v4 to switch accounts (run "ccprofile setup")'
  )
  expect(engineered.runs).toEqual([])
})

test('refuses in a nested session', async ($, on) => {
  setUp(on, { ...UNDER_HOOK, CLAUDECODE: '1' })
  await start($)

  expect(await switchCommand($)).toBe(
    'no switch in a claude started inside another claude session'
  )
})

test('names why there is no target', async ($, on) => {
  const engineered = setUp(on, UNDER_HOOK, () =>
    answered({
      ...SWITCH_FIXTURE.plan,
      target: null,
      reason: 'all other accounts ≥90%, free at 14:30',
    })
  )
  await start($)

  expect(await switchCommand($)).toBe(
    'no switch – all other accounts ≥90%, free at 14:30'
  )
  await end($, 'prompt_input_exit')
  expect(engineered.written).toEqual([])
})

test('passes on the error of ccprofile without its prefix', async ($, on) => {
  setUp(on, UNDER_HOOK, () => ran(1, '', 'ccprofile: unknown profile "gone"\n'))
  await start($)

  expect(await switchCommand($)).toBe('unknown profile "gone"')
})

test('says when ccprofile cannot be asked', async ($, on) => {
  setUp(on, UNDER_HOOK, () => {
    throw new Error('ccprofile: not found')
  })
  await start($)

  expect(await switchCommand($)).toBe(
    '"ccprofile switch" failed – is ccprofile on the PATH?'
  )
})

test('a run without a target drops the earlier switch', async ($, on) => {
  const answers = [
    answered(SWITCH_FIXTURE.plan),
    answered({ ...SWITCH_FIXTURE.plan, target: null, reason: 'none' }),
  ]
  const engineered = setUp(on, UNDER_HOOK, () => answers.shift() ?? ran(1, ''))
  await start($)

  await switchCommand($)
  expect(await switchCommand($)).toBe('no switch – none')
  await end($, 'prompt_input_exit')

  expect(engineered.written).toEqual([])
})
