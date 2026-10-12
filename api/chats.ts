import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { ChatThread, GetChatsResponse } from '@/types/chats';

// Inbound patient chat threads (last 30 days, newest message first within a
// thread; threads ordered by their most recent message). Read-only.
export async function getChatsRequest(): Promise<ChatThread[]> {
  const { data } = await apiClient.get<GetChatsResponse>(endpoints.chats.list);
  // Backend uses `messages` when there's data and `message: []` when empty.
  return Array.isArray(data?.messages) ? data.messages : [];
}
