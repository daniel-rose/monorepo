export declare function load(value: string): string
export declare function load(value: number): Promise<string>

export interface LoadOptions {
  cache: boolean
}

export declare const version: string
