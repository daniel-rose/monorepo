// What reading the limit file of an account found.
const LIMITS_STATUS = {
  ok: 'ok',
  missing: 'missing',
  invalid: 'invalid',
  unsupported: 'unsupported',
} as const

export default LIMITS_STATUS
