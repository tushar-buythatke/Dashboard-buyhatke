# HALO — design system handbook

The BuyHatke ads dashboard's design system. If you are building or changing any screen in this
product, read this file first. It is the contract; `src/styles/halo.css` is the implementation.

**See it running:** start the dev server and open **`/style`**. Every token and component in the
system is on that one page (`src/pages/StyleGuide.tsx`). When something looks wrong, check there
first — if `/style` is correct, the bug is in your screen, not the system.

---

## 1. What this system is

An airy, lit canvas. Weightless white cards float on a cool grey-lilac backdrop with a soft aurora
wash. **Depth comes from light and shadow, never from borders.** Everything pressable is a pill.
Numbers are the hero of an ads dashboard, so they get tabular figures, tight tracking, and the
largest type on the page.

Color does real work here: each metric owns a **color family** so you can tell tiles apart at a
glance. Iris is the brand and the default; the other families identify data, and mint/coral always
mean up/down.

The feeling to hit: **thin, bright, colorful, fast.** Not dark, not dramatic, not beige, not
monochrome.

Motion is 130–190ms with spring easing. Nothing runs longer than 260ms. `prefers-reduced-motion`
is honoured globally.

---

## 2. Where everything lives

| Path | What it is |
|---|---|
| `src/styles/halo.css` | **The system.** Tokens, classes, animations. Change the look here, not in components. |
| `src/pages/StyleGuide.tsx` | The `/style` reference page. Add anything new here so it stays visible. |
| `src/hooks/useSpotlight.ts` | Cursor-follow glow for `.halo-spotlight` surfaces. rAF-batched. |
| `src/hooks/useCountUp.ts` | Animates a number to its new value. Respects reduced motion. |
| `src/components/analytics/chartTheme.ts` | Chart palette, axis/grid presets, gradients, shared tooltip, skeleton + empty states. |
| `src/components/ui/*` | Shared primitives (button, card, table, dialog…). Already on Halo. |
| `src/styles/tokens.css` | **Legacy.** The retired velvet system. Do not add to it. |
| `docs/HALO.md` | This file. |

---

## 3. Hard rules

1. **No raw color utilities.** `bg-white`, `bg-gray-*`, `text-gray-*`, `bg-slate-*`, `border-gray-*`,
   `text-blue-600`, `purple-*` are banned. Use `var(--h-*)` tokens or halo classes. Arbitrary values
   reading a token are fine: `bg-[var(--h-surface)]`, `text-[var(--h-ink-2)]`.
2. **Cards are `.halo-card`.** No border in light mode — the class adds the dark-mode hairline itself.
   Never put `border` on a card. Cards never nest inside cards; use `.halo-inset` for an inner group.
3. **Pills.** Buttons, tabs, filter chips, badges, nav items → `999px`. Inputs `10px`, cards `22px`,
   modals `28px`.
4. **Every number gets `.num`** (tabular figures, so columns don't twitch). Large values use
   `.halo-metric`.
5. **8px spacing grid.** Card padding 20 (`p-5`), grid gaps 20 (`gap-5`), sections `space-y-5`. 4px
   steps only inside dense chips. No one-off values like `p-[13px]`. Never mix `mt-*` and `space-y-*`
   in the same stack.
6. **Three ink levels only:** `--h-ink`, `--h-ink-2`, `--h-ink-3`.
7. **Icons:** lucide-react at `strokeWidth={1.75}`, sized 14/16/18/20 only. Tinted icons live in a
   `.halo-chip`.
8. **Keyboard focus stays visible.** Never remove outlines. Hover-revealed row actions must also
   appear on `focus-within` — use opacity, never `display:none`.
9. **One primary action per screen.** Exactly one `.btn-halo`; everything else steps down the ladder.

---

## 4. Color

### Ink and surface

| Token | Use |
|---|---|
| `--h-canvas` | page background (the fixed `.halo-backdrop` paints it) |
| `--h-surface` | cards |
| `--h-surface-2/3` | subtle raised/recessed surfaces, segment tracks |
| `--h-surface-inset` | wells inside cards |
| `--h-ink` / `-2` / `-3` | primary text / secondary / muted |
| `--h-line` / `--h-line-2` | dividers, input borders |

### The families

Six families. **Assign one per metric and keep it stable across the whole product** — impressions
are always iris, conversions always mint. Consistency is what makes color mean something.

| Family | Token | Currently means |
|---|---|---|
| Iris | `--h-iris-500` `#5B4BFF` | the brand; primary actions; impressions |
| Cyan | `--h-cyan` | clicks; informational |
| Violet | `--h-violet` | CTR and rate metrics |
| Amber | `--h-amber` | landings; warning / paused |
| Mint | `--h-mint` | conversions; positive / active / up |
| Coral | `--h-coral` | errors; destructive; down |

Each family gives you four classes:

```html
<span class="halo-chip halo-chip-mint">          <!-- tinted icon chip -->
<span class="halo-chip halo-chip-solid halo-chip-mint">  <!-- saturated fill, white icon -->
<div class="halo-card halo-tile-mint">           <!-- whole card washed in the family -->
<div class="halo-card halo-rail halo-rail-mint"> <!-- colored top hairline -->
```

**Semantic aliases** — always use these when the color carries meaning rather than identity:
`--h-pos`, `--h-neg`, `--h-warn`, `--h-info` (and their `-soft` variants).

### Rules of thumb

- Solid chips are the loudest thing on a card. One per card, never in a dense table row.
- A tinted tile plus a colored rail plus a solid chip is the maximum for one card. Don't add a
  fourth color signal on top.
- Text stays ink. Color the chip, the rail, the delta, the value's accent — not the label.

---

## 5. Type

| Class | Face | Use |
|---|---|---|
| `.halo-title` | Bricolage Grotesque 600 | page H1 only |
| `.halo-heading` | Bricolage Grotesque 600, 15px | card and section titles |
| `.halo-eyebrow` | Inter Tight 600, 10px, uppercase, tracked | kicker above a group |
| `.halo-subtitle` | Inter Tight, 13px, `--h-ink-3` | one-line explanations |
| `.halo-label` | Inter Tight 500, 12px | field and column labels |
| `.halo-metric` | Inter Tight 650, tabular | the big KPI value |
| `.num` | — | **every** number, everywhere |

The display face appears on titles and headings only. Using it on body text kills its impact.

---

## 6. Building a page

Every page follows this skeleton. It is what stops the product feeling uneven.

```tsx
<div className="halo-page">              {/* max-width, centering, responsive padding */}
  <PageHeader
    eyebrow="Dashboard"
    title="Performance overview"
    subhead="One plain sentence saying what this page is for."
    actions={/* right-aligned pill cluster, exactly one .btn-halo */}
  />

  <div className="mt-7 space-y-5">
    {/* KPI row */}
    <div className="grid grid-cols-2 gap-5 xl:grid-cols-4"> … </div>

    {/* main split: chart 8 cols, side panel 4 */}
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-stretch">
      <div className="halo-card p-5 xl:col-span-8"> … </div>
      <div className="halo-card p-5 xl:col-span-4"> … </div>
    </div>
  </div>
</div>
```

### The KPI card — the most repeated unit in the product

```tsx
const spotlight = useSpotlight();
const value = useCountUp(raw);

<div className="halo-card halo-rail halo-rail-mint halo-tile-mint halo-spotlight halo-rise p-5"
     style={{ '--i': index }} {...spotlight}>
  <div className="flex items-start justify-between">
    <span className="halo-chip halo-chip-solid halo-chip-mint"><Target size={16} strokeWidth={1.75} /></span>
    <span className="halo-delta halo-delta-up"><ArrowUp size={12} />12.4%</span>
  </div>
  <p className="halo-eyebrow mt-3">Conversions</p>
  <p className="halo-metric num mt-1">{format(value)}</p>
</div>
```

### Panel with a chart

```tsx
<div className="halo-card">
  <div className="halo-panel-head halo-rail-full">
    <div className="halo-panel-head-title">
      <span className="halo-chip"><BarChart3 size={15} /></span>
      <span className="halo-heading">Top campaigns</span>
    </div>
    <div className="halo-segment">{/* range picker */}</div>
  </div>
  <div className="p-5 pt-0 min-h-[260px]">{/* chart */}</div>
</div>
```

### Required states

Every screen that loads data needs all four:

- **Loading** — `.halo-skeleton` blocks shaped like the real layout. Never a bare full-page spinner,
  never a layout jump when data arrives.
- **Empty** — an invitation, not an apology: `.halo-chip-lg` icon, `.halo-heading` naming what isn't
  there, one-line `.halo-subtitle`, one `.btn-halo` action.
- **Error** — say what failed and what to do. Never "Something went wrong."
- **Loaded**.

---

## 7. Class reference

| Class | Use |
|---|---|
| `.halo-page` | page wrapper: max-width, centering, responsive padding |
| `.halo-card` | the floating card · `.halo-card-raised` for hero panels |
| `.halo-card-interactive` | clickable card: lift + deeper shadow |
| `.halo-rail` | **signature** — spectrum hairline on the top edge (`-iris/-cyan/-mint/-amber/-coral/-violet` to color it) |
| `.halo-rail-full` | full-bleed hairline under a panel head |
| `.halo-spotlight` | **signature** — cursor-follow glow; pair with `useSpotlight()` |
| `.halo-glass` | sticky bars, floating toolbars, overlays |
| `.halo-inset` | wells, nested groups |
| `.btn-halo` | primary pill (iris, sheen sweep on hover) |
| `.btn-halo-soft` `-outline` `-ghost` `-danger` | the emphasis ladder |
| `.btn-halo-sm` `-lg` `-icon` | size modifiers |
| `.halo-field` | input / textarea / select trigger · `.halo-search` for pill search |
| `.halo-segment` + `.halo-segment-item` | tabs and segmented controls (`.halo-segment-accent` = solid iris active pill) |
| `.halo-badge` + `-iris/-pos/-neg/-warn/-info` | status and category markers |
| `.halo-chip` (+ family, + `-solid`, + `-lg`) | icon container |
| `.halo-delta` + `-up/-down/-flat` | tinted change pill (`-bare` for dense rows) |
| `.halo-dot` + `-live` | status dot, pulsing variant |
| `.halo-table` + `.col-num` | data tables |
| `.halo-panel-head` | title row inside a card |
| `.halo-skeleton` / `.halo-spinner` | loading |
| `.halo-rise` | staggered entrance; set `style={{ '--i': index }}` |
| `.halo-nav-item` / `-active` | navigation pills |

---

## 8. Charts

Import everything from `src/components/analytics/chartTheme.ts`. Never hand-roll chart styling.

```tsx
const palette = useHaloChartPalette(theme);

<BarChart data={data}>
  <defs><HaloBarGradient id={gid} color={seriesColor(palette, 0)} /></defs>
  <CartesianGrid {...haloGridProps} />
  <XAxis dataKey="date" {...haloXAxisProps} />
  <YAxis {...haloYAxisProps} />
  <Tooltip content={<HaloTooltip />} cursor={haloBarCursor} />
  <Bar dataKey="value" fill={`url(#${gid})`} {...haloBarProps} {...haloAnimationProps} />
</BarChart>
```

Rules: series colors in family order (iris, cyan, mint, amber, violet, coral) · rounded bar caps
`[6,6,0,0]`, max width 34 · lines 2.5px, no dots, active dot with a white ring · areas fade 22%→0%
· horizontal dashed grid only, no axis lines · 11px ticks in `--h-ink-3` · **always** `HaloTooltip`,
never the Recharts default · animate on mount only · never render axes with no data — use
`HaloChartEmpty`.

`chartTheme.ts` is plain `.ts`, so its components are built with `createElement`. Import and render
them as normal React components.

---

## 9. Writing

Sentence case everywhere. Active verbs naming the outcome: "Create campaign", "Save changes",
"Export CSV" — never "Submit". The button's verb and the resulting toast agree ("Publish" →
"Published"). Labels name what the user controls, not how the system works. Errors explain what
happened and what to do. Empty states invite an action. No exclamation marks, no filler, no
apologies.

---

## 10. Migration status

The velvet system it replaced is still present as a **legacy bridge** at the top of `halo.css`:
every old token (`--bg-panel`, `--text-1`, `--violet-500`…) is aliased to its Halo equivalent, so
un-migrated markup adopts the new look automatically.

**To finish the migration:**

```bash
grep -rn "var(--bg-panel\|var(--text-[123]\|var(--violet-\|var(--line\b" src
grep -rn "bg-white\|bg-gray-\|text-gray-\|bg-slate-\|velvet-" src
```

When both return nothing, delete the legacy bridge block from `halo.css` and delete
`src/styles/tokens.css`. Until then, leave both in place — removing them early will break
whatever hasn't been converted.

Known open items:
- `SlotManagement` shows a fill bar derived from active/inactive status; there is no real occupancy
  field in the API. Marked with a `// HALO:` comment.
- Anywhere you see a `// HALO:` comment, a visual fix was blocked on a logic change that was
  deliberately not made.

---

## 11. Before you call it done

- Zero raw gray/white/blue/purple color utilities in your files.
- Every card `.halo-card`, every button a `.btn-halo*` or the shared `<Button>`, every input `.halo-field`.
- Every number has `.num`.
- Loading, empty, and error states all styled.
- Holds at 1440px and 1024px with no horizontal scroll.
- Works in light **and** dark — flip the theme toggle and look.
- Keyboard focus visible on every interactive element; hover-only actions also show on focus.
- `npx tsc --noEmit -p tsconfig.app.json` passes.
