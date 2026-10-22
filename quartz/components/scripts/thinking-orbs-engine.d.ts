declare module "thinking-orbs/engine" {
  export interface ModeOptions {
    [key: string]: number | undefined
  }

  export type ModeDraw = (
    context: CanvasRenderingContext2D,
    size: number,
    time: number,
    dark: boolean,
    options: ModeOptions,
  ) => void

  export interface ResolvedPreset {
    mode: string
    speed: number
    options?: never
    opts: ModeOptions
  }

  export const MODE_DRAWS: Record<string, ModeDraw>
  export function resolvePreset(state: string, size: 28 | 40 | 64): ResolvedPreset
}
