---
name: design
status: draft
last_updated: 2026-07-12
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
  rankings, manual drag-order). This is where colour and boldness are spent;
  everything else stays quiet.
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
- **Light + dark now**, more themes later. `light` is the default; `dark`
  applies on OS preference or an explicit choice.
- **`data-theme` on `<html>`** selects the active theme. A no-flash inline
  script in `app.html` sets it before paint (saved choice in `localStorage`,
  else OS preference); a header **toggle** flips and persists it.
- **Every theme must pass WCAG 2.1 AA contrast** — verified by the axe checks,
  which run against the active theme.

## Layout & components

- App shell: a DaisyUI `navbar` (brand, Pools link, theme toggle, auth) over a
  centered, max-width content column that stays comfortable on phone and
  desktop (the app is used on the couch).
- Shared components live in `src/lib/components/` and are documented in
  Storybook; views compose them rather than repeating utility soup.

## Production Annotations

- **Component library is thin.** Views mostly compose DaisyUI classes directly
  rather than bespoke wrapped components (only `ThemeToggle` is extracted so
  far). As shared patterns recur, extract them into `src/lib/components/` with
  Storybook stories rather than repeating class strings.
