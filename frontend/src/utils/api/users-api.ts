import { apiClient } from "@/utils/api/api-client";
import type { components } from "@/utils/api/api-types.generated";

export type User = components["schemas"]["User"];

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>("/users/me");
  return response.data;
}
