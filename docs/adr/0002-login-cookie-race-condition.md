# ADR-0002: Login Cookie Race Condition

**Date**: 2026-09-18
**Status**: Accepted
**Deciders**: Tikidata Analytics

## Context

Users could not log in to production (`realprosys.vercel.app`). The login API
(`POST /api/auth/login`) returned HTTP 200 with a valid `Set-Cookie` header, but
the browser deleted the cookie immediately after it appeared. The Network tab
showed **no** request to `/api/auth/login` — only a 307 redirect from `/dashboard`
back to `/login`.

The cookie used correct attributes (`Secure; HttpOnly; SameSite=lax`), and the
API itself was confirmed working via curl and browser console `fetch()`.

## Problem

`app/login/page.tsx` used **hard navigation** after a successful login:

```tsx
window.location.href = "/dashboard";
```

This immediately triggers a page navigation before the browser has finished
settling the `Secure; HttpOnly` cookie into storage. The middleware on the
subsequent `/dashboard` request sees no cookie and redirects back to `/login`,
creating a loop where the user never authenticates.

## Decision

Replace hard navigation with Next.js client-side navigation:

```tsx
router.push("/dashboard");
```

`router.push()` is a soft navigation — it does not cancel the current request
cycle, allowing the browser to finalize cookie storage before the next request
is made.

## Consequences

- Login flow works correctly on production
- No server-side change required
- `SameSite=Lax` is preserved (correct for same-origin navigation)
