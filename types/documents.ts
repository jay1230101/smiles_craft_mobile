// Patient files (X-rays + documents). The backend stores DICOM/images as WebP
// and serves everything via short-lived (~5 min) presigned S3 URLs, so the app
// never sees .dcm and needs no DICOM viewer.

export type PatientDocument = {
  // id + created_at require a small backend addition to /view_docs (it does not
  // return them today), so both are optional — the list still renders without
  // them, and the delete action only appears once `id` is present.
  id?: number;
  fileName: string;
  // Presigned S3 URL; expires in ~5 minutes, so re-list to refresh.
  url: string;
  createdAt?: string;
  contentType?: string;
};

// Raw /view_docs row (snake_case from Flask).
export type ViewDocsResponseItem = {
  id?: number;
  file_name: string;
  file_path: string;
  created_at?: string;
  document_type?: string;
  name?: string;
  father?: string;
  family?: string;
};

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};
