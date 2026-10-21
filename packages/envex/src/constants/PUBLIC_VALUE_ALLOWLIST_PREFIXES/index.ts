/** Value prefixes of tokens that are intentionally public, exempt from the entropy heuristic. */
const PUBLIC_VALUE_ALLOWLIST_PREFIXES: readonly string[] = [
  'pk_live_', // Stripe publishable key
  'pk_test_',
  'pk.', // Mapbox public token
  'phc_', // PostHog project key
  'G-', // Google Analytics 4
  'UA-', // Universal Analytics
  'AIza', // Google browser API key
]

export default PUBLIC_VALUE_ALLOWLIST_PREFIXES
