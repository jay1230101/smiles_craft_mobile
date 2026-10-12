// Inbound patient WhatsApp chat (read-only). The backend (/getChats +
// `displayPatientWhatsApp` socket) stores only inbound patient text; patients
// are meant to tap Confirm/Cancel, but many reply with free text, and this
// surfaces that text to staff. There is no reply/send on the backend.

export type ChatMessage = {
  message: string;
  // "DD-MM-YYYY HH:MM" in clinic (Beirut) time, formatted server-side.
  timestamp: string;
  // Only 'inbound' is ever produced today; the field exists for parity.
  direction: 'inbound' | 'outbound';
};

export type ChatThread = {
  patient_phone: string;
  patient_name: string;
  // null when the sender phone isn't a registered patient.
  patient_id: number | null;
  clinic_call_number?: string | null;
  messages: ChatMessage[];
};

// /getChats returns { messages: [...], status: 'ok' } with data, or
// { message: [], status: 'empty' } when there are none (note the key swap).
export type GetChatsResponse = {
  status?: string;
  messages?: ChatThread[];
  message?: ChatThread[] | string;
};

// Payload of the `displayPatientWhatsApp` socket event (no `direction` field;
// it's always an inbound message).
export type IncomingChatEvent = {
  patient_phone: string;
  patient_name: string;
  patient_id: number | null;
  clinic_call_number?: string | null;
  timestamp: string;
  message: string;
};
