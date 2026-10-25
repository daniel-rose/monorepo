import { LIMITS_TEXT } from '../../constants'

const pad = (value: number): string => String(value).padStart(2, '0')

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// `14:30` today, `Mon 14:30` on another day, in local time. Resets lie within
// a week (the longest window), so the weekday is unambiguous.
const formatResetTime = (at: number, now: number): string => {
  const date = new Date(at)
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return isSameDay(date, new Date(now))
    ? time
    : `${LIMITS_TEXT.weekdays[date.getDay()]} ${time}`
}

export default formatResetTime
