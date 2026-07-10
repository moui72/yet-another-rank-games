# `lib/server`

Server-only modules — SvelteKit never bundles anything under `$lib/server`
into client code. The Supabase client/DB access, the BGG `xmlapi2` client, the
import worker logic, and auth/ownership helpers live here (Phases 1–2).

Entry points (`hooks.server.ts`, route handlers, the worker entry) only
construct and wire these dependencies; the logic itself stays in focused
modules (constitution Principle XV).
