---
name: design
status: draft
last_updated: 2026-07-11
---

# Visual Design

The constitution's north star is **fun UX** (Principle III), and the bar is
**WCAG 2.1 AA in every theme** (Principle VI). The UI was built functional- and
accessibility-first; this artifact defines the visual layer added on top.

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
