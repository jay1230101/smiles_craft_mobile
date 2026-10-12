import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { PatientDocument, PickedFile, ViewDocsResponseItem } from '@/types/documents';

export async function listDocumentsRequest(patientId: number): Promise<PatientDocument[]> {
  const { data } = await apiClient.post<ViewDocsResponseItem[]>(endpoints.documents.list, {
    patient_id: patientId,
  });
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => ({
    id: r.id,
    fileName: r.file_name,
    url: r.file_path,
    createdAt: r.created_at,
    contentType: r.document_type,
  }));
}

export async function uploadDocumentRequest(
  patientId: number,
  file: PickedFile,
): Promise<void> {
  const form = new FormData();
  // RN FormData file part: { uri, name, type }.
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  form.append('patientId', String(patientId));
  form.append('fileSize', String(file.size ?? 0));
  await apiClient.post(endpoints.documents.upload, form, {
    // Override the client's default application/json so RN sets the multipart
    // boundary itself.
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// The backend deletes by the stored file name (its S3 key / file_path), passed
// as `file_name`. /view_docs returns that exact value in its `file_name` field.
export async function deleteDocumentRequest(fileName: string): Promise<void> {
  await apiClient.post(endpoints.documents.delete, { file_name: fileName });
}
