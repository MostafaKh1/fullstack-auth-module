import { apiClient } from "./client";

export type Health = {
  status: string;
  database: string;
};

/** `GET /api/health`; rejects when the API answers 503 or cannot be reached. */
export async function getHealth(): Promise<Health> {
  const response = await apiClient.get<Health>("/health");
  return response.data;
}
