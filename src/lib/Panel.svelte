<script lang="ts">
  import type { PresetId } from "../geometry/board"
  import { PALETTES } from "../presets"
  import type { GroupName } from "../symmetry/classify"
  import { SHAPE_LABEL, type TileShape } from "../tiles/shapes"

  type Props = {
    preset: PresetId | "custom"
    group: GroupName
    explain: string
    shapes: TileShape[]
    bands: [string, string, string]
    completed: string[]
    markers: boolean
    overlay: boolean
    glaze: boolean
    print3d: boolean
    paint: boolean
    compare: boolean
    comparePreset: PresetId
    canUndo: boolean
    onpreset: (id: PresetId) => void
    onundo: () => void
    onmirror: () => void
    oncoin: () => void
    onreset: () => void
    ontoggle: (key: "markers" | "overlay" | "glaze" | "print3d" | "paint" | "compare") => void
    oncompare: (id: PresetId) => void
  }

  let {
    preset,
    group,
    explain,
    shapes,
    bands,
    completed,
    markers,
    overlay,
    glaze,
    print3d,
    paint,
    compare,
    comparePreset,
    canUndo,
    onpreset,
    onundo,
    onmirror,
    oncoin,
    onreset,
    ontoggle,
    oncompare,
  }: Props = $props()

  const goals: { id: GroupName; label: string }[] = [
    { id: "p3", label: "p3" },
    { id: "p2", label: "p2" },
    { id: "pg", label: "pg" },
    { id: "pgg", label: "pgg" },
    { id: "p1", label: "p1" },
  ]

  const toggles = $derived([
    ["markers", "Markers", markers],
    ["overlay", "Lattice & symmetry", overlay],
    ["glaze", "Glaze", glaze],
    ["print3d", "3D print", print3d],
    ["paint", "Paint", paint],
    ["compare", "Compare", compare],
  ] as const)
</script>

<aside class="panel">
  <h2>Pattern</h2>
  <div class="presets" role="group" aria-label="Presets">
    {#each PALETTES as item (item.id)}
      <button type="button" aria-pressed={preset === item.id} onclick={() => onpreset(item.id)}>
        {item.label}
      </button>
    {/each}
  </div>

  <h2>Edit</h2>
  <div class="actions">
    <button type="button" onclick={onundo} disabled={!canUndo}>Undo</button>
    <button type="button" onclick={onmirror}>Mirror all</button>
    <button type="button" onclick={oncoin}>New coin flip</button>
    <button type="button" onclick={onreset}>Reset view</button>
  </div>

  <h2>View</h2>
  <div class="toggles">
    {#each toggles as [key, label, on] (key)}
      <button type="button" aria-pressed={on} onclick={() => ontoggle(key)}>{label}</button>
    {/each}
  </div>

  {#if compare}
    <label class="compare-label">
      Right side
      <select
        value={comparePreset}
        onchange={(event) =>
          oncompare((event.currentTarget as HTMLSelectElement).value as PresetId)}
      >
        {#each PALETTES as item (item.id)}
          <option value={item.id}>{item.label}</option>
        {/each}
      </select>
    </label>
  {/if}

  <h2>Symmetry</h2>
  <p class="group-line" aria-live="polite">{group}</p>
  <p class="explain">{explain}</p>

  <h2>Tiles</h2>
  <div class="tiles">
    {#each shapes as shape (shape)}
      <div class="tile">
        <svg viewBox="0 0 36 36" aria-hidden="true">
          {#if shape === "hole"}
            <polygon
              points="18,4 30,11 30,25 18,32 6,25 6,11"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            />
          {:else if shape === "triangle"}
            <polygon
              points="18,6 31,28 5,28"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            />
          {:else if shape === "long-tab"}
            <path
              d="M6 14h8V8h8v6h8v8H6z"
              fill={bands[0]}
              stroke="currentColor"
              stroke-width="1.4"
            />
          {:else if shape === "side-tab"}
            <path
              d="M6 16h12V8h10v8h2v10H6z"
              fill={bands[0]}
              stroke="currentColor"
              stroke-width="1.4"
            />
          {:else}
            <path d="M6 12h24v12H6z" fill={bands[0]} stroke="currentColor" stroke-width="1.4" />
          {/if}
        </svg>
        <span>{SHAPE_LABEL[shape]}</span>
      </div>
    {/each}
  </div>

  <h2>Challenges</h2>
  <div class="goals">
    {#each goals as goal (goal.id)}
      <div class="goal" class:done={completed.includes(goal.id)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {#if completed.includes(goal.id)}
            <path d="M5 12.5 9.2 17 19 7" fill="none" stroke="currentColor" stroke-width="2" />
          {:else}
            <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.5" />
          {/if}
        </svg>
        <span>{goal.label}</span>
      </div>
    {/each}
  </div>
</aside>
