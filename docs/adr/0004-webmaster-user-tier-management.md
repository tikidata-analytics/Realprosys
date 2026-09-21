# ADR-0004: Webmaster-Managed User Tier Changes

**Date**: 2026-09-21
**Status**: **Superseded by ADR-0005**
**Deciders**: Tikidata Analytics / Hermes Agent

## Context

Free users hit resource limits and need premium to create more. The full self-service upgrade flow (payment gateway, proof upload) was deferred. Meanwhile, inetvmart@gmail.com (the webmaster) handles upgrade requests manually via chat/Telegram. The `/config` panel existed only for editing tier limits — not for changing a user's tier.

## Decision

The `/config` panel gains a **User Management** section:

1. **Search**: webmaster types a user's email or username; matching user(s) appear as clickable results
2. **Select**: clicking a result opens the user's current tier display
3. **Change**: dropdown to switch tier (`free` ↔ `premium`); optionally also role (`user` ↔ `webmaster` — for emergencies only)
4. **Audit**: every tier/role change is logged to a `tier_changes` table

## Alternatives considered

**No audit log**: direct UPDATE, no record. Rejected because disputes ("kok tiba-tiba turun ke free?") need a paper trail.

**Table of all users**: shows every user with inline tier dropdowns. Simpler than search but scales poorly and exposes all user emails to the UI. Search is more targeted.

## Consequences

- Webmaster is the sole actor who can change tier — no self-serve
- Every tier change is auditable: user, from_tier, to_tier, changed_by, changed_at
- `tier_changes` table must be migrated before this feature ships
