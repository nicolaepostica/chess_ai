export type Rgb = { r: number; g: number; b: number }

const HEX = /^#([0-9a-f]{6})$/i
const RGBA = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i

export function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const trimmed = value.trim()

  const hex = trimmed.match(HEX)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { rgb: { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }, alpha: 1 }
  }

  const rgba = trimmed.match(RGBA)
  if (rgba) {
    return {
      rgb: { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]) },
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    }
  }

  throw new Error(`Unsupported colour: ${value}`)
}

/** A translucent surface over the background yields the colour a person actually sees. */
export function compositeOver(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha))
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b) }
}

/** WCAG 2.1 relative luminance definition. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
