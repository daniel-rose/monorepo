import { expect, test } from 'claude-code/testing'

import SWITCH_FIXTURE from './switch.fixture'
import switchEngine from './switchEngine'

const { underHook: UNDER_HOOK, ran, answered, setUp, start } = switchEngine
const { switchCommand, measure } = switchEngine

const NO_TARGET = answered({
  ...SWITCH_FIXTURE.plan,
  target: null,
  reason: 'none',
})

const OFFER =
  'ccprofile: five_hour at 91% – /ccprofile-switch continues this session as account "seat-2"'

test('offers the switch once per full window', async ($, on) => {
  const engineered = setUp(on, UNDER_HOOK)
  await start($)

  await measure($, 80)
  await measure($, 91)
  await measure($, 93)

  expect(engineered.toasts).toEqual([OFFER])
})

test('offers nothing without a target', async ($, on) => {
  const engineered = setUp(on, UNDER_HOOK, () => NO_TARGET)
  await start($)

  await measure($, 95)

  expect(engineered.toasts).toEqual([])
})

test('offers once a target frees up in the same window', async ($, on) => {
  const answers = [NO_TARGET, NO_TARGET]
  const engineered = setUp(
    on,
    UNDER_HOOK,
    () => answers.shift() ?? answered(SWITCH_FIXTURE.plan)
  )
  await start($)

  // The first measurement asks for the threshold, then for the target.
  await measure($, 90)
  await measure($, 91)

  expect(engineered.toasts).toEqual([OFFER])
})

test('asks for the threshold again after ccprofile failed', async ($, on) => {
  const answers = [ran(1, '', 'ccprofile: busy\n')]
  const engineered = setUp(
    on,
    UNDER_HOOK,
    () => answers.shift() ?? answered(SWITCH_FIXTURE.plan)
  )
  await start($)

  await measure($, 90)
  await measure($, 91)

  expect(engineered.toasts).toEqual([OFFER])
})

test('offers nothing once the switch is armed', async ($, on) => {
  const engineered = setUp(on, UNDER_HOOK)
  await start($)
  await switchCommand($)

  await measure($, 95)

  expect(engineered.toasts).toEqual([])
})

test('offers nothing outside the hook v4', async ($, on) => {
  const engineered = setUp(on, {})
  await start($)

  await measure($, 95)

  expect(engineered.toasts).toEqual([])
  expect(engineered.runs).toEqual([])
})
