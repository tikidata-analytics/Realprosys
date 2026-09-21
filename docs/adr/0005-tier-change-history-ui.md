# ADR-0005: Tier Change History Audit Log UI

**Date**: 2026-09-21
**Status**: Accepted
**Deciders**: Tikidata Analytics / Hermes Agent

## Context

ADR-0004 introduced a `tier_changes` audit table to record every tier/role change made by the webmaster. The table exists but has no UI — the webmaster must query the database directly to see history. We need a proper interface.

## Decision

The `/config` page gains a third tab: **"Riwayat Tier"** (Tier History).

### Data shown per row

- **User** — email + username of the affected user
- **Perubahan** — from `free → premium` or `premium → free`, or role changes `user → webmaster`
- **Oleh** — email of the webmaster who made the change
- **Waktu** — timestamp of the change

### Filters

- **By user** — search/filter by the affected user's email
- **By action** — dropdown: Semua / Upgrade (free→premium) / Downgrade (premium→free)

### Access

- Webmaster only; non-webmaster redirected to `/dashboard`

## Consequences

- The `tier_changes` table's `from_role` / `to_role` fields are displayed when a role change occurred alongside a tier change
- No pagination yet — if history grows large (100+ rows), pagination can be added later
