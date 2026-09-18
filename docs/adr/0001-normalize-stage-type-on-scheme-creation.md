# Normalize stage_type and amount_type to uppercase on scheme creation

Payment plan stages have their `stage_type` and `amount_type` stored as unconstrained VARCHAR. A case mismatch like `"kpr"` instead of `"KPR"` was silently treated as a non-KPR stage — the scheme saved with `kprAmount > 0` and `kprMonthlyPayment = 0` but zero KPR schedule rows, with no error surfaced to the user.

## Decision

Normalize both fields to uppercase with trim on scheme creation (`stageType.toUpperCase()` / `amountType.toUpperCase()`). This makes the comparison case-insensitive, so `"kpr"`, `"KPR"`, and `"Kpr"` are all treated as KPR.

A future ADR will address adding a proper enum constraint at the database level for `payment_stages.stage_type` and `payment_stages.amount_type` to catch this class of error earlier.
