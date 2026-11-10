import { apiClient } from "./api-client";

/** A User as the API returns it, from `/users/me` and in every auth response. */
export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

/** `GET /api/users/me`, the protected endpoint: the signed-in User. */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>("/users/me");
  return response.data;
}
