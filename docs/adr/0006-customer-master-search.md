# ADR-0006 — Customer Master Search

**Date:** 2026-09-24
**Status:** Accepted

## Context

The customer master (`/customers`) displayed all customers with client-side sorting and pagination, but had no search capability. Agents with large customer lists had no way to quickly look up a customer by name, phone number, or email.

## Decision

Add a search bar to the customer master that filters by **name**, **phone**, and **email** (case-insensitive), with the following behaviour:

- **Client-side filtering** — the existing `GET /api/customers` endpoint is unchanged; filtering happens in the browser after fetch. Chosen because customer lists are small (bounded by tier limits, max a few hundred), so the overhead is negligible and avoids an API change.
- **300ms debounce** — avoids re-filtering on every keystroke while keeping results responsive.
- **Escape key clears** the search input.
- **Empty result state** — table with headers + message: "Tidak ada pelanggan yang cocok dengan '{query}'". Distinct from the "Belum ada pelanggan" empty state.
- **Pagination count** updates to reflect filtered results, not total.
- **Email column added** to the table (was stored but not displayed). Placed immediately after the Name column.

## Consequences

- No API changes required.
- Search is per-session (refreshing the page resets it) — acceptable for this use case.
- Future consideration: server-side search if customer list grows beyond ~500 rows.
