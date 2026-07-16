# M4 Backend Asks — Cashier + Reports

Captured 2026-06-24 from the M4 backend audit pass; updated 2026-06-30 after
the cashier flow was repointed at `/treatment-plan` to match what the web
app already does. This document is retained for historical context
plus the unrelated carry-over items from M3 that still apply.

---

## ⚠️ Backend bug found in device QA (2026-07-13) — `/getPendingBills` returns 500

**Symptom:** the mobile "All Unpaid Bills" screen (and the web
`AllUnpaidBills.jsx`, same endpoint) fails with a server error. Mobile shows
a graceful "Couldn't load the unpaid bills. / Retry" — the failure is
server-side (confirmed 5xx via the client error mapping), not a client bug.

**Root cause:** `getPendingBills` (`views.py` ~3068) looks up each encounter's
patient without a `None` guard:

```python
for bill in all_pending_bills:
    patient = PatientRegistrationInfo.query.filter_by(id=bill.patientId).first()
    patient_full_name = f"{patient.name} {patient.father} {patient.family}"  # AttributeError if patient is None
    patient_phone_number = patient.phone
```

`/delete_patient` (`views.py:2205`) deletes the `PatientRegistrationInfo` row
but leaves the patient's `TreatmentEncounter` rows behind. So a **deleted
patient who had an outstanding balance** leaves an *orphaned* encounter — and
because there's no guard, that single orphan raises `AttributeError` and
**500s the entire list** (every unpaid bill fails to load, not just the bad
row).

**Fix (backend):**
1. Guard the loop so one bad row can't break the whole response:
   ```python
   for bill in all_pending_bills:
       patient = PatientRegistrationInfo.query.filter_by(id=bill.patientId).first()
       if not patient:
           continue  # skip orphaned encounters (patient was deleted)
       ...
   ```
2. Longer term, make `/delete_patient` clean up (or reassign) the patient's
   `TreatmentEncounter` rows, or block deleting a patient who still has an
   outstanding balance — otherwise orphans keep accumulating.

### Full crash-class sweep (device QA 2026-07-13)

A backend-wide sweep for the same pattern (a DB lookup dereferenced without an
`if not X:` guard, or `.strftime()`/`strptime()` on a nullable/missing value)
turned up more instances of the identical 500 defect. Grouped by priority.
All line numbers are approximate — search the route name.

**P1 — mobile-facing, fix first:**

| `views.py` | Route | Defect | Trigger |
|---|---|---|---|
| ~3082 | `getPendingBills` | `patient.name` on None | deleted patient w/ outstanding bill — **CONFIRMED live** |
| ~3130 | `getCurrentBills` | `bill.patient.name` on None | deleted patient w/ a *today* encounter → the cashier **"Patients in Clinic"** list 500s |
| ~3210 | `/bill/<id>` | `bill.statusDate.strftime()` on NULL | encounter with NULL `statusDate` |
| ~942 | `/patient/<id>/billing` | `proc.statusDate.strftime()` on NULL | same |
| ~2496 | `/register-patient` (edit path) | `registration.name = …` on None | editing a deleted/stale `registrationId` |
| ~2296 | `/init-procedure-screen` | `UserRole…first().id` on None | a role string with no matching row → Orders screen |
| ~2711, 2716 | `/encounter` (appt create/update) | `strptime(None)` / `isoparse(None)` | booking POST missing `date` / `start_iso` |

**Root cause of the orphaned rows:** `/delete_patient` (~2205) removes the
`PatientRegistrationInfo` row but not the patient's `TreatmentEncounter`,
`ReminderStored`, or `patient_documents` rows — those relationships have no
cascade in `models.py`. So deleting a patient who still has an outstanding
balance leaves an orphaned encounter that then crashes the two billing lists.
Fix: add `cascade="all, delete-orphan"` to those relationships (or delete the
children in the route), **or** block deleting a patient who still has an
outstanding balance.

**P2 — other 500s (not mobile-facing, but real):**

- `/delete-reminder` (~3238): unguarded delete of a non-existent reminder (and it's missing `@token_required`).
- `/whatsapp` inbound webhook (~1411 / ~1525): `store_chat_message(clinicId=…)` is called with a kwarg the function signature doesn't accept → **every inbound patient text 500s, so inbound chat is never stored** (broken feature).
- `/login` (~491): a request missing `email`/`password` 500s instead of returning a clean invalid-credentials response.
- `/add-user` (~2050), `/react` (~2256), `/system-change-pass` (~2155): unguarded `.first()` dereferences.
- `/register-patient` (~2451): `datetime.strptime(dob, …)` with no try/except → 500 on a malformed `dob`.

**Uniform fix:** after each lookup add `if not X: return jsonify({...}), 404/400`;
guard `.strftime()` with `... if X else None`; wrap date parsing in try/except;
add the delete cascades above.

**Non-crash note:** `/cancel-appt` (~3754) passes `user_id` to the push-target
helper where every other branch passes `clinic_id` — likely wrong push routing
on cancel (a logic bug, not a 500).

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
2. ~~**`POST /update-patient`**~~ — **not needed.** `/register-patient`
   already doubles as the edit route: pass `registrationId` and it updates
   the existing row and emits `patientEdited` (`views.py:2429`). Mobile edit
   is now wired to that and un-gated (verified on-device 2026-07-13). No
   backend work required. (Minor follow-up: `/registeredPatients` doesn't
   return `doctor_id`, so the edit form's Clinician can't pre-fill and must
   be re-picked — include `doctor_id` in that list to fix.)
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
