import type {
  PendingProcedure,
  PlanOfCareItem,
  ProcedureCatalogItem,
  StatusItem,
  ToothItem,
  VisitsHistoryItem,
  WhatsAppTemplate,
} from '@/types/orders';

export const MOCK_PROCEDURES: ProcedureCatalogItem[] = [
  {
    id: 1,
    description: 'END-2 root canal filling',
    price: 120,
    currency: 'USD',
    procedure_id: 'END-2',
  },
  {
    id: 2,
    description: 'Dental cleaning',
    price: 60,
    currency: 'USD',
    procedure_id: 'CLN-1',
  },
  {
    id: 3,
    description: 'Consultation',
    price: 30,
    currency: 'USD',
    procedure_id: 'CON-1',
  },
  {
    id: 4,
    description: 'Crown placement',
    price: 350,
    currency: 'USD',
    procedure_id: 'CRN-1',
  },
  {
    id: 5,
    description: 'Filling — composite',
    price: 75,
    currency: 'USD',
    procedure_id: 'FIL-1',
  },
  {
    id: 6,
    description: 'Tooth extraction',
    price: 90,
    currency: 'USD',
    procedure_id: 'EXT-1',
  },
];

export const MOCK_TOOTH_LIST: ToothItem[] = [
  { code: 11, description: '11 - Upper Right Central Incisor' },
  { code: 12, description: '12 - Upper Right Lateral Incisor' },
  { code: 13, description: '13 - Upper Right Canine' },
  { code: 16, description: '16 - Upper Right First Molar' },
  { code: 17, description: '17 - Upper Right Second Molar' },
  { code: 21, description: '21 - Upper Left Central Incisor' },
  { code: 26, description: '26 - Upper Left First Molar' },
  { code: 36, description: '36 - Lower Left First Molar' },
  { code: 46, description: '46 - Lower Right First Molar' },
];

export const MOCK_STATUS_LIST: StatusItem[] = [
  { procedureStatus: 'Completed' },
  { procedureStatus: 'In_Process' },
];

export const MOCK_SHOW_TOOTH = true;

export const MOCK_PENDING_PROCEDURES: PendingProcedure[] = [
  {
    encounterId: 9001,
    procedure: 'END-2 root canal filling',
    toothNum: '17 - Upper Right Second Molar',
    encounterDate: '11 June 2026',
    status: 'In_Process',
    fees: 120,
    discount: 0,
    netPrice: 120,
    amountPaid: 32,
    remainingBalance: 88,
    currency: 'USD',
    billNumber: 'B-0042',
    bookingId: 0,
    procedure_id: 'END-2',
    provider: 'Mireille El rahi',
    patientId: 101,
  },
];

export const MOCK_VISITS_HISTORY: VisitsHistoryItem[] = [
  {
    id: 9001,
    procedure: 'END-2 root canal filling',
    toothNumber: '17 - Upper Right Second Molar',
    visitDate: '11 June 2026',
    fees: 120,
    discount: 0,
    netPrice: 120,
    amountPaid: 32,
    remainingBalance: 88,
    visit_notes: 'Patient tolerated well; second session scheduled.',
    doctorName: 'Mireille El rahi',
  },
  {
    id: 9002,
    procedure: 'Dental cleaning',
    toothNumber: '',
    visitDate: '02 May 2026',
    fees: 60,
    discount: 0,
    netPrice: 60,
    amountPaid: 60,
    remainingBalance: 0,
    visit_notes: 'Routine cleaning.',
    doctorName: 'Mireille El rahi',
  },
];

export const MOCK_PLAN_OF_CARE: PlanOfCareItem[] = [
  {
    id: 1,
    planOfCare:
      'Follow-up in 6 weeks for second root-canal session. Continue saltwater rinses twice daily. Reinforce flossing.',
    bookingId: 0,
    visitDate: '11 June 2026',
    doctorName: 'Mireille El rahi',
  },
];

export const MOCK_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  { id: 'oral_health_followup', name: 'oral_health_followup', label: 'Oral health follow-up' },
  { id: 'cleaning_reminder', name: 'cleaning_reminder', label: 'Cleaning reminder' },
  { id: 'general_followup', name: 'general_followup', label: 'General follow-up' },
];
