<script lang="ts">
  import { onMount } from "svelte"
  import {
    cloneBoard,
    flipKey,
    flipTri,
    makeBoard,
    mirrorBoard,
    mulberry32,
    type Board,
    type PresetId,
  } from "./geometry/board"
  import { type Dir } from "./geometry/constants"
  import Panel from "./lib/Panel.svelte"
  import Stage from "./lib/Stage.svelte"
  import { paletteById } from "./presets"
  import { patternSvg } from "./render/exportSvg"
  import type { ViewBox } from "./render/paths"
  import { analyze, type GroupName } from "./symmetry/classify"
  import { shapesIn } from "./tiles/shapes"

  const HOME: ViewBox = { x: -0.55, y: -0.7, w: 6.6, h: 4.7 }

  let board = $state(makeBoard("original"))
  let preset = $state<PresetId | "custom">("original")
  let history = $state<Board[]>([])
  let theme = $state<"light" | "dark">("light")
  let markers = $state(true)
  let overlay = $state(false)
  let glaze = $state(false)
  let print3d = $state(false)
  let paint = $state(false)
  let compare = $state(false)
  let projector = $state(false)
  let comparePreset = $state<PresetId>("alt")
  let compareBoard = $state(makeBoard("alt"))
  let highlight = $state<{ i: number; j: number } | null>(null)
  let view = $state<ViewBox>({ ...HOME })
  let compareView = $state<ViewBox>({ ...HOME })
  let toast = $state("")
  let completed = $state<string[]>([])
  let root = $state<HTMLElement | null>(null)
  let generation = $state(0)

  const analysis = $derived(analyze(board))
  const shapes = $derived(shapesIn(board))
  const palette = $derived(paletteById(preset === "custom" ? "original" : preset))
  const rightPalette = $derived(paletteById(comparePreset))
  const stroke = $derived(theme === "dark" && !print3d ? "#f3ecdf" : "#1a1612")
  const ground = $derived(print3d ? "#14171c" : theme === "dark" ? "#16130f" : palette.ground)
  const bands = $derived(
    print3d ? (["#e7e1d6", "#e7e1d6", "#e7e1d6"] as [string, string, string]) : palette.bands,
  )
  const rightGround = $derived(
    print3d ? "#14171c" : theme === "dark" ? "#16130f" : rightPalette.ground,
  )
  const rightBands = $derived(
    print3d ? (["#e7e1d6", "#e7e1d6", "#e7e1d6"] as [string, string, string]) : rightPalette.bands,
  )

  $effect(() => {
    document.documentElement.dataset.theme = theme
  })

  $effect(() => {
    const group = analysis.group
    const goals = ["p3", "p2", "pg", "pgg", "p1"]
    if (goals.includes(group) && !completed.includes(group)) {
      completed = [...completed, group]
      localStorage.setItem("rings-challenges", JSON.stringify(completed))
    }
  })

  onMount(() => {
    const stored = localStorage.getItem("rings-theme")
    if (stored === "light" || stored === "dark") theme = stored
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) theme = "dark"
    const saved = localStorage.getItem("rings-challenges")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[]
        if (Array.isArray(parsed)) completed = parsed
      } catch {
        completed = []
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function push() {
    history = [...history.slice(-39), cloneBoard(board)]
  }

  function commit(next: Board, nextPreset: PresetId | "custom") {
    push()
    board = next
    preset = nextPreset
    highlight = null
    generation += 1
  }

  function undo() {
    const prev = history.at(-1)
    if (!prev) return
    history = history.slice(0, -1)
    board = prev
    preset = "custom"
    generation += 1
  }

  function choose(id: PresetId) {
    const next =
      id === "coin" ? makeBoard("coin", mulberry32((Math.random() * 1e9) | 0)) : makeBoard(id)
    commit(next, id)
  }

  function coin() {
    commit(makeBoard("coin", mulberry32((Math.random() * 1e9) | 0)), "coin")
  }

  function mirror() {
    const next = cloneBoard(board)
    mirrorBoard(next)
    commit(next, "custom")
  }

  function edit(mutator: (next: Board) => void) {
    const next = cloneBoard(board)
    mutator(next)
    commit(next, "custom")
  }

  function toggle(key: "markers" | "overlay" | "glaze" | "print3d" | "paint" | "compare") {
    if (key === "markers") markers = !markers
    if (key === "overlay") overlay = !overlay
    if (key === "glaze") glaze = !glaze
    if (key === "print3d") print3d = !print3d
    if (key === "paint") paint = !paint
    if (key === "compare") compare = !compare
  }

  function setCompare(id: PresetId) {
    comparePreset = id
    compareBoard = id === "coin" ? makeBoard("coin", mulberry32(11)) : makeBoard(id)
  }

  async function copySvg() {
    const svg = patternSvg(board, { ...palette, ground, bands }, stroke)
    try {
      await navigator.clipboard.writeText(svg)
      flash("Pattern copied as SVG")
    } catch {
      const area = document.createElement("textarea")
      area.value = svg
      document.body.appendChild(area)
      area.select()
      document.execCommand("copy")
      area.remove()
      flash("Pattern copied as SVG")
    }
  }

  function flash(message: string) {
    toast = message
    setTimeout(() => {
      if (toast === message) toast = ""
    }, 1800)
  }

  function setTheme(next: "light" | "dark") {
    theme = next
    localStorage.setItem("rings-theme", next)
  }

  async function fullscreen() {
    if (!root) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await root.requestFullscreen()
  }
</script>

<div class="app" class:projector class:print={print3d} bind:this={root}>
  <header class="top">
    <div>
      <p class="eyebrow">Bourgoin, Plate 103</p>
      <h1>Interlaced rings</h1>
    </div>
    <div class="top-actions">
      <button class="icon-btn" type="button" aria-label="Copy pattern as SVG" onclick={copySvg}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="8"
            y="8"
            width="11"
            height="11"
            rx="2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
          />
          <path
            d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
          />
        </svg>
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
        aria-pressed={theme === "dark"}
        onclick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {#if theme === "dark"}
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.7" />
            <path
              d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
              stroke="currentColor"
              stroke-width="1.7"
            />
          {:else}
            <path
              d="M16 13.5A6.5 6.5 0 0 1 10.5 4 6.5 6.5 0 1 0 16 13.5Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            />
          {/if}
        </svg>
      </button>
      <button class="icon-btn" type="button" aria-label="Full screen" onclick={fullscreen}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
          />
        </svg>
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label="Projector mode"
        aria-pressed={projector}
        onclick={() => (projector = !projector)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="3"
            y="6"
            width="18"
            height="10"
            rx="2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
          />
          <path d="M8 20h8" stroke="currentColor" stroke-width="1.7" />
        </svg>
      </button>
    </div>
  </header>

  <main class="stage-wrap" class:compare>
    <section class="sheet" aria-label="Pattern">
      {#key generation}
        <Stage
          {board}
          {view}
          {bands}
          {ground}
          showMarkers={markers}
          showOverlay={overlay}
          marks={analysis.marks}
          {glaze}
          {paint}
          {projector}
          {highlight}
          onview={(next) => (view = next)}
          onflipkey={(i, j, dir: Dir) => edit((next) => flipKey(next, i, j, dir))}
          onfliptri={(kind, i, j) => edit((next) => flipTri(next, kind, i, j))}
          onhighlight={(ring) => (highlight = ring)}
        />
      {/key}
      <p class="caption">{preset === "custom" ? "Edited weave" : palette.label}</p>
    </section>
    {#if compare}
      <section class="sheet" aria-label="Comparison pattern">
        <Stage
          board={compareBoard}
          view={compareView}
          bands={rightBands}
          ground={rightGround}
          showMarkers={false}
          showOverlay={overlay}
          marks={analyze(compareBoard).marks}
          {glaze}
          paint={false}
          {projector}
          highlight={null}
          onview={(next) => (compareView = next)}
          onflipkey={() => {}}
          onfliptri={() => {}}
          onhighlight={() => {}}
        />
        <p class="caption">{rightPalette.label}</p>
      </section>
    {/if}
    <Panel
      {preset}
      group={analysis.group as GroupName}
      explain={analysis.explain}
      {shapes}
      {bands}
      {completed}
      {markers}
      {overlay}
      {glaze}
      {print3d}
      {paint}
      {compare}
      {comparePreset}
      canUndo={history.length > 0}
      onpreset={choose}
      onundo={undo}
      onmirror={mirror}
      oncoin={coin}
      onreset={() => (view = { ...HOME })}
      ontoggle={toggle}
      oncompare={setCompare}
    />
  </main>

  <p class="credit">Pattern after J. Bourgoin, Plate 103 (1879) · Explorer by Dr. Rebin Muhammad</p>
  {#if toast}<div class="toast" role="status">{toast}</div>{/if}
</div>
