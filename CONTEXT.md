# Realprosys

KPR (Kredit Pemilikan Rumah — home mortgage) management system for property sales agents in Indonesia.

## Language

**KPR**:
Indonesia's standard home mortgage product. Buyers pay a down payment to the developer and the remainder is financed by a bank over a multi-year tenor with interest.
_Avoid_: Mortgage, loan, credit

**Scheme**:
A buyer's specific KPR application: a customer + product + payment plan + booking date. On creation it generates a full payment schedule (non-KPR stages as one-time payments, KPR as monthly amortisation rows). Stored as JSON in Postgres.
_Avoid_: Application, order, transaction

**PaymentPlan**:
A reusable template of payment stages defined by the sales agent. One plan can be reused across many schemes.
_Avoid_: Payment template, pricing plan

**PaymentStage**:
A single step in a PaymentPlan. Has a `stage_type` (e.g. DOWN_PAYMENT, KPR), an `amount_type` (PERCENTAGE or FIXED), a `stage_value`, and `interval_months` before it is due. Exactly one stage must have `stage_type = "KPR"`.
_Avoid_: Payment step, installment step, tranche

**Product**:
A house or unit for sale, belonging to a Project. Has a price, land area, building area, and bedroom/bathroom counts.
_Avoid_: Property, unit, house unit

**Project**:
A housing development (real estate development), containing one or more Products. Named with a location.
_Avoid_: Development, estate

**Customer**:
A person who applies for KPR financing to purchase a Product.
_Avoid_: Client, buyer, applicant

**Schedule**:
The computed payment timeline produced when a Scheme is created. Contains the house price, per-stage rows (non-KPR as one-time payments, KPR as monthly amortisation with principal/interest split), and summary fields `kprAmount` and `kprMonthlyPayment`.
_Avoid_: Payment plan (conflicts with PaymentPlan), timeline, amortization table
