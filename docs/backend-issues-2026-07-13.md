# Smiles Craft — Backend Issues to Fix

**Prepared:** 13 July 2026 · **For:** the backend developer · **Component:** Flask API (`dental_clinic_26_02_2028/backend/views.py`)

## Summary

The reported **"All Unpaid Bills — couldn't load"** error is a **server-side (backend) bug, not the mobile app**. While diagnosing it we swept the rest of the backend and found a small class of the *same* defect in several endpoints — a couple of which also affect the app's cashier and appointment screens.

The mobile app is unaffected: it correctly shows a clean error and a Retry button instead of crashing. **All fixes below are backend-side.**

The common defect: a database lookup (`.query.filter_by(...).first()` / `.query.get(...)`) is used **without first checking the record exists**, or `.strftime()` is called on a date that can be empty. When the record is missing (e.g. a deleted patient) or the date is empty, the request raises an error → **HTTP 500**.

---

## 1. The reported issue — `/getPendingBills` (All Unpaid Bills)

**What happens:** the endpoint that lists every unpaid bill returns 500, so the whole list fails to load.

**Root cause:** it looks up each bill's patient and uses the patient's name without checking the patient still exists:

```python
for bill in all_pending_bills:
    patient = PatientRegistrationInfo.query.filter_by(id=bill.patientId).first()
    patient_full_name = f"{patient.name} {patient.father} {patient.family}"  # crashes if patient is None
    patient_phone_number = patient.phone
```

When a patient who still has an **unpaid balance** is **deleted**, their bill is left behind (see §3). That orphaned bill has no patient → `patient` is `None` → the whole endpoint crashes.

**Fix:** skip orphaned bills.

```python
for bill in all_pending_bills:
    patient = PatientRegistrationInfo.query.filter_by(id=bill.patientId).first()
    if not patient:
        continue
    ...
```

---

## 2. Priority 1 — same bug, in endpoints the app depends on

These have the identical pattern. Fix them the same way (guard the lookup, or guard the date). Line numbers are approximate — search for the route name.

| Route | Defect | When it fails |
|---|---|---|
| `getCurrentBills` (~3130) | uses `bill.patient.name` without a `None` check | **the cashier "Patients in Clinic" list** — crashes the moment a patient with a charge dated *today* is deleted |
| `/bill/<id>` (~3210) | `bill.statusDate.strftime(...)` on an empty date | bill detail, if an encounter has no status date |
| `/patient/<id>/billing` (~942) | same `.strftime(...)` on an empty date | patient billing history |
| `/register-patient` (edit path, ~2496) | `registration.name = ...` on a `None` record | editing a patient id that no longer exists |
| `/init-procedure-screen` (~2296) | `UserRole...first().id` on a `None` record | Orders screen, if a role has no matching row |
| `/encounter` (appt create/update, ~2711, 2716) | `strptime(None)` / `isoparse(None)` | a booking submitted without a date |

---

## 3. Root cause of the orphaned bills — `/delete_patient`

Deleting a patient (~line 2205) removes the patient record but **not** their related rows — treatment encounters, reminders, and documents have no delete-cascade in the data model. So a deleted patient who still owed money leaves an orphaned bill, which then crashes the two billing lists above.

**Fix (choose one):**
- Add `cascade="all, delete-orphan"` to the patient's `treatment_encounters`, `reminders`, and `patient_documents` relationships (so children are removed with the parent), **or**
- Block deleting a patient who still has an outstanding balance, **or**
- Delete/settle the child rows inside the `/delete_patient` route.

Cleaning up the existing orphaned bill(s) in the database will also make **All Unpaid Bills** load again immediately, even before the code fix ships.

---

## 4. Priority 2 — other backend errors (not app-facing, but real)

- **`/whatsapp` inbound webhook** (~1411 / ~1525): a helper is called with a parameter name it doesn't accept, so **every inbound patient WhatsApp message errors and is never saved.** (Broken feature — worth fixing.)
- **`/delete-reminder`** (~3238): deleting a reminder that doesn't exist errors; the route is also missing authentication.
- **`/login`** (~491): a request missing email/password returns a 500 instead of a clean "invalid credentials" response.
- **`/add-user`** (~2050), **`/react`** (~2256), **`/system-change-pass`** (~2155): same unguarded-lookup pattern.
- **`/register-patient`** (~2451): an invalid date of birth crashes instead of returning a validation error.
- Non-crash: **`/cancel-appt`** (~3754) sends the cancellation notification to the wrong target — likely a copy/paste of the wrong id.

---

## 5. The fix pattern (applies to all of the above)

1. After every lookup, guard it: `if not X: return jsonify({"status": "error", "message": "Not found"}), 404`
2. Guard date formatting: `value.strftime(...) if value else None`
3. Wrap date parsing in `try/except` and return a validation error on bad input.
4. Add delete-cascades (or block deletes) so orphaned rows stop being created.

None of this requires a schema change beyond the relationship cascade settings. Happy to walk through any item on a short call.
