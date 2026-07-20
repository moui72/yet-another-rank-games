---
name: design
status: stable
last_updated: 2026-07-20
---

# Visual Design

The constitution's north star is **fun UX** (Principle III), and the bar is
**WCAG 2.1 AA in every theme** (Principle VI). The UI was built functional- and
accessibility-first; this artifact defines the visual layer added on top.

## Brand identity

The product name — *Yet Another Rank Games* → **YARG** — is self-aware and a
little pirate-y; the look leans into that: colorful and playful, but crafted,
not amateurish.

- **Signature: the messy spine-stack.** A ranking is drawn as a stack of
  colored game-box spines, tapering in width with rank — the collection,
  stacked and sorted. It is the logo *and* a recurring UI motif (hero, live
  rankings, and the deprecated manual drag-order view — see Production
  Annotations). This is where colour and boldness are spent; everything else
  stays quiet.
- **Logo (`Logo.svelte`).** Three offset, messily-stacked box shapes (each a
  bright face over a darker depth lip) with **RG** superimposed in the display
  face under a white halo. Variants: `mark` (RG only — navbar, favicon,
  avatars), `yarg` (mark + **YARG** wordmark), `full` (mark + *Yet Another
  Rank Games* + tagline). The favicon is a self-contained SVG (system font for
  the RG so it renders without the webfont).
- **Palette.** Indigo **ink `#1B1830`** and clean white/lilac surfaces, with a
  box-spine brights set — red `#FF5A47`, orange `#FF9F1C`, yellow `#FFCE3A`,
  teal `#17C3B2`, blue `#3D6EF5`, violet `#8B5CF6`, magenta `#E23FB0`. The
  ultra-brights are decorative (logo only). Interactive fills use the AA-safe
  depth of each hue (primary red `#D92D20` etc.), and spine backgrounds — which
  always carry white title text — use the darker jewel-tone `-700` shades
  (`#B91C1C`, `#9A3412`, `#A21CAF`, `#6D28D9`, `#1D4ED8`, `#0F766E`, `#15803D`),
  every one ≥4.5:1 against white. The shared spine palette lives in
  `src/lib/spine.ts`.
- **Type.** **Bricolage Grotesque** (display — wonky, crafted; headings + brand
  only), **Figtree** (body/UI), **Space Mono** (ranks & scores — a
  "game-stats" numeral). All self-hosted via `@fontsource` (no external
  request — the app is used on the couch / LAN).

## Stack

- **Tailwind CSS v4** (via `@tailwindcss/vite`) for utilities.
- **DaisyUI v5** for themeable component classes (`btn`, `card`, `input`,
  `navbar`, `alert`, …) — chosen for fast, consistent, easily **re-themeable**
  components with a built-in theming system.
- **Storybook** to develop and document components in isolation.
- One global stylesheet, `src/app.css`, imports Tailwind and configures DaisyUI.

## Theming

- **Semantic tokens, not hard-coded colors.** Components use DaisyUI's semantic
  classes (`bg-base-100`, `text-base-content`, `btn-primary`, …) so a theme is
  just a set of token values — adding themes later is additive, no component
  changes.
- **Two custom themes, `light` and `dark`**, defined as `@plugin
  "daisyui/theme"` blocks in `src/app.css` (they override DaisyUI's stock
  light/dark rather than sitting alongside them, so the toggle/no-flash script
  need no change). `light` is `default`; `dark` is `prefersdark`. Both set the
  YARG palette plus a chunky radius scale (`--radius-box`/`-field`/`-selector`)
  for the playful, boxy feel. More themes later are just more blocks.
- **`data-theme` on `<html>`** selects the active theme. A no-flash inline
  script in `app.html` sets it before paint (saved choice in `localStorage`,
  else OS preference); a header **toggle** (`ThemeToggle.svelte`) flips and
  persists it.
- **Every theme must pass WCAG 2.1 AA contrast** — verified by the axe checks,
  which run against the active theme. This constrains the palette: spine and
  interactive fills carrying text use the AA-safe depth of each hue, and the
  ultra-bright box colours are reserved for the logo (no body text over them).

## Layout & components

- App shell: a sticky, translucent DaisyUI `navbar` — the `Logo` (`yarg`
  variant) as brand, Pools link, theme toggle, auth — with a thin box-spine
  colour stripe as a ruled bottom edge (the brand motif in miniature). Content
  sits in a centered, max-width reading column that stays comfortable on phone
  and desktop (the app is used on the couch).
- The **landing hero breaks out** of the reading column to full width so the
  headline and the demo spine-stack have room; ordinary views stay in-column.
- Shared components live in `src/lib/components/` (`Logo`, `ThemeToggle`,
  `PairwiseRanker`, `BggSearchAdd`, plus the deprecated `ManualRanker` — see
  Production Annotations); `Logo` and `ThemeToggle` have Storybook stories
  today, the others don't yet (also annotated below). The spine-stack motif is
  a component-layer pair of classes (`.spine` / `.spine-rank` in `app.css`)
  fed by the shared colour helper `src/lib/spine.ts`, so pairwise and manual
  rankings render it identically.
  Views compose these
  rather than repeating utility soup.

## Production Annotations

- **`ManualRanker` is deprecated but still shipped and still reachable.**
  Manual drag-to-order was removed as a list-creation option, but the render
  path is live: `src/routes/lists/[id]/+page.server.ts` still branches on
  `rankingMethod === 'manual'` and `+page.svelte` renders `ManualRanker`
  (`svelte-dnd-action`). No migration ever converted pre-deprecation rows, so
  any list created before the change still loads the drag view. Consequences
  while this holds: the component keeps the `svelte-dnd-action` dependency
  alive, and the drag interaction stays inside Principle VI's WCAG 2.1 AA
  release gate (constitution v2.1.1) — a flow a user can still land on must
  meet the bar even if it can no longer be created. Retiring it properly means
  a data migration plus deleting the component and the dependency; that is
  deferred to the `revisit-ranking-modes` rework.
- **Component library is still lean.** The brand and interaction primitives are
  extracted (`Logo`, `ThemeToggle`, `PairwiseRanker`, `ManualRanker`,
  `BggSearchAdd`, the `.spine` motif), but many views still compose DaisyUI
  classes directly (cards, forms, badges), and only `Logo`/`ThemeToggle` have
  Storybook stories so far. As shared patterns recur, extract them into
  `src/lib/components/` with Storybook stories rather than repeating class
  strings.
