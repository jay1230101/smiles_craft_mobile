# M3 Live Build — Client Feedback 2026-06-24

Captured from the client's testing of the live-backend APK shipped 2026-06-23
(commit `47561c9 feat(m3): live backend wiring, mapped-doctors booking, new
appointment screen`). This is a separate feedback round from the M3 v1.2.0
review on 2026-06-19 — those items were against the demo-mode build; these
are against the live backend.

Build identifier: develop branch, commit 47561c9 (live mode, DEMO_MODE off).

---

## Section 1 — Bugs (blockers / data correctness)

### LB1. Clinician name + age not visible after patient registration
- **Reproduce:** Register a patient with DOB and clinician selected → save →
  open the new card in the Register list → clinician name and age are missing.
- **Severity:** High — the data was entered but is invisible to the user, so
  it looks like the registration partially failed.
- **Root cause confirmed (2026-06-24):**
  1. **Age**: Backend stores DOB as `DD-Month-YYYY` (e.g. `14-August-1990`)
     via `strftime("%d-%B-%Y")` in `views.py:2318`. The mobile patient-card
     used `new Date(dob)`, which returns Invalid Date on this format — so
     every live patient renders Age as "—". **Fixed on mobile** by parsing
     both `YYYY-MM-DD` and `DD-Month-YYYY` in `parseDob`.
  2. **Clinician**: Backend stores `doctor_id` on `PatientRegistrationInfo`
     (`models.py:233`) but **`/registeredPatients` does NOT return it**
     (`views.py:2069-2079` only returns id/name/family/father/dob/phone/
     gender/email/allergy). Without `doctor_id` or `doctor_name` in the
     response, mobile cannot render the Clinician cell — **requires
     backend update.**
- **Backend ask added** — see "Backend asks added 2026-06-24" below.
- **Scope:** mobile fix in `components/patient-card.tsx` (age parsing).
  Clinician is blocked on backend.

### LB2. Booking on a doctor's column doesn't show in that doctor's filter
- **Reproduce:** On the calendar with "All Doctors" selected, switch to
  Dr. Nelly's filter — empty. Switch back to All Doctors — appointment is
  there. Reproduces only for appointments booked through the mobile new
  appointment screen.
- **Severity:** High — booked appointments effectively disappear when the
  user filters by clinician, which is the normal workflow.
- **Likely root cause:** New-appointment payload sends a `doctor_id` that
  doesn't match the `resourceId` the calendar uses to filter. Two possible
  flavors:
  1. The form defaults to an "All doctors" sentinel or to the first item
     in the mapped-doctors list rather than the doctor column the user was
     on when they tapped the slot.
  2. The `/encounter` payload writes a different doctor field than the one
     `/getAllEvents` returns as `resourceId`.
- **Scope:** `app/appointment-new.tsx`, `store/new-appointment.ts`,
  `hooks/use-create-appointment.ts`, `api/appointments.ts`,
  `app/(tabs)/calendar.tsx` (slot-tap context flow).

### LB3. Editing appointment time still not reflected on the calendar
- **Reproduce:** Open popover → Edit / Reschedule → change Start time and End
  time → Save → calendar still shows the old slot.
- **Severity:** High — re-raises B1 from the 2026-06-19 feedback. The M3.1
  fix was supposed to invalidate the calendar query on `/encounter` success;
  either the invalidation isn't firing or the socket `updateAppointment`
  payload isn't being merged into the cache.
- **Scope:** `hooks/use-update-appointment.ts`, `hooks/use-socket-events.ts`,
  `api/appointments.ts`.

---

## Section 2 — UX corrections (single-doctor clinics)

The client's clinic currently has one mapped doctor. The mobile UI exposes
multi-doctor affordances (a Select dropdown, an "All Doctors" toggle) which
add friction when the answer is always the same.

### LU1. Patient Registration — Clinician field
- When `clinic_doctors` returns exactly one doctor, render the Clinician
  field as a **read-only text input** prefilled with that doctor's name —
  NOT a Select dropdown. With multiple doctors, keep the Select.
- **Scope:** `app/patient-register.tsx`, possibly the Select component if a
  read-only variant doesn't exist yet.

### LU2. New Appointment — Clinician field + label
- Rename the field label from "Doctor" to **"Clinician"** to match the rest
  of the app (Registration uses Clinician; only this screen is inconsistent).
- Apply the same single-doctor rule from LU1: render as a read-only text
  input when `getc_mapped` returns exactly one doctor.
- **Scope:** `app/appointment-new.tsx`.

### LU3. Calendar / Home — drop "All Doctors" when there's only one
- The doctor picker on Calendar and Home currently always includes an
  "All Doctors" chip. When the clinic has exactly one mapped doctor, hide
  the picker entirely (or just render the single doctor's name as a static
  label). The "All Doctors" / per-doctor toggle becomes pointless.
- **Scope:** `components/doctor-picker.tsx`, `app/(tabs)/calendar.tsx`,
  `app/(tabs)/(home)/index.tsx`.

### LU4. Cancel Appointment — bottom buttons sit too low
- Same family as B3 from 2026-06-19, but specifically on the cancel
  appointment dialog/popover. The Cancel/Confirm actions sit too close to
  the bottom edge — move them up a notch (more bottom padding or insets +
  spacing).
- **Scope:** `components/confirm-dialog.tsx` and/or `components/appointment-popover.tsx`
  depending on where the cancel action lives.

---

## Section 3 — Feature changes (Treatment & Orders)

### LF1. Pending procedures — add **Status Update** select
- The web app shows a status update control on each pending procedure row.
  The doctor picks "still in process" or "completed" from a Select. This
  control is missing on mobile.
- **Severity:** High — the doctor cannot move a procedure through its
  clinical lifecycle without falling back to the web app, which negates
  the point of the mobile build.
- **Scope:**
  - Web reference: confirm option labels and the backend route that handles
    the transition (likely something like `POST /update-procedure-status`
    or a status field on the existing `/treatment-plan` route).
  - Mobile: add the Select to the pending procedure row in `app/orders.tsx`;
    wire a new hook for the status mutation.

### LF2. Orders row layout — drop the standalone Discount column
- Currently a procedure row shows Procedure, Tooth, Price, Discount, Net,
  Delete. Net already reflects (Price − Discount), so the standalone
  Discount column is redundant. Keep Price, Net, and Delete; remove
  Discount column. (Discount is still set during procedure addition, just
  not surfaced in the in-progress row.)
- **Scope:** `app/orders.tsx` (the in-progress / in-process list row).

---

## Section 4 — Feature additions (calendar)

### LN1. Drag-and-drop appointments on the calendar
- Allow the user to drag an appointment from one slot to another to
  reschedule. Was filed as N1 (phase-2 backlog) on 2026-06-19; client is
  now asking for it inside this milestone.
- **Severity:** Medium — convenience, but the workaround (Edit /
  Reschedule modal) is broken too (LB3 above), so functionally the user
  has no working reschedule path. Either LB3 must be fixed AND drag-drop
  added, or LB3 fix alone may satisfy until drag-drop ships separately.
- **Scope:** `app/(tabs)/calendar.tsx`, plus the gesture/long-press
  recognizer; backend write goes through the same `/encounter` route as
  Edit Reschedule.

---

## Backend asks added 2026-06-24

These join the carry-over backend asks from `m3-client-feedback-2026-06-19.md`
section 3, and the M4 asks in `m4-backend-asks.md`. Raise at the next
backend meeting.

### BA-2026-06-24-A. Surface `doctor_id` + `doctor_name` on `/registeredPatients`
- **Why:** Mobile shows `Clinician` as `—` for every patient because the
  list endpoint omits the doctor. The data exists on the row
  (`PatientRegistrationInfo.doctor_id`, `models.py:233`) and is set
  during registration (`views.py:2275`) — only the GET serializer doesn't
  include it.
- **Patch:** In `views.py:2069`, augment the dict with `doctor_id` and a
  joined `doctor_name` (lookup `User` by id, format as the rest of the
  app does — e.g. `f"Dr. {user.user_name}"`). Same change should land on
  `/search-patient` (`views.py:982`) so the mobile new-appointment screen's
  patient picker can show the doctor too.
- **Returns:** Add to the existing dict, don't reshape:
  ```python
  doctor = User.query.filter_by(id=p.doctor_id).first() if p.doctor_id else None
  patient_info.append({
      ...,                            # existing fields untouched
      "doctor_id": p.doctor_id,
      "doctor_name": doctor.user_name if doctor else None,
  })
  ```

---

## Section 5 — Carry-overs from prior feedback

### LC1. Patient Edit still gated (no `POST /update-patient`)
- Client flagged that the Edit pencil is still inactive on the live build.
  We disabled it intentionally in commit `47561c9` because the backend
  route doesn't exist. This was item #2 in the 2026-06-19 backend asks
  list and is still blocking.
- **Action needed:** Backend team must ship `POST /update-patient` (full
  contract in `docs/m3-client-feedback-2026-06-19.md` Section 3 → "Backend
  asks"). No mobile work required until then.

---

## Triage summary

| ID  | Item                                      | Severity | Backend req'd? | Effort |
|-----|-------------------------------------------|----------|----------------|--------|
| LB1 | Clinician+age missing after registration  | High     | No (verify shape) | M    |
| LB2 | Doctor-column booking missing in filter   | High     | No             | M      |
| LB3 | Edit time not reflected on calendar       | High     | No             | M      |
| LU1 | Single-doctor readonly clinician (reg)    | Low      | No             | S      |
| LU2 | Single-doctor readonly + rename (new appt)| Low      | No             | S      |
| LU3 | Drop "All Doctors" w/ one doctor          | Low      | No             | S      |
| LU4 | Cancel buttons too low                    | Low      | No             | S      |
| LF1 | Status Update select on pending procedures| High     | Maybe          | M–L    |
| LF2 | Drop Discount column from in-progress row | Low      | No             | XS     |
| LN1 | Drag-and-drop appointments                | Medium   | No             | L      |
| LC1 | Patient Edit (carry-over)                 | Blocking | YES `/update-patient` | n/a |

---

## Proposed order of attack

Group by file/area to keep diffs small and reviewable:

1. **Single-doctor UX bundle** (LU1 + LU2 + LU3): touches three screens but
   the rule is identical — branches on `doctors.length === 1`. Ship as one
   small commit per screen.
2. **LF2** (drop Discount column): isolated to `app/orders.tsx`, ~10 lines.
3. **LU4** (cancel buttons): pure CSS-ish fix.
4. **LB1** (registration clinician+age missing): needs a live-backend
   shape check first. Probably one of: rename a type field, or invalidate
   the patients list query on register success.
5. **LB2** (doctor-column booking): trace doctor_id payload end-to-end.
6. **LB3** (edit time not reflected): React Query invalidation /
   socket-merge fix.
7. **LF1** (status update select): biggest item — web reference + new
   hook + new UI control.
8. **LN1** (drag-and-drop): biggest UX surface; tackle after everything
   else is green.

LC1 remains blocked on backend.
