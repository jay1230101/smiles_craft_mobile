# M4 Backend Asks — Cashier + Reports

Captured 2026-06-24 from the M4 backend audit pass; updated 2026-06-30 after
the cashier flow was repointed at `/treatment-plan` to match what the web
app already does. **There are no remaining M4 backend asks for the cashier
or reports surfaces.** This document is retained for historical context
plus the unrelated carry-over items from M3 that still apply.

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

## ~~New route required for M4~~ — withdrawn 2026-06-30

The original ask was a new `POST /record-payment` route, written under the
assumption that calling `/treatment-plan` for the cashier flow would force
a new encounter row alongside the payment.

A second read of `views.py:3684-3711` showed that the payment block on
`/treatment-plan` runs independently of the `inProcessStatus` and
`procedures` branches — sending both as empty arrays applies the payment
without inserting any new encounter. This is exactly what the web app's
`frontend/src/pages/BillDetails.jsx` already does today.

Mobile has been repointed to `POST /treatment-plan` with the same
empty-array payload shape the web sends. **No backend work required** for
the cashier flow to ship. The receipt object is synthesized client-side in
`api/billing.ts` from the bill detail the cashier screen already holds.

---

## Carry-overs from M3 that still need to ship

These three remain on the backend punch list — repeated here so the M3
+ M4 backend asks are visible in one place when planning the next sprint:

1. **`POST /confirm-appt { bookingId }`** — manual appointment confirm
   button. UI already in popover, disabled with helper text.
2. **`POST /update-patient { id, name, family, dob?, phone, gender?,
   allergy?, doctor }`** — patient edit on mobile. UI already disabled
   with helper text.
3. ~~**Push-notification stack**~~ — shipped upstream on 2026-07-01.
   `POST /register-device-token` (`views.py:4844`) + `POST /unregister-device-token`
   (`views.py:4874`), the `DeviceToken` table (migration
   `4adea41d406a`), `send_push_notification` Celery task via Expo Push
   (`backend/tasks.py:1333`), and firing sites at all four agreed
   events (rescheduled / staff-cancel / WA-confirm / WA-cancel).
   Mobile scaffolding lives in `lib/push-notifications.ts` and
   `lib/push-bridge.tsx`; runs on real devices only, best-effort
   register on login, unregister on logout.

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
