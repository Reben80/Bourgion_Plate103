import type { Board } from "../geometry/board"
import type { Palette } from "../presets"
import { buildWeave } from "./scene"

const CROP = { x: -0.35, y: -0.45, w: 6.4, h: 4.6 }

/** Standalone SVG of the current weave, for the clipboard. */
export function patternSvg(board: Board, palette: Palette, stroke: string): string {
  const weave = buildWeave(board, {
    x: CROP.x - 1.4,
    y: CROP.y - 1.2,
    w: CROP.w + 2.8,
    h: CROP.h + 2.4,
  })
  const fills = weave.fills
    .map((f) => `<path fill="${palette.bands[f.color]}" fill-rule="evenodd" d="${f.d}"/>`)
    .join("")
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}">
  <rect x="${CROP.x}" y="${CROP.y}" width="${CROP.w}" height="${CROP.h}" fill="${palette.ground}"/>
  ${fills}
  <path fill="none" stroke="${stroke}" stroke-width="0.016" stroke-linejoin="round" stroke-linecap="round" d="${weave.stroke}${weave.crosses}${weave.joints}"/>
</svg>`
}
