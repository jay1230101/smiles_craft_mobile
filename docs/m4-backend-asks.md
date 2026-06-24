# M4 Backend Asks — Cashier + Reports

Captured 2026-06-24 from the M4 backend audit pass. The mobile Cashier and
Reports surfaces are fully built and wired to the existing live endpoints
catalogued below. One new route is required on the backend before payment
recording can be enabled in the live build.

---

## Endpoints already implemented (no work required)

The mobile build calls these as-is. Audit confirmed paths, methods, and
response shapes against `views.py` in `dental_clinic_26_02_2028`.

| # | Path | Method | Source | Purpose |
|---|------|--------|--------|---------|
| 1 | `/getCurrentBills` | GET | `views.py:2894` | Cashier queue — today's patients with outstanding charges, role-aware |
| 2 | `/bill/<int:patient_id>` | GET | `views.py:2930` | Per-patient bill detail: encounters + totals + latest bill number |
| 3 | `/patient/<int:patient_id>/billing` | GET | `views.py:915` | Alternative billing history view per patient |
| 4 | `/getReports` | GET | `views.py:3417` | List of available report types `[{id, name}]` |
| 5 | `/reports?report=<id>&periods=<csv>` | GET | `views.py:4027` | Report data — branches on report id (income / revenue / cancellation) |
| 6 | `/getPeriods` | GET | `views.py:3427` | YYYY-MM period options derived from encounter + booking dates |

All six require `@token_required`.

---

## New route required for M4

### `POST /record-payment`

**Why mobile needs it:** The web app records payment inside
`POST /treatment-plan` (`views.py:3550`), which is an atomic
"create treatment + apply payment" operation. The cashier flow on mobile
collects payment against an **existing** bill without creating a new
encounter — calling `/treatment-plan` is the wrong primitive because it
forces an encounter row to be inserted alongside the payment.

**Contract:**

```
POST /record-payment
Auth: @token_required
Body:
{
  "patient_id": int,
  "billID":     [int],       // encounter ids being paid against
  "amountPaid": float,
  "method":     "cash" | "card" | "bank_transfer" | "other"  (optional)
}

Response:
{
  "status": "success" | "error",
  "message": string?,
  "remaining_balance": float,           // patient's total remaining after payment
  "receipt": {
    "receiptNumber":    string,
    "date":             string (ISO),
    "patient":          { id, name, family, phone },
    "lineItems":        [{ procedure, toothNumber?, amount }],
    "amountPaid":       float,
    "remainingBalance": float,
    "currency":         string
  }
}
```

**Implementation guidance (mirroring `/treatment-plan` payment block):**

1. Validate `patient_id`, JWT-derived `clinic_id` ownership.
2. Load each `TreatmentEncounter` in `billID` for this clinic+patient.
3. Apply the standard payment-application algorithm:
   - Walk encounters in `billID` order.
   - For each: `applied = min(remaining_balance, amount_remaining)`; bump
     `amountPaid += applied`; subtract from the working amount.
   - If any amount is left over after all encounters are paid off, return
     `status: error, message: "Amount exceeds outstanding balance"` and
     rollback the transaction.
4. Commit, then build a receipt object with `receiptNumber` formatted
   consistently with the web cashier (suggest `RCT-<billSequenceNumber>-<ts>`).
5. Emit `paymentRecorded` on `clinic_<clinic_id>` so other open tabs (and
   the mobile calendar) can refresh their cached totals.

**Status on mobile:** Hook + UI fully built (`hooks/use-record-payment.ts`,
`app/record-payment.tsx`). In non-demo builds the submit button is
disabled with helper text "Payment recording becomes active with the next
backend update." Once this route ships, flip the gate off and the live
flow works end-to-end.

---

## Carry-overs from M3 that still need to ship

These three remain on the backend punch list — repeated here so the M3
+ M4 backend asks are visible in one place when planning the next sprint:

1. **`POST /confirm-appt { bookingId }`** — manual appointment confirm
   button. UI already in popover, disabled with helper text.
2. **`POST /update-patient { id, name, family, dob?, phone, gender?,
   allergy?, doctor }`** — patient edit on mobile. UI already disabled
   with helper text.
3. **Push-notification stack** — `POST /register-device-token` +
   Celery task wired alongside existing socket emits. Implementation
   guide already delivered (`docs/backend-guide-push-notifications.pdf`).

---

## Reports endpoint quirks worth flagging

For the backend team — these came up in the audit and may be worth
documenting on the backend side too:

- **Two-call pattern for reports.** The list endpoint is `/getReports`
  (returns `[{id, name}]`) but the data endpoint is `/reports`, not
  `/getReports`. Easy to mis-route on a client that hasn't read the code.
- **Response shape branches on report id.** `/reports?report=1` returns an
  income-statement shape; `report=2` returns a revenue-by-clinician shape;
  `report=3` returns a cancellation shape. Field naming differs across
  branches (e.g. `Total_cancellations` with a capital T). Mobile models all
  three discriminated by the top-level `report` string.
- **Periods param is a comma-separated CSV**, not a JSON array. Empty /
  omitted = all periods.
- **`/getCurrentBills` filters to today only.** If the client ever asks for
  a "show all outstanding (not just today)" view, `/getPendingBills`
  (`views.py:2860`) already exposes that — useful to know.
