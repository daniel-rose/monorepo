import { AUTH_STATE, INIT_TEXT } from '../../constants'
import type { AuthStatus } from '../types'

const formatAuth = (status: AuthStatus): string => {
  switch (status.state) {
    case AUTH_STATE.loggedOut:
      return INIT_TEXT.loggedOut
    case AUTH_STATE.unknown:
      return INIT_TEXT.unknown(status.reason)
    case AUTH_STATE.loggedIn: {
      const { email, subscriptionType } = status
      if (email === undefined) return INIT_TEXT.loggedIn
      const details =
        subscriptionType === undefined
          ? email
          : `${email} (${subscriptionType})`
      return INIT_TEXT.loggedInAs(details)
    }
  }
}

export default formatAuth
