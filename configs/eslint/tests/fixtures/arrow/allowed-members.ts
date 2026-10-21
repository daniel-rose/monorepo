class Counter {
  #value: number

  constructor(start: number) {
    this.#value = start
  }

  get value(): number {
    return this.#value
  }

  set value(next: number) {
    this.#value = next
  }

  increment(): number {
    return ++this.#value
  }

  reset = (): void => {
    this.#value = 0
  }
}

const point = {
  x: 1,
  get double(): number {
    return this.x * 2
  },
  set double(value: number) {
    this.x = value / 2
  },
  move: (by: number): number => by,
}

export default { Counter, point }
