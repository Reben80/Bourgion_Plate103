<script lang="ts" module>
  let stageSerial = 0

  function hexPoints(x: number, y: number, r: number) {
    return Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 3) * k - Math.PI / 6
      return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`
    }).join(" ")
  }
  function triPoints(x: number, y: number, r: number) {
    return Array.from({ length: 3 }, (_, k) => {
      const a = (Math.PI * 2 * k) / 3 - Math.PI / 2
      return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`
    }).join(" ")
  }
</script>

<script lang="ts">
  import { SvelteMap, SvelteSet } from "svelte/reactivity"
  import type { Board } from "../geometry/board"
  import { keySign, triSign } from "../geometry/board"
  import { SQRT3, center, mod, type Dir } from "../geometry/constants"
  import { ownerAt } from "../geometry/owner"
  import { edgesInView, trisInView, type ViewBox } from "../render/paths"
  import { buildCell, tilesCovering } from "../render/scene"
  import type { Mark } from "../symmetry/classify"

  type Props = {
    board: Board
    view: ViewBox
    bands: [string, string, string]
    ground: string
    showMarkers: boolean
    showOverlay: boolean
    marks: Mark[]
    glaze: boolean
    paint: boolean
    projector: boolean
    highlight: { i: number; j: number } | null
    onview: (view: ViewBox) => void
    onflipkey: (i: number, j: number, dir: Dir) => void
    onfliptri: (kind: 0 | 1, i: number, j: number) => void
    onhighlight: (ring: { i: number; j: number } | null) => void
  }

  let {
    board,
    view,
    bands,
    ground,
    showMarkers,
    showOverlay,
    marks,
    glaze,
    paint,
    projector,
    highlight,
    onview,
    onflipkey,
    onfliptri,
    onhighlight,
  }: Props = $props()

  let svg = $state<SVGSVGElement | null>(null)
  stageSerial += 1
  const stageId = `s${stageSerial}`
  const cell = $derived(buildCell(board))
  const tiles = $derived(tilesCovering(view))

  const keyMarkers = $derived(showMarkers ? edgesInView(view) : [])
  const triMarkers = $derived(showMarkers ? trisInView(view) : [])

  const lattice = $derived.by(() => {
    if (!showOverlay) return ""
    let d = ""
    const seen = new SvelteSet<string>()
    for (const edge of edgesInView(view)) {
      const a = center(edge.i, edge.j)
      const b = edge.frame.R
      const id = `${a.x.toFixed(3)},${a.y.toFixed(3)}:${b.x.toFixed(3)},${b.y.toFixed(3)}`
      if (seen.has(id)) continue
      seen.add(id)
      d += `M ${a.x} ${a.y} L ${b.x} ${b.y}`
    }
    return d
  })

  const drawnMarks = $derived.by(() => {
    if (!showOverlay) return [] as (Mark & { key: string })[]
    const out: (Mark & { key: string })[] = []
    for (const mark of marks) {
      for (let a = -2; a <= 3; a++) {
        for (let b = -2; b <= 3; b++) {
          const ox = a * 6 + b * 3
          const oy = b * 3 * SQRT3
          const x = mark.x + ox
          const y = mark.y + oy
          if (mark.type === "glide") {
            if (a !== 0 || b !== 0) continue
            out.push({ ...mark, key: `g-${mark.dx}-${mark.dy}-${mark.x}` })
            continue
          }
          if (
            x < view.x - 0.4 ||
            x > view.x + view.w + 0.4 ||
            y < view.y - 0.4 ||
            y > view.y + view.h + 0.4
          ) {
            continue
          }
          out.push({ ...mark, x, y, key: `${mark.type}-${x.toFixed(3)}-${y.toFixed(3)}` })
        }
      }
    }
    return out
  })

  function toSvg(event: PointerEvent) {
    const node = svg
    if (!node) return { x: 0, y: 0 }
    const pt = node.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const ctm = node.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  let drag: {
    id: number
    x: number
    y: number
    vx: number
    vy: number
    moved: boolean
    painted: SvelteSet<string>
  } | null = null
  const pinches = new SvelteMap<number, { x: number; y: number }>()

  function scaleFrom() {
    const node = svg
    if (!node) return { sx: 1, sy: 1 }
    const rect = node.getBoundingClientRect()
    return { sx: view.w / rect.width, sy: view.h / rect.height }
  }

  function onDown(event: PointerEvent) {
    if (event.button !== 0) return
    const target = event.target as Element
    if (target.closest(".marker")) return
    pinches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    svg?.setPointerCapture(event.pointerId)
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      vx: view.x,
      vy: view.y,
      moved: false,
      painted: new SvelteSet(),
    }
    if (paint) paintAt(event, drag.painted)
  }

  function onMove(event: PointerEvent) {
    pinches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinches.size === 2) {
      pinch()
      return
    }
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (Math.hypot(dx, dy) > 4) drag.moved = true
    if (paint) {
      paintAt(event, drag.painted)
      return
    }
    const { sx, sy } = scaleFrom()
    onview({ ...view, x: drag.vx - dx * sx, y: drag.vy - dy * sy })
  }

  function onUp(event: PointerEvent) {
    pinches.delete(event.pointerId)
    if (drag && !drag.moved && !paint && !(event.target as Element).closest(".marker")) {
      const owner = ownerAt(toSvg(event), board)
      if (owner.type === "ring") {
        if (highlight && highlight.i === owner.i && highlight.j === owner.j) onhighlight(null)
        else onhighlight({ i: owner.i, j: owner.j })
      }
    }
    if (drag?.id === event.pointerId) drag = null
    if (pinches.size < 2) pinchDist = 0
  }

  function paintAt(event: PointerEvent, painted: Set<string>) {
    const p = toSvg(event)
    for (const edge of edgesInView(view)) {
      const id = `k${edge.i}:${edge.j}:${edge.dir}`
      if (painted.has(id)) continue
      const dx = edge.frame.M.x - p.x
      const dy = edge.frame.M.y - p.y
      if (dx * dx + dy * dy < 0.05) {
        painted.add(id)
        onflipkey(edge.i, edge.j, edge.dir)
      }
    }
    for (const tri of trisInView(view)) {
      const id = `t${tri.kind}:${tri.i}:${tri.j}`
      if (painted.has(id)) continue
      const dx = tri.x - p.x
      const dy = tri.y - p.y
      if (dx * dx + dy * dy < 0.05) {
        painted.add(id)
        onfliptri(tri.kind, tri.i, tri.j)
      }
    }
  }

  let pinchDist = 0
  function pinch() {
    const pts = [...pinches.values()]
    if (pts.length < 2) return
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    if (pinchDist > 0 && svg) {
      const factor = pinchDist / d
      const rect = svg.getBoundingClientRect()
      const cx = (pts[0].x + pts[1].x) / 2
      const cy = (pts[0].y + pts[1].y) / 2
      const px = view.x + ((cx - rect.left) / rect.width) * view.w
      const py = view.y + ((cy - rect.top) / rect.height) * view.h
      const w = Math.min(28, Math.max(1.4, view.w * factor))
      const h = w * (view.h / view.w)
      onview({ x: px - (px - view.x) * (w / view.w), y: py - (py - view.y) * (h / view.h), w, h })
    }
    pinchDist = d
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()
    const node = svg
    if (!node) return
    const rect = node.getBoundingClientRect()
    const px = view.x + ((event.clientX - rect.left) / rect.width) * view.w
    const py = view.y + ((event.clientY - rect.top) / rect.height) * view.h
    const factor = event.deltaY > 0 ? 1.08 : 0.92
    const w = Math.min(28, Math.max(1.4, view.w * factor))
    const h = w * (view.h / view.w)
    onview({
      x: px - (px - view.x) * (w / view.w),
      y: py - (py - view.y) * (h / view.h),
      w,
      h,
    })
  }

  function wheelAction(node: SVGSVGElement) {
    const handler = (event: WheelEvent) => onWheel(event)
    node.addEventListener("wheel", handler, { passive: false })
    return {
      destroy() {
        node.removeEventListener("wheel", handler)
      },
    }
  }

  function flipMarkerKey(event: Event, i: number, j: number, dir: Dir) {
    event.preventDefault()
    event.stopPropagation()
    onflipkey(i, j, dir)
  }

  function flipMarkerTri(event: Event, kind: 0 | 1, i: number, j: number) {
    event.preventDefault()
    event.stopPropagation()
    onfliptri(kind, i, j)
  }

  const markerR = $derived(projector ? 0.036 : 0.022)

  const spotlight = $derived.by(() => {
    if (!highlight) return null
    const j0 = mod(highlight.j, 6)
    const b = (highlight.j - j0) / 6
    const shifted = highlight.i - b * 3
    const i0 = mod(shifted, 6)
    const a = (shifted - i0) / 6
    const fill = cell.fills.find((item) => item.i === i0 && item.j === j0)
    if (!fill) return null
    return { d: fill.d, color: fill.color, x: a * 6 + b * 3, y: b * 3 * SQRT3 }
  })
</script>

<svg
  bind:this={svg}
  viewBox="{view.x} {view.y} {view.w} {view.h}"
  role="img"
  aria-label="Interlaced rings"
  use:wheelAction
  onpointerdown={onDown}
  onpointermove={onMove}
  onpointerup={onUp}
  onpointercancel={onUp}
>
  <defs>
    <filter id="{stageId}-glaze" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.9"
        numOctaves="2"
        seed="4"
        result="noise"
      />
      <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
      <feComponentTransfer in="gray" result="soft">
        <feFuncA type="linear" slope="0.18" />
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="soft" mode="multiply" />
    </filter>
  </defs>
  <rect x={view.x} y={view.y} width={view.w} height={view.h} fill={ground} />
  <defs>
    <g id="{stageId}-cell">
      {#each cell.fills as fill (fill.i + ":" + fill.j)}
        <path d={fill.d} fill={bands[fill.color]} fill-rule="evenodd" />
      {/each}
      <path
        d={cell.stroke + cell.crosses + cell.joints}
        fill="none"
        stroke="var(--stroke)"
        stroke-width="0.016"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </g>
  </defs>
  <g
    class="weave-layer"
    class:dim={highlight !== null}
    filter={glaze ? `url(#${stageId}-glaze)` : undefined}
  >
    {#each tiles as tile (tile.key)}
      <use href="#{stageId}-cell" x={tile.x} y={tile.y} />
    {/each}
  </g>
  {#if spotlight}
    <g class="spotlight" transform="translate({spotlight.x} {spotlight.y})">
      <path d={spotlight.d} fill={bands[spotlight.color]} fill-rule="evenodd" />
    </g>
  {/if}
  {#if showOverlay}
    <g class="symmetry" pointer-events="none">
      <path d={lattice} fill="none" stroke="var(--overlay)" stroke-width="0.008" opacity="0.55" />
      {#each drawnMarks as mark (mark.key)}
        {#if mark.type === "hex"}
          <polygon fill="var(--mark-hex)" points={hexPoints(mark.x, mark.y, 0.07)} />
        {:else if mark.type === "tri"}
          <polygon fill="var(--mark-tri)" points={triPoints(mark.x, mark.y, 0.062)} />
        {:else if mark.type === "oval"}
          <ellipse cx={mark.x} cy={mark.y} rx="0.05" ry="0.026" fill="var(--mark-oval)" />
        {:else}
          <line
            x1={mark.x - mark.dx * 0.42}
            y1={mark.y - mark.dy * 0.42}
            x2={mark.x + mark.dx * 0.42}
            y2={mark.y + mark.dy * 0.42}
            stroke="var(--mark-glide)"
            stroke-width="0.02"
            stroke-linecap="round"
            stroke-dasharray="0.045 0.03"
          />
        {/if}
      {/each}
    </g>
  {/if}
  {#if showMarkers}
    {#each keyMarkers as edge (`k${edge.i}:${edge.j}:${edge.dir}`)}
      {@const sign = keySign(board, edge.i, edge.j, edge.dir)}
      <g
        class="marker"
        class:minus={sign < 0}
        role="button"
        tabindex="0"
        aria-label={`Key at column ${edge.i}, row ${edge.j}, ${sign > 0 ? "positive" : "negative"}. Activate to flip.`}
        onclick={(event) => flipMarkerKey(event, edge.i, edge.j, edge.dir)}
        onkeydown={(event) => {
          if (event.key === "Enter" || event.key === " ")
            flipMarkerKey(event, edge.i, edge.j, edge.dir)
        }}
      >
        <circle class="hit" cx={edge.frame.M.x} cy={edge.frame.M.y} r="0.16" />
        <circle cx={edge.frame.M.x} cy={edge.frame.M.y} r={markerR} />
      </g>
    {/each}
    {#each triMarkers as tri (`t${tri.kind}:${tri.i}:${tri.j}`)}
      {@const sign = triSign(board, tri.kind, tri.i, tri.j)}
      <g
        class="marker"
        class:minus={sign < 0}
        role="button"
        tabindex="0"
        aria-label={`Triangle ${tri.kind === 0 ? "up" : "down"} at column ${tri.i}, row ${tri.j}, ${sign > 0 ? "positive" : "negative"}. Activate to flip.`}
        onclick={(event) => flipMarkerTri(event, tri.kind, tri.i, tri.j)}
        onkeydown={(event) => {
          if (event.key === "Enter" || event.key === " ")
            flipMarkerTri(event, tri.kind, tri.i, tri.j)
        }}
      >
        <polygon points={triPoints(tri.x, tri.y, markerR * 1.15)} />
      </g>
    {/each}
  {/if}
</svg>
