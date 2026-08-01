# HALO — Build Spec

**This is the contract.** Every surface in the BuyHatke ads dashboard is built from the tokens
and classes in `src/styles/halo.css`. Read that file before writing a line. If something you need
isn't in it, use the closest token — do not invent a hex.

---

## 1. The direction, in one paragraph

An airy, lit canvas. Weightless white cards float on a cool grey-lilac backdrop with a soft aurora
wash. Depth comes from **light and shadow, never from borders**. Every pressable thing is a pill.
One electric accent — **Iris `#5B4BFF`** — carries the whole brand; mint / amber / coral appear only
as signals (up, warning, down). Numbers are the hero of an ads dashboard, so they get tabular
figures, tight tracking, and the largest type on the page. Motion is fast and tactile: 130–190ms,
spring easing, nothing over 260ms.

The feeling to hit: **thin, bright, expensive, fast.** Not dark. Not dramatic. Not beige.

---

## 2. Hard rules

1. **No raw color utilities.** `bg-white`, `bg-gray-*`, `text-gray-*`, `bg-slate-*`, `border-gray-*`,
   `text-blue-600`, `bg-purple-*` etc. are all banned. Use `var(--h-*)` tokens or halo classes.
   Arbitrary-value Tailwind reading a token is fine: `bg-[var(--h-surface)]`, `text-[var(--h-ink-2)]`.
2. **Cards: `.halo-card`.** No border in light mode — the class handles the dark-mode hairline itself.
   Never add `border` to a card.
3. **Pills.** Buttons, tabs, filter chips, badges, nav items, segmented controls → `border-radius: 999px`.
   Inputs stay `--h-r-sm` (10px). Cards `--h-r-card` (22px). Modals `--h-r-xl` (28px).
4. **Every number gets `.num`.** Tabular figures so columns don't twitch. Large values use `.halo-metric`.
5. **8px spacing grid.** Card padding 20px (`p-5`), grid gaps 20px (`gap-5`), page padding via `.halo-page`.
   4px increments only inside dense chips/badges. No one-off values like `p-[13px]`.
6. **Three ink levels only.** `--h-ink` (primary), `--h-ink-2` (secondary), `--h-ink-3` (tertiary/muted).
7. **Icons: lucide-react, `strokeWidth={1.75}`**, sized 14/16/18/20 only. Tinted icons sit in a `.halo-chip`.
8. **Keyboard focus must stay visible.** Don't remove outlines; use the `:focus-visible` treatment
   already defined (`--h-ring`).
9. **Never change behaviour.** This is a visual pass. Do not touch data fetching, state, routing,
   handler logic, or API calls. If a fix requires a logic change, leave a `// HALO:` comment instead.
10. **Don't delete `src/styles/tokens.css`** or the legacy bridge — other surfaces still depend on it.

---

## 3. The vocabulary

Full reference is `src/styles/halo.css`. The classes you will use constantly:

| Class | Use |
|---|---|
| `.halo-card` | the floating white card. Add `.halo-card-raised` for hero panels |
| `.halo-card-interactive` | clickable card: lift + deeper shadow on hover |
| `.halo-rail` | **signature** — hairline spectrum gradient across a card's top edge |
| `.halo-spotlight` | **signature** — cursor-follow glow. Pair with the `useSpotlight()` hook |
| `.halo-glass` | sticky bars, floating toolbars, overlays |
| `.halo-inset` | wells, nested groups, code/JSON blocks |
| `.halo-page` | page wrapper: max-width, centering, responsive padding |
| `.halo-title` / `.halo-subtitle` | page header |
| `.halo-heading` / `.halo-eyebrow` / `.halo-label` | section head / tiny uppercase kicker / field label |
| `.halo-metric` / `.num` | big KPI value / any number |
| `.btn-halo` | primary pill (iris, sheen sweep on hover) |
| `.btn-halo-soft` / `-outline` / `-ghost` / `-danger` | secondary emphasis ladder |
| `.btn-halo-sm` / `-lg` / `-icon` | size modifiers |
| `.halo-field` | input / textarea / select trigger. `.halo-search` for pill search |
| `.halo-segment` + `.halo-segment-item` | tabs & segmented controls (`.halo-segment-accent` = iris active pill) |
| `.halo-badge` + `-iris/-pos/-neg/-warn/-info` | status & category markers |
| `.halo-chip` | tinted square holding an icon |
| `.halo-delta` + `-up/-down/-flat` | change indicator beside a metric |
| `.halo-table` + `.col-num` | data tables |
| `.halo-panel-head` | title row inside a card |
| `.halo-skeleton` / `.halo-spinner` | loading |
| `.halo-rise` (with `style={{ '--i': index }}`) | staggered entrance |
| `.halo-nav-item` / `.halo-nav-item-active` | navigation pills |

Hooks: `useSpotlight()` (`src/hooks/useSpotlight.ts`), `useCountUp()` (`src/hooks/useCountUp.ts`).

---

## 4. Page anatomy

Every page follows the same skeleton. This is what kills the "everything is uneven" problem.

```
<div className="halo-page">
  ── page header ─────────────────────────────────────────
  eyebrow (uppercase, --h-ink-3)
  H1 .halo-title            [ actions: pill buttons, right-aligned ]
  .halo-subtitle — one plain sentence saying what this page is for
  ── content ─────────────────────────────────────────────
  KPI row     grid gap-5, 2 cols @sm / 4 cols @xl
  main panels grid gap-5, 12-col at xl (chart 8 / side 4)
  tables      inside a .halo-card, header row sticky
</div>
```

- Section spacing: `space-y-5` between blocks. Never mix `mt-*` and `space-y-*` in the same stack.
- Page header actions are a right-aligned pill cluster. Primary action is the only `.btn-halo` on screen.
- Cards never nest inside cards. Use `.halo-inset` for an inner group.

## 5. Component patterns

**KPI card** — the most-repeated unit in the product:
```
.halo-card .halo-rail .halo-spotlight, p-5
  row: .halo-chip (icon)  ·  .halo-eyebrow label      right: .halo-delta (+12.4%)
  .halo-metric value  (animate with useCountUp)
  footer: .halo-subtitle context line, or a 32px sparkline
```

**Panel with a chart**:
```
.halo-card
  .halo-panel-head .halo-rail-full   →  .halo-heading + optional .halo-badge   |   .halo-segment range picker
  chart body, p-5 pt-0, min-height 260px
```

**Empty state** — an invitation to act, not an apology:
```
centered, py-12
  .halo-chip-lg with a relevant icon
  .halo-heading — what isn't here yet ("No campaigns yet")
  .halo-subtitle — one line on what to do about it
  .btn-halo — the action
```

**Loading** — `.halo-skeleton` blocks matching the real layout's shape. Never a bare spinner for a
whole page; never a layout jump when data lands.

**Error** — state what failed and what to do. No apologies, no vague "Something went wrong."

## 6. Charts (Recharts)

- Series colors in order: `--h-iris-500`, `--h-cyan`, `--h-mint`, `--h-amber`, `--h-violet`, `--h-coral`.
- Bars: rounded caps `radius={[6,6,0,0]}`, gradient fill (iris 90% → iris 25% top-to-bottom), `maxBarSize={34}`.
- Lines: `strokeWidth={2.5}`, no dots, active dot r=4 with a white ring.
- Areas: gradient fill from 22% to 0% opacity.
- Grid: horizontal only, `stroke="var(--h-line)"`, `strokeDasharray="3 6"`. No vertical grid, no axis lines.
- Axis ticks: 11px, `--h-ink-3`, no tick lines.
- Tooltip: custom — `.halo-card` shell, 12px radius, `--h-sh-3`, label in `--h-ink-3` uppercase 10px,
  values in `.num`. Never the default Recharts tooltip.
- Animate in on mount (`animationDuration={600}`), not on every re-render.

## 7. Copy

Sentence case everywhere. Active verbs that name the outcome: "Create campaign", "Save changes",
"Export CSV" — never "Submit". The button's verb and the resulting toast agree ("Publish" → "Published").
Labels name what the user controls, not how the system works. No exclamation marks, no filler.

## 8. Definition of done

- Zero raw gray/white/blue/purple Tailwind color utilities left in your files.
- Every card is `.halo-card`; every button is a `.btn-halo*` or the shared `<Button>`; every input `.halo-field`.
- Every number has `.num`.
- Loading, empty, and error states all styled.
- Layout holds at 1440px and 1024px with no horizontal scroll.
- `npx tsc -b` passes with no new errors.
