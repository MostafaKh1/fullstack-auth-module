import { apiClient } from "./api-client";
import type { components } from "./api-types.generated";

export type SignedIn = components["schemas"]["SignedIn"];

export type SignUpRequest = components["schemas"]["SignUpRequest"];

export type SignInRequest = components["schemas"]["SignInRequest"];

export async function signUp(request: SignUpRequest): Promise<SignedIn> {
  const response = await apiClient.post<SignedIn>("/auth/sign-up", request);
  return response.data;
}

export async function signIn(request: SignInRequest): Promise<SignedIn> {
  const response = await apiClient.post<SignedIn>("/auth/sign-in", request);
  return response.data;
}

/**
 * `POST /api/auth/refresh`: the refresh cookie buys a new access token and the User, and a rotated cookie.
 * Called only through `refreshSessionOnce()` in `session-refresh.ts`, so concurrent callers share one request.
 */
export async function refreshSession(): Promise<SignedIn> {
  const response = await apiClient.post<SignedIn>("/auth/refresh");
  return response.data;
}

export async function signOut(): Promise<void> {
  await apiClient.post("/auth/sign-out");
}
