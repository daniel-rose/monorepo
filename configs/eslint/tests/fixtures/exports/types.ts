export const Status = {
  Open: 'open',
  Done: 'done',
} as const

export type Status = (typeof Status)[keyof typeof Status]

export interface Task {
  status: Status
}
