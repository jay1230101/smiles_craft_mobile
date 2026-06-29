# M3 Client Feedback — 2026-06-29

Feedback round received from Mireille after the v1.2.0 preview build. 13 observations.

Status legend:
- ✅ Shipped this round
- 🔵 Backend-dependent — unchanged
- ⚪ Awaiting clarification

---

## 1. ✅ Hide Clinician field on Patient Registration

Read-only Clinician label removed entirely for single-clinician clinics and for
non-owner doctors. Doctor id still auto-fills behind the scenes so the form
submits correctly.

**Files:** `app/patient-register.tsx`

---

## 2. 🔵 Edit Patient Registration still unavailable

Backend dependency — `POST /update-patient` route doesn't exist yet. Already
on the backend punch list. No mobile change this round.

---

## 3. ✅ WhatsApp confirmation checkbox — bold border

Both New Appointment and Edit/Reschedule now wrap the "Send WhatsApp …" toggle
in a 2px primary-blue border with a light blue tint background.

**Files:** `app/appointment-new.tsx`, `app/appointment-edit.tsx`

---

## 4. ✅ Edit/Reschedule — date picker

Both screens now use the `DateField` component (calendar popup) instead of a
manual text entry. Range: 2 years past to 5 years future.

**Files:** `app/appointment-new.tsx`, `app/appointment-edit.tsx`

---

## 5. ✅ Slot duration mismatch — now driven by `/getClinicSchedule`

Mobile previously hard-coded a 1-hour grid. New hook `useClinicSchedule` reads
the same `/getClinicSchedule` the web app uses (`slotDuration`, `startTime`,
`endTime`). Effects:

- Day-view grid labels and tap-zones now subdivide at the configured slot size
  (Mireille's 30-min config will show 30-min rows).
- Tap-to-book on the calendar prefills the slot at the tapped time, with end
  time = start + slot.
- Drag-to-reschedule snap step matches the slot.
- Day start/end hours come from the clinic schedule.

**Files:** `hooks/use-clinic-schedule.ts` (new), `api/endpoints.ts`,
`components/draggable-day-timeline.tsx`, `app/(tabs)/calendar.tsx`

---

## 6. ✅ Cancelled appointment — locked

When status = cancelled:
- Popover hides Orders, Plan of Care, Future WhatsApp, Edit, Cancel, Confirm,
  and Book-Another. Only one option visible: **Change cancel reason**.
- Cancel pane prompt now reads "Update the cancellation reason..." and the
  button label switches to "Update reason".
- Drag-to-reschedule disabled on cancelled events (pan gesture `.enabled(false)`).

**Files:** `components/appointment-popover.tsx`,
`components/draggable-day-timeline.tsx`

---

## 7. ✅ Allow double-booking at same time

Added "Book another at this time" item to the popover (always enabled for
non-cancelled events). Prefills the New Appointment form with the same date,
start/end, and doctor — backend already allows the second booking. Solves the
visibility problem where the empty-slot tap zone was hidden under an event
card at occupied times.

**Files:** `components/appointment-popover.tsx`

---

## 8. ✅ Greeting — "Hi Dr {FullName}"

Replaced the time-based "Good Morning/Evening Dr !" with a static "Hi" plus
the user's full name. Doctors get a "Dr" prefix; everyone else just gets the
name. Pulls from `user.user_name` directly.

**Files:** `app/(tabs)/(home)/index.tsx`, `lib/greeting.ts`

---

## 9. ✅ Trim notifications list

Suppressed (no longer pushed to the bell + screen, but cache still
invalidates):
- `newAppointment` (staff-created bookings)
- `bookingDeleted` (appointment removed)
- `patientAdded`, `patientEdited`, `patientDeleted`

Kept:
- `updateAppointment` (reschedule)
- `cancelledAppointment` (staff cancellation + patient WhatsApp cancellation)
- `confirmedAppointment` (patient WhatsApp confirmation)

**Files:** `hooks/use-socket-events.ts`

---

## 10. ⚪ Incomplete — needs full sentence from client

"in the calendar, if the user logged in is the owner + doctor or is the
assistant ... they need" — message cut off mid-sentence.

**Action:** ask the client to forward the rest of the sentence before next
build cycle.

---

## 11. ✅ Cross-clinic clinician-cache bug — fixed

Logout now nukes every per-user cache surface so logging in as a different
clinic's user starts from a clean slate:
- React Query cache (`queryClient.clear()`)
- `useNewAppointmentStore` (booking prefill — the doctorName leak Mireille
  reported)
- `useActiveAppointmentStore`, `useEditEventStore`, `useEditPatientStore`
- `useDoctorFilterStore` (selected doctor filter)
- `useNotificationsStore` (notifications feed)

Repro still needs second-clinic test credentials from Ahmed to confirm
end-to-end, but the root cause (stale zustand store + react-query cache) is
now addressed.

**Files:** `store/auth.ts`, `store/doctor-filter.ts` (added `reset()`)

---

## 12. ✅ "All Doctors" overlapping appointments — fixed

Day-view geometry now runs a greedy column-assignment pass over time-clusters
so concurrent appointments at the same time render side-by-side instead of
stacking on top of each other.

Before: Dr A's 10 AM + Dr B's 10 AM → only one visible (the later-drawn one).
After: both render in two columns (50%/50% width), with a 1% inter-column
gap. Handles N parallel events generally.

**Files:** `components/draggable-day-timeline.tsx`

---

## 13. ✅ Future WhatsApp template dropdown — fixed

Root cause: the Flask backend wraps the template list under `message`
(`{ "message": [...], "status": 200 }`), but mobile only unwrapped `data` and
`data.data` — always landed on `[]`.

Updated `getActiveTemplatesRequest` to also accept `data.message` as the
array source. Now matches the web app.

**Files:** `api/reminders.ts`

---

## Files touched this round

```
api/endpoints.ts
api/reminders.ts
app/(tabs)/(home)/index.tsx
app/(tabs)/calendar.tsx
app/appointment-edit.tsx
app/appointment-new.tsx
app/patient-register.tsx
components/appointment-popover.tsx
components/draggable-day-timeline.tsx
hooks/use-clinic-schedule.ts (new)
hooks/use-socket-events.ts
lib/greeting.ts
store/auth.ts
store/doctor-filter.ts
```

## Pending from user

- Full sentence for item #10
- Second-clinic test credentials (item #11) — Ahmed to share, so we can
  confirm the cross-clinic clinician-cache fix on his rig
