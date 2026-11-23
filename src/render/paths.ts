import type { Board } from "../geometry/board"
import { keySign, triSign } from "../geometry/board"
import {
  R1,
  R2,
  SQRT3,
  center,
  dist,
  fmt,
  sameOwner,
  type Dir,
  type Owner,
  type Pt,
  type RingId,
} from "../geometry/constants"
import {
  canonicalTriangle,
  circleHits,
  commonNeighbors,
  frameOf,
  inAnnulus,
  neighborsOf,
  pickSide,
  sideOf,
  xIsOverY,
  type Frame,
  type Quad,
} from "../geometry/lattice"
import { ownerAt } from "../geometry/owner"

const QUADS: Quad[] = ["UR", "UL", "LR", "LL"]

function fullCircle(c: Pt, r: number, sweep: 0 | 1): string {
  return `M ${fmt(c.x + r)} ${fmt(c.y)} A ${fmt(r)} ${fmt(r)} 0 1 ${sweep} ${fmt(c.x - r)} ${fmt(c.y)} A ${fmt(r)} ${fmt(r)} 0 1 ${sweep} ${fmt(c.x + r)} ${fmt(c.y)}`
}

function arcBetween(
  c: Pt,
  r: number,
  from: Pt,
  to: Pt,
  preferInside: (mid: Pt) => boolean,
): string {
  const a0 = Math.atan2(from.y - c.y, from.x - c.x)
  let delta = Math.atan2(to.y - c.y, to.x - c.x) - a0
  while (delta <= -Math.PI) delta += 2 * Math.PI
  while (delta > Math.PI) delta -= 2 * Math.PI
  const shortMid = a0 + delta / 2
  const longDelta = delta > 0 ? delta - 2 * Math.PI : delta + 2 * Math.PI
  const longMid = a0 + longDelta / 2
  const at = (a: number): Pt => ({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) })
  const useLong = !preferInside(at(shortMid)) && preferInside(at(longMid))
  const chosen = useLong ? longDelta : delta
  const end = at(a0 + chosen)
  const large = Math.abs(chosen) > Math.PI ? 1 : 0
  const sweep = chosen >= 0 ? 1 : 0
  return `A ${fmt(r)} ${fmt(r)} 0 ${large} ${sweep} ${fmt(end.x)} ${fmt(end.y)}`
}

/** Closed boundary of one side of the intersection of two annuli. */
export function annulusCap(a: Pt, b: Pt, side: 1 | -1): string {
  const ii = pickSide(circleHits(a, R1, b, R1), a, b, side)
  const aiBo = pickSide(circleHits(a, R1, b, R2), a, b, side)
  const oo = pickSide(circleHits(a, R2, b, R2), a, b, side)
  const aoBi = pickSide(circleHits(a, R2, b, R1), a, b, side)
  const inside = (p: Pt) => inAnnulus(p, a) && inAnnulus(p, b)
  let d = `M ${fmt(ii.x)} ${fmt(ii.y)}`
  d += arcBetween(a, R1, ii, aiBo, inside)
  d += arcBetween(b, R2, aiBo, oo, inside)
  d += arcBetween(a, R2, oo, aoBi, inside)
  d += arcBetween(b, R1, aoBi, ii, inside)
  return d + "Z"
}

type QuadSpec = {
  tCircle: Pt
  tR: number
  sCircle: Pt
  sR: number
  tSign: 1 | -1
  sSign: 1 | -1
}

function quadSpec(frame: Frame, quad: Quad): QuadSpec {
  if (quad === "UR")
    return { tCircle: frame.L, tR: R1, sCircle: frame.U, sR: R2, tSign: 1, sSign: 1 }
  if (quad === "UL")
    return { tCircle: frame.R, tR: R1, sCircle: frame.U, sR: R2, tSign: -1, sSign: 1 }
  if (quad === "LR")
    return { tCircle: frame.L, tR: R1, sCircle: frame.D, sR: R2, tSign: 1, sSign: -1 }
  return { tCircle: frame.R, tR: R1, sCircle: frame.D, sR: R2, tSign: -1, sSign: -1 }
}

function axisPoint(frame: Frame, along: "t" | "s", sign: 1 | -1): Pt {
  if (along === "t") {
    const t = sign * (R1 - 0.5)
    return { x: frame.M.x + t * frame.u.x, y: frame.M.y + t * frame.u.y }
  }
  const s = sign * (SQRT3 / 2 - R2)
  return { x: frame.M.x + s * frame.n.x, y: frame.M.y + s * frame.n.y }
}

function inKey(frame: Frame, p: Pt): boolean {
  return (
    dist(p, frame.L) < R1 && dist(p, frame.R) < R1 && dist(p, frame.U) > R2 && dist(p, frame.D) > R2
  )
}

export function quadrantPath(frame: Frame, quad: Quad): string {
  const spec = quadSpec(frame, quad)
  const pt = axisPoint(frame, "t", spec.tSign)
  const ps = axisPoint(frame, "s", spec.sSign)
  const hits = circleHits(spec.tCircle, spec.tR, spec.sCircle, spec.sR)
  let corner = hits[0]
  let best = -Infinity
  for (const h of hits) {
    const relx = h.x - frame.M.x
    const rely = h.y - frame.M.y
    const t = relx * frame.u.x + rely * frame.u.y
    const s = relx * frame.n.x + rely * frame.n.y
    const score = t * spec.tSign + s * spec.sSign
    if (score > best) {
      best = score
      corner = h
    }
  }
  const prefer = (p: Pt) => inKey(frame, p)
  let d = `M ${fmt(frame.M.x)} ${fmt(frame.M.y)} L ${fmt(pt.x)} ${fmt(pt.y)}`
  d += arcBetween(spec.tCircle, spec.tR, pt, corner, prefer)
  d += arcBetween(spec.sCircle, spec.sR, corner, ps, prefer)
  d += `L ${fmt(frame.M.x)} ${fmt(frame.M.y)} Z`
  return d
}

export function keyCrossPath(frame: Frame): string {
  const a = axisPoint(frame, "t", 1)
  const b = axisPoint(frame, "t", -1)
  const c = axisPoint(frame, "s", 1)
  const d = axisPoint(frame, "s", -1)
  return `M ${fmt(a.x)} ${fmt(a.y)} L ${fmt(b.x)} ${fmt(b.y)} M ${fmt(c.x)} ${fmt(c.y)} L ${fmt(d.x)} ${fmt(d.y)}`
}

function holesFor(i: number, j: number, board: Board): string {
  const me = { i, j }
  const ca = center(i, j)
  let d = ""
  for (const nb of neighborsOf(i, j)) {
    for (const third of commonNeighbors(me, nb)) {
      const tri = canonicalTriangle([me, nb, third])
      const sign = triSign(board, tri.kind, tri.i, tri.j)
      if (xIsOverY(me, nb, tri.ordered, sign)) continue
      const cb = center(nb.i, nb.j)
      const ct = center(third.i, third.j)
      d += annulusCap(ca, cb, sideOf(ca, cb, ct))
    }
  }
  return d
}

function quadrantsFor(i: number, j: number, board: Board): string {
  let d = ""
  const origins = [{ i, j }, ...neighborsOf(i, j)]
  for (const o of origins) {
    for (const dir of [0, 1, 2] as Dir[]) {
      const frame = frameOf(o.i, o.j, dir)
      const sign = keySign(board, o.i, o.j, dir)
      for (const quad of QUADS) {
        const role =
          sign === 1
            ? quad === "UL"
              ? "R"
              : quad === "UR"
                ? "U"
                : quad === "LR"
                  ? "L"
                  : "D"
            : quad === "UL"
              ? "U"
              : quad === "UR"
                ? "L"
                : quad === "LR"
                  ? "D"
                  : "R"
        const id =
          role === "L" ? frame.Li : role === "R" ? frame.Ri : role === "U" ? frame.Ui : frame.Di
        if (id.i === i && id.j === j) d += quadrantPath(frame, quad)
      }
    }
  }
  return d
}

/** Annulus, with crossings where this ring passes under removed, plus its key quadrants. */
export function ringPath(i: number, j: number, board: Board): string {
  const c = center(i, j)
  return (
    fullCircle(c, R2, 1) + fullCircle(c, R1, 0) + holesFor(i, j, board) + quadrantsFor(i, j, board)
  )
}

function boundaryArcs(c: Pt, r: number, board: Board, id: RingId): string {
  const angles: number[] = []
  for (const nb of neighborsOf(id.i, id.j)) {
    const nc = center(nb.i, nb.j)
    for (const rr of [R1, R2]) {
      for (const p of circleHits(c, r, nc, rr)) {
        angles.push(Math.atan2(p.y - c.y, p.x - c.x))
      }
    }
  }
  angles.sort((a, b) => a - b)
  const uniq: number[] = []
  for (const a of angles) {
    if (!uniq.length || Math.abs(a - uniq[uniq.length - 1]) > 1e-5) uniq.push(a)
  }
  if (uniq.length < 2) return ""
  let d = ""
  for (let k = 0; k < uniq.length; k++) {
    const a0 = uniq[k]
    const a1 = uniq[(k + 1) % uniq.length]
    const span = (((a1 - a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    if (span < 1e-4) continue
    const mid = a0 + span / 2
    const inn = { x: c.x + (r - 0.012) * Math.cos(mid), y: c.y + (r - 0.012) * Math.sin(mid) }
    const out = { x: c.x + (r + 0.012) * Math.cos(mid), y: c.y + (r + 0.012) * Math.sin(mid) }
    const oIn = ownerAt(inn, board)
    const oOut = ownerAt(out, board)
    if (sameOwner(oIn, oOut)) continue
    const from = { x: c.x + r * Math.cos(a0), y: c.y + r * Math.sin(a0) }
    const to = { x: c.x + r * Math.cos(a0 + span), y: c.y + r * Math.sin(a0 + span) }
    d += `M ${fmt(from.x)} ${fmt(from.y)} A ${fmt(r)} ${fmt(r)} 0 ${span > Math.PI ? 1 : 0} 1 ${fmt(to.x)} ${fmt(to.y)}`
  }
  return d
}

export function ringStroke(i: number, j: number, board: Board): string {
  const c = center(i, j)
  const id = { i, j }
  return boundaryArcs(c, R2, board, id) + boundaryArcs(c, R1, board, id)
}

/** Outer circle of the lower ring, drawn across the upper band. */
export function jointPath(lower: Pt, upper: Pt, side: 1 | -1): string {
  const pin = pickSide(circleHits(lower, R2, upper, R1), lower, upper, side)
  const pout = pickSide(circleHits(lower, R2, upper, R2), lower, upper, side)
  const insideUpper = (p: Pt) => {
    const du = dist(p, upper)
    return du >= R1 - 1e-5 && du <= R2 + 1e-5
  }
  return `M ${fmt(pin.x)} ${fmt(pin.y)}` + arcBetween(lower, R2, pin, pout, insideUpper)
}

export function jointsFor(i: number, j: number, board: Board): string {
  const me = { i, j }
  const ca = center(i, j)
  let d = ""
  for (const nb of neighborsOf(i, j)) {
    if (nb.i < i || (nb.i === i && nb.j < j)) continue
    const cb = center(nb.i, nb.j)
    for (const third of commonNeighbors(me, nb)) {
      const tri = canonicalTriangle([me, nb, third])
      const sign = triSign(board, tri.kind, tri.i, tri.j)
      const ct = center(third.i, third.j)
      const aOver = xIsOverY(me, nb, tri.ordered, sign)
      const lower = aOver ? cb : ca
      const upper = aOver ? ca : cb
      d += jointPath(lower, upper, sideOf(lower, upper, ct))
    }
  }
  return d
}

export type ViewBox = { x: number; y: number; w: number; h: number }

export function ringsInView(view: ViewBox, margin = 1.35): RingId[] {
  const x0 = view.x - margin
  const y0 = view.y - margin
  const x1 = view.x + view.w + margin
  const y1 = view.y + view.h + margin
  const j0 = Math.floor((y0 * 2) / SQRT3) - 1
  const j1 = Math.ceil((y1 * 2) / SQRT3) + 1
  const rings: RingId[] = []
  for (let j = j0; j <= j1; j++) {
    const i0 = Math.floor(x0 - j / 2) - 1
    const i1 = Math.ceil(x1 - j / 2) + 1
    for (let i = i0; i <= i1; i++) {
      const c = center(i, j)
      if (c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1) rings.push({ i, j })
    }
  }
  return rings
}

export function edgesInView(view: ViewBox): { i: number; j: number; dir: Dir; frame: Frame }[] {
  const rings = ringsInView(view, 0.4)
  const seen = new Set<string>()
  const out: { i: number; j: number; dir: Dir; frame: Frame }[] = []
  for (const r of rings) {
    for (const dir of [0, 1, 2] as Dir[]) {
      const key = `${r.i},${r.j},${dir}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ i: r.i, j: r.j, dir, frame: frameOf(r.i, r.j, dir) })
    }
  }
  return out
}

export function trisInView(
  view: ViewBox,
): { kind: 0 | 1; i: number; j: number; x: number; y: number }[] {
  const rings = ringsInView(view, 0.2)
  const minI = Math.min(...rings.map((r) => r.i))
  const maxI = Math.max(...rings.map((r) => r.i))
  const minJ = Math.min(...rings.map((r) => r.j))
  const maxJ = Math.max(...rings.map((r) => r.j))
  const out: { kind: 0 | 1; i: number; j: number; x: number; y: number }[] = []
  for (let j = minJ - 1; j <= maxJ; j++) {
    for (let i = minI - 1; i <= maxI; i++) {
      for (const kind of [0, 1] as const) {
        const verts =
          kind === 0
            ? [center(i, j), center(i + 1, j), center(i, j + 1)]
            : [center(i + 1, j), center(i + 1, j + 1), center(i, j + 1)]
        const x = (verts[0].x + verts[1].x + verts[2].x) / 3
        const y = (verts[0].y + verts[1].y + verts[2].y) / 3
        if (x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h) {
          out.push({ kind, i, j, x, y })
        }
      }
    }
  }
  return out
}

export function strokeOwnerSample(p: Pt, board: Board): Owner {
  return ownerAt(p, board)
}
