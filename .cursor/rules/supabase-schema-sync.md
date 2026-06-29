---
description: Keep app code in sync with live Supabase schema, RLS, and RPCs before deploy
globs: supabase/**,src/**/*Api.js,src/lib/**,src/hooks/useAuth.js,src/hooks/useSquadNotifications.js
alwaysApply: false
---

# Supabase schema sync

**RULE:** Never ship app code that references a database column, table, RPC, or policy that doesn't yet exist in the live Supabase database. This repo deploys the frontend (GitHub Pages) and the database (Supabase) separately, so any mismatch ships a silent production bug.

Two failure signatures to prevent:

- **PGRST204** — `Could not find the 'X' column ... in the schema cache` → 400
- **42501** — `new row violates row-level security policy` → 400/401

## On every change that touches Supabase reads/writes

### 1. Schema first

If you add or change any `.from("table").insert/upsert/select/update`, `.rpc("fn")`, or a new column/field in a payload, first add or update the matching SQL in `supabase/`.

Follow the existing convention: **one new idempotent file per change** (e.g. `supabase/profile_names.sql`), not edits to `schema.sql`. Use:

- `add column if not exists`
- `create table if not exists`
- `drop policy if exists` + `create policy`

End column/policy changes with:

```sql
notify pgrst, 'reload schema';
```

### 2. Payload ⊆ schema

Every key in an insert/upsert object must be a real column in that table's SQL. Before finishing, list the payload keys and confirm each one exists in the corresponding `supabase/*.sql` file.

**Also update `scripts/schema-manifest.json` in the same commit** — CI runs `npm run verify:schema` before build and blocks deploy when the live DB is behind the manifest.

### 3. RLS for upserts

Any client upsert (`INSERT ... ON CONFLICT`) needs **SELECT** visibility of its **own** row, or it fails with 42501 — an INSERT/UPDATE policy alone is not enough.

When a table's SELECT is admin-only or restricted, add an owner-scoped read policy:

```sql
for select using (athlete_id = auth.uid())
```

(or the table's owner column). Never "fix" this by opening SELECT to everyone.

### 4. State the migration step

Because applying SQL to the live project is a manual step, end any DB-touching change with an explicit, copy-pasteable note:

> ⚠️ Run `supabase/<file>.sql` in the Supabase SQL Editor before/at deploy — app code in this change depends on it.

Do not consider the task done until that's called out.

### 5. Don't silently catch/ignore Supabase write errors

If an insert/upsert/rpc can fail, log `error.code` + `error.message` so PGRST204 / 42501 surface instead of hiding.

## When unsure

If unsure whether the live DB already has a column/policy, say so and ask the user to check rather than assuming it exists.
