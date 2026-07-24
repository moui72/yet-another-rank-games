---
status: open
created: 2026-07-24
plan: null
---

# Feedback

## Bugs

- [ ] F001 `copyShareLink` (`src/routes/lists/[id]/+page.svelte`) has no
  try/catch around `navigator.clipboard.writeText` — a rejected clipboard
  write (permission denied, insecure context, etc.) silently no-ops with no
  error feedback to the user; they see nothing happen and no explanation.
  [artifacts: ui]
- [ ] F002 `e2e/sharing.spec.ts`'s copy-link test doesn't grant clipboard
  permissions to its Playwright context, so it may be exercising a
  false-positive path (passing without genuinely proving the clipboard write
  succeeded) rather than a reliable regression check.
