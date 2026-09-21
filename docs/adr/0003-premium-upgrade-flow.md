# ADR-0003: Premium Upgrade Flow — Self-Service Manual Payment

**Date**: 2026-09-21
**Status**: **Superseded by ADR-0004**
**Deciders**: Tikidata Analytics / Hermes Agent

## Decision

The premium upgrade flow follows a **self-service manual payment** model:

1. Free user hits a resource limit → sees "Upgrade ke Premium" prompt in the amber warning banner
2. User navigates to their **profile page** (`/profile`) and clicks upgrade
3. System presents payment instructions (manual transfer to rekening/nomor rekening — Indonesia-native)
4. User transfers, then sends proof of payment (chat/Telegram to webmaster)
5. **Webmaster confirms** payment via the `/config` panel (or directly in the database)
6. User's `tier` flips from `'free'` to `'premium'` — limits upgrade immediately

## Alternatives considered

**Self-service auto-payment (Midtrans/Xendit)**
More polished but requires merchant account setup, integration work, and per-transaction fees. Deferred until volume justifies it.

**Email/manual request to webmaster**
User emails inetvmart → webmaster manually upgrades in DB. Works but creates a support bottleneck and requires the user to find contact info.

## Key design constraints

- Upgrade UI lives in **profile page** (`/profile`), not a separate page or modal
- Payment method: **manual transfer** (no payment gateway integration for now)
- Webmaster marks tier change — no self-serve tier flip without human confirmation
- Premium upgrade does NOT yet change role (role stays `'user'`; only tier changes to `'premium'`)

## Deferred

- Automated payment confirmation (Midtrans/Xendit callback)
- Payment proof upload/upload workflow in-app
- Upgrade expiry / subscription billing
- Webmaster view of pending upgrade requests
