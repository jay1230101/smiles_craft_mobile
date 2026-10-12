import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteDocumentRequest,
  listDocumentsRequest,
  uploadDocumentRequest,
} from '@/api/documents';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { PickedFile } from '@/types/documents';

const documentsKey = (patientId: number) => ['documents', patientId] as const;

export function usePatientDocuments(patientId: number | null) {
  return useQuery({
    queryKey: ['documents', patientId],
    queryFn: () => listDocumentsRequest(patientId as number),
    enabled: !DEMO_MODE && patientId != null,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUploadDocument(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: PickedFile) => uploadDocumentRequest(patientId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKey(patientId) });
    },
  });
}

export function useDeleteDocument(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileName: string) => deleteDocumentRequest(fileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKey(patientId) });
    },
  });
}
