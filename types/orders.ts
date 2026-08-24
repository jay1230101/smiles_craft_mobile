// Backend item from /init-procedure-screen — used to populate the procedure
// dropdown. Price is embedded so selecting an item auto-fills the price field
// without a second call.
export type ProcedureCatalogItem = {
  id: number;
  description: string;
  price: number;
  currency: string;
  procedure_id: string;
  clinic_name?: string;
  user_name?: string;
  user_id?: string;
};

export type ToothItem = {
  code: number;
  description: string;
};

export type StatusItem = {
  procedureStatus: string;
};

export type ProcedureInitResponse = {
  status: string;
  data: {
    procedures: ProcedureCatalogItem[];
    toothlist: ToothItem[];
    status_list: StatusItem[];
    show_tooth: boolean;
  };
};

export type PendingProcedure = {
  encounterId: number;
  procedure: string;
  toothNum: string;
  encounterDate: string;
  status: string;
  fees: number;
  discount: number;
  netPrice: number;
  amountPaid: number;
  remainingBalance: number;
  currency: string;
  billNumber: string;
  bookingId: number;
  procedure_id: string;
  provider: string;
  patientId: number;
};

export type PendingProceduresResponse = {
  procedures: PendingProcedure[];
  totals: {
    totalAmountPaid: number;
    totalNetAmount: number;
    totalRemainingBalance: number;
  };
};

// Local-only row staged in the "waiting validation" table on the Orders modal.
// Becomes one entry in the `procedures` array sent to /treatment-plan on submit.
export type StagedProcedure = {
  // Local key for delete/edit operations.
  key: string;
  procedure_id: string;
  procDescription: string;
  procPrice: number;
  selectedTooth: string;
  discount: number;
  status: string;
  visitNotes: string;
  currency: string;
};

// Status change request for an existing in-process procedure (from the
// pending-procedures table on the modal). Goes in `inProcessStatus`.
export type StatusUpdateRequest = {
  encounterId: number;
  update_status: string;
  procedure: string;
  toothNum: string;
  procedure_id: string;
  provider: string;
  fees: number;
  discount: number;
  netPrice: number;
  amountPaid: number;
  remainingBalance: number;
  currency: string;
};

export type TreatmentPlanRequest = {
  patient_id: number;
  procedures: TreatmentPlanProcedure[];
  inProcessStatus: StatusUpdateRequest[];
  billID: number[];
  amountPaid?: number;
  outstanding?: boolean;
  doctor?: string;
  deliveryOptions?: {
    email: boolean;
    whatsapp: boolean;
    print: boolean;
    save: boolean;
  };
};

export type TreatmentPlanProcedure = {
  procDescription: string;
  procedure_id: string;
  procPrice: number;
  selectedTooth: string;
  discount: number;
  status: string;
  visitNotes: string;
  visit_date: string;
  bookingAppointmentId: number;
  doctorName: string;
  currency: string;
  bookingRandomCreatedId: string;
  clinicName: string;
  addingNewProcId: string;
};

export type TreatmentPlanResponse = {
  status: 'success' | 'error';
  message?: string;
  inventoryWarnings?: string[];
};

export type VisitsHistoryItem = {
  id: number;
  procedure: string;
  toothNumber: string;
  visitDate: string;
  fees: number;
  discount: number;
  netPrice: number;
  amountPaid: number;
  remainingBalance: number;
  visit_notes: string;
  doctorName: string;
};

export type VisitsHistoryResponse = {
  status: string;
  message: string | null;
  data: VisitsHistoryItem[];
};

export type WhatsAppTemplate = {
  id: number | string;
  name: string;
  label?: string;
};

export type StoreReminderRequest = {
  patientId: number;
  [reminderName: string]:
    | number
    | {
        checked: boolean;
        date: string;
      };
};

export type StoreReminderResponse = {
  status: string;
  message: string;
};
