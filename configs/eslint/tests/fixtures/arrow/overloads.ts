function echo(value: string): string
function echo(value: number): number
function echo(value: string | number): string | number {
  return value
}

export default echo
