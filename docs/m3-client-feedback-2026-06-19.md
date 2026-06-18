# M3 Client Feedback Log — 2026-06-19

Captured from two WhatsApp threads with the client testing the M3 v1.2.0 build
on a Samsung Galaxy S25.

- Thread 1: Build observations against the M3 delivery doc (7 items + 1 positive)
- Thread 2: Clarification of the 4 WhatsApp message types in the system
  (context for both the M3 popover Schedule Future WhatsApp action and the
  Day-before reminder behavior the calendar must reflect)

Our reply to the client (verbatim):
> "I've noted all the points you've mentioned. Most of these improvements and
> enhancements can be addressed in the next development phase. I'll review each
> item in detail and prioritize the required changes accordingly. Thanks again
> for taking the time to test and share your observations."

---

## Section 1 — Build observations

### Bugs / blockers

**B1. Edit appointment time not reflected on calendar**
- Reproduce: Open appointment popover → Edit / Reschedule → change Start time
  and End time → Save → calendar still shows the old slot.
- Likely root cause: `/encounter` success isn't invalidating the
  `getAllEvents` query, or the socket `updateAppointment` payload isn't being
  applied to the calendar cache.
- Severity: High — appointments effectively can't be rescheduled from mobile
  even though the form accepts the change.

**B2. Cannot book a new appointment from the calendar**
- Reproduce: Tap an empty slot in the day or week view — nothing happens.
- Status: This is not a regression — the "Create new appointment" flow is
  not yet built on mobile. The client expected to find it.
- Severity: Medium — was always M4 scope, but client now treats it as expected
  M3 behavior since the calendar otherwise looks complete.

**B3. Cancel and Register buttons sit too low on Samsung S25**
- Reproduce: Open Patient Registration on a Samsung S25 → bottom buttons sit
  flush against the bottom edge / soft-bar area → hard to tap reliably.
- Likely root cause: bottom safe-area inset not respected, or the actions
  block has no bottom padding for tall Android devices.
- Severity: Low — visual fix, no data loss, but blocks the registration flow.
- Scope: Also audit appointment-edit, patient-edit, orders, plan-of-care,
  schedule-whatsapp, clinical-history — same component pattern.

### Form / field changes

**F1. Patient Registration — remove Email field**
- The web form has Email; the client doesn't want it on mobile (faster entry
  on a small keyboard).

**F2. Patient Registration — Family Name must be mandatory**
- Currently optional in the schema. Make required with the same red asterisk
  treatment as First Name.

**F3. Treatment & Orders — show net price in the procedure row**
- When adding a procedure, the row currently shows Price and Discount only.
  Client wants Net Price (= Price − Discount) shown too so the dentist can
  see the final figure before tapping ADD.

### Feature request

**N1. Drag-and-drop appointment rescheduling on the calendar**
- Parity with the web app.
- Scope: long-press to lift, pan to a new time slot, optimistic UI, conflict
  detection against existing bookings, socket emit on commit.
- Effort: significant — recommend Phase 2 (post-M4) unless client elevates.

### Positive feedback

> "the navigation between the pages is super smooth and nice"

---

## Section 2 — WhatsApp messaging clarification

The client described the 4 WhatsApp message types the system sends. Items 1–3
are web-app behaviors the mobile app must match; item 4 is the M3 popover
action that already shipped.

### Type 1 — Booking confirmation
- **Trigger:** at booking time, dentist or assistant ticks the "WhatsApp"
  checkbox on the create-appointment form.
- **Message:** "Your appointment is booked with Dr. {doctor} on {date} at
  {time}."
- **Mobile status:** Not implemented — depends on the new-appointment screen
  from B2 above. The checkbox + the existing backend trigger come for free
  once that screen exists.

### Type 2 — Day-before reminder (automated)
- **Trigger:** Celery beat, 19:30 Beirut time daily, to every patient with an
  appointment the next day.
- **Message:** Reminder text with Confirm and Cancel interactive buttons.
- **Outcome on backend:**
  - Patient taps Confirm → `BookingEncounter.patient_confirmed = True` →
    emits `confirmedAppointment` on Socket.IO.
  - Patient taps Cancel → `patient_cancelled = True` →
    emits `cancelledAppointment`.
- **Visual rule (from web CSS the client shared):**
  ```css
  .app-confirmed {
    background-color: green !important;
    color: white !important;
  }
  .app_cancelled {
    background-color: red !important;
    color: white !important;
  }
  ```
- **Mobile status:** Calendar listens to both events already (notifications
  inbox is wired). **Missing:** the calendar palette currently colours every
  slot by doctor; it does not apply green/red when the patient has
  confirmed/cancelled. Fix is straightforward — status palette wins over
  doctor palette in `SlotCard` / `WeekCard`. The flags are already on
  `BackendEvent`.

### Type 3 — Cashier receipt
- **Trigger:** In the cashier payment flow, if the dentist/assistant selects
  the WhatsApp delivery option at checkout.
- **Message:** PDF receipt sent as a WhatsApp document message.
- **Mobile status:** Cashier is M4 (Billing). The payment screen must include
  a delivery toggle group (Email / WhatsApp / Print) the same way the web
  bill page does. The `/treatment-plan` endpoint already accepts the
  `deliveryOptions` payload.

### Type 4 — Future WhatsApp reminder (already shipped in M3)
- **Trigger:** Calendar popover → "Schedule Future WhatsApp".
- **Use case:** dentist schedules a 3-, 4-, or 5-month-out reminder (typically
  for a cleaning check-up).
- **Mobile status:** ✅ Shipped in M3 v1.2.0 (2026-06-15). Posts to
  `/store_reminders`. No client changes requested.

---

## Section 3 — Triage and proposed delivery plan

### Quick wins — patch release this week (M3.1)
Small surface, no architectural change, lets us close the loop while M4 specs
are being agreed with the backend team.

| Item | Effort | File(s) |
| ---- | ------ | ------- |
| F1 — Remove Email field | 30 min | `app/patient-register.tsx`, `app/patient-edit.tsx`, `types/patients.ts` |
| F2 — Family Name required | 15 min | Same as F1 (schema only) |
| F3 — Net price in Orders row | 45 min | `app/orders.tsx` |
| B3 — Bottom inset on action rows | 1–2 h | `components/screen.tsx` or per-screen action style |
| Type 2 — Confirmed/Cancelled status colour on calendar | 1 h | `app/(tabs)/calendar.tsx` (`SlotCard`, `WeekCard`) |

### M4 scope (Billing + appointment management)
- B1 — Edit time → calendar refresh (likely 30-min fix; bundle with the
  M4 invalidation pass)
- B2 — New-appointment screen + Type 1 WhatsApp checkbox
- Type 3 — Cashier WhatsApp delivery option

### Phase 2 / backlog
- N1 — Drag-and-drop rescheduling on the calendar

---

## Section 4 — Source quotes (verbatim, for traceability)

**Thread 1 — observations:**
> "i went over the document and noticed few observations for you to look into:
> 1- in Patient Registration: Remove the Email field (it is not needed in the
> mobile app)
> 2- the cancel and register buttons needs to be slightly moved up... i cannot
> click on it properly on my samsung S25.
> 3- Family name is not optional - it is mandatory
> 4- in the calendar page - i was not able to book a new appointment when
> clicking
> 5- when adding a new procedure in treatment and orders, it needs to show the
> net price also not only the discount
> 6- when i try to edit the appointment and change start and end time, it is
> not reflected on the calendar (meaning appointment is not changing time on
> the calendar)
> 7- is it possible to drag and drop the appointment in the calendar if i need
> to change time (similar to the web app behavior)
> [12:54 PM] the navigation between the pages is super smooth and nice"

**Thread 2 — WhatsApp clarification:**
> "for the type of whatsapp, basically there are 4 types of whatsapp messages
> sent to patients:
> 1- upon booking an appointment in the calendar, the dentist / clinic
> assistant will check box the whatsapp input checkbox field... this will
> trigger a whatsapp to the patient saying that the appointment is booked with
> Dr... on date... at time...
> 2- one day before appointment, an automatic whatsapp is scheduled to be sent
> at 7:30PM beirut time to all patients who have appointments the next day
> with confirm button and cancel button... if the patient taps on confirm...
> the color of the appointment slot in calendar will turn into green
> .app-confirmed { background-color: green !important; color: white
> !important; }
> .app_cancelled { background-color: red !important; color: white !important; }
> 3- in the cashier - when the patient is paying - if the dentist / clinic
> assistant selected whatsapp... the receipt will be sent as PDF as whatsapp
> message
> 4- in the calendar - when you select an appointment - you see schedule future
> whatsapp --- the dentist will select a whatsapp to be sent after 3 or 4 ... 5
> months to the patient to remind him about the oral health appointment..."
