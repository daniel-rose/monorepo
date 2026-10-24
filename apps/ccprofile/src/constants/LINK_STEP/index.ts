// What `link` does with one shared entry of an account.
const LINK_STEP = {
  create: 'create',
  ok: 'ok',
  noSource: 'noSource',
  conflict: 'conflict',
} as const

export default LINK_STEP
