#!/bin/bash
# Regression test: stage_type "kpr" vs "KPR" must not silently skip KPR processing
# Run from repo root: bash tests/stage-type-typo-regression.sh
set -e

BASE="http://localhost:3000"
COOKIES="/tmp/test_scheme_cookies_$$.txt"
trap "rm -f $COOKIES" EXIT

echo "=== REGRESSION: stage_type typo must not silently skip KPR ==="

# 1. Register + login
EMAIL="regression_test_$(date +%s)@test.com"
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Regression Test\",\"email\":\"$EMAIL\",\"password\":\"TestPass123!\"}" > /dev/null

curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123!\"}" \
  -c "$COOKIES" -b "$COOKIES" > /dev/null

# 2. Create project, product, customer
PROJECT=$(curl -s -X POST "$BASE/api/projects" \
  -H "Content-Type: application/json" -b "$COOKIES" \
  -d '{"name":"Regression Project","location":"Test City"}')
PROJECT_ID=$(echo $PROJECT | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

PRODUCT=$(curl -s -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" -b "$COOKIES" \
  -d "{\"name\":\"Test House\",\"type\":\"RUMAH\",\"price\":1000000000,\"project_id\":\"$PROJECT_ID\",\"land_area\":100,\"building_area\":72,\"bedrooms\":2,\"bathrooms\":1}")
PRODUCT_ID=$(echo $PRODUCT | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

CUSTOMER=$(curl -s -X POST "$BASE/api/customers" \
  -H "Content-Type: application/json" -b "$COOKIES" \
  -d '{"name":"Test Customer","email":"tc@test.com"}')
CUSTOMER_ID=$(echo $CUSTOMER | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 3. Create plan with TYPO in stage_type ("kpr" lowercase)
PLAN_TYPO=$(curl -s -X POST "$BASE/api/payment-plans" \
  -H "Content-Type: application/json" -b "$COOKIES" \
  -d '{
    "name": "Plan With Typo",
    "stages": [
      {"stage_type": "DOWN_PAYMENT", "stage_order": 0, "amount_type": "PERCENTAGE", "stage_value": 10, "interval_months": 0},
      {"stage_type": "kpr", "stage_order": 1, "amount_type": "PERCENTAGE", "stage_value": 8.5, "interval_months": 20}
    ]
  }')
PLAN_TYPO_ID=$(echo $PLAN_TYPO | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 4. Create scheme with typo plan → THE BUG CASE
SCHEME_TYPO=$(curl -s -X POST "$BASE/api/schemes" \
  -H "Content-Type: application/json" -b "$COOKIES" \
  -d "{
    \"name\": \"Scheme Typo Test\",
    \"customer_id\": \"$CUSTOMER_ID\",
    \"product_id\": \"$PRODUCT_ID\",
    \"payment_plan_id\": \"$PLAN_TYPO_ID\",
    \"booking_date\": \"2025-01-01\"
  }")

# 5. Parse result
SCHEDULE=$(echo "$SCHEME_TYPO" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sched = data.get('schedule', {})
kpr_rows = [s for s in sched.get('stages', []) if s.get('is_kpr')]
non_kpr_rows = [s for s in sched.get('stages', []) if not s.get('is_kpr')]
print('HOUSE_PRICE:', sched.get('housePrice'))
print('KPR_AMOUNT:', sched.get('kprAmount'))
print('KPR_MONTHLY:', sched.get('kprMonthlyPayment'))
print('KPR_ROWS:', len(kpr_rows))
print('NON_KPR_ROWS:', len(non_kpr_rows))
print('HAS_ERROR:', 'error' in data)
")

echo "$SCHEDULE"

# Assertions
echo ""
echo "--- ASSERTIONS ---"

HOUSE_PRICE=$(echo "$SCHEDULE" | grep 'HOUSE_PRICE:' | awk '{print $2}')
KPR_AMOUNT=$(echo "$SCHEDULE" | grep 'KPR_AMOUNT:' | awk '{print $2}')
KPR_MONTHLY=$(echo "$SCHEDULE" | grep 'KPR_MONTHLY:' | awk '{print $2}')
KPR_ROWS=$(echo "$SCHEDULE" | grep 'KPR_ROWS:' | awk '{print $2}')
NON_KPR_ROWS=$(echo "$SCHEDULE" | grep 'NON_KPR_ROWS:' | awk '{print $2}')
HAS_ERROR=$(echo "$SCHEDULE" | grep 'HAS_ERROR:' | awk '{print $2}')

ERRORS=0

# BUG: With typo "kpr", the scheme saves but has 0 KPR rows and kprAmount > 0
# Expected: either error thrown, OR kprAmount = 0 (no KPR stage detected → treated as regular cost)
# The current buggy behavior: kprAmount=815000000, kprMonthly=0, kprRows=0

if [ "$HAS_ERROR" = "False" ] && [ "$KPR_AMOUNT" -gt 0 ] && [ "$KPR_ROWS" -eq 0 ]; then
  echo "FAIL: Bug reproduced — typo stage_type='kpr' silently skipped KPR processing."
  echo "      kprAmount=$KPR_AMOUNT but kprRows=0 — schedule is invalid!"
  ERRORS=$((ERRORS + 1))
fi

if [ "$HAS_ERROR" = "True" ]; then
  echo "PASS: API correctly rejected the typo stage_type (error returned)"
fi

# Correct plan should produce KPR rows
PLAN_OK=$(curl -s -X POST "$BASE/api/payment-plans" \
  -H "Content-Type: application/json" -b "$COOKIES" \
  -d '{
    "name": "Plan Correct",
    "stages": [
      {"stage_type": "DOWN_PAYMENT", "stage_order": 0, "amount_type": "PERCENTAGE", "stage_value": 10, "interval_months": 0},
      {"stage_type": "KPR", "stage_order": 1, "amount_type": "PERCENTAGE", "stage_value": 8.5, "interval_months": 20}
    ]
  }')
PLAN_OK_ID=$(echo $PLAN_OK | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

SCHEME_OK=$(curl -s -X POST "$BASE/api/schemes" \
  -H "Content-Type: application/json" -b "$COOKIES" \
  -d "{
    \"name\": \"Scheme Correct Test\",
    \"customer_id\": \"$CUSTOMER_ID\",
    \"product_id\": \"$PRODUCT_ID\",
    \"payment_plan_id\": \"$PLAN_OK_ID\",
    \"booking_date\": \"2025-01-01\"
  }")

KPR_ROWS_OK=$(echo "$SCHEME_OK" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sched = data.get('schedule', {})
kpr_rows = [s for s in sched.get('stages', []) if s.get('is_kpr')]
print(len(kpr_rows))
" 2>/dev/null || echo "0")

if [ "$KPR_ROWS_OK" -gt 0 ]; then
  echo "PASS: Correct 'KPR' stage_type produces $KPR_ROWS_OK KPR rows (baseline verified)"
else
  echo "FAIL: Correct 'KPR' stage_type produced 0 KPR rows — baseline broken"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "=== ALL CHECKS PASSED ==="
  exit 0
else
  echo "=== $ERRORS CHECK(S) FAILED ==="
  exit 1
fi
