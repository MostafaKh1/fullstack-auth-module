import { apiClient } from "./api-client";
import type { User } from "./users-api";

/** What Sign up and Sign in answer: a new Session's access token, its lifetime in seconds, and the User. */
export type SignedIn = {
  accessToken: string;
  expiresIn: number;
  user: User;
};

export type SignUpRequest = { email: string; name: string; password: string };

export type SignInRequest = { email: string; password: string };

/** `POST /api/auth/sign-up`; the refresh cookie arrives with the response. */
export async function signUp(request: SignUpRequest): Promise<SignedIn> {
  const response = await apiClient.post<SignedIn>("/auth/sign-up", request);
  return response.data;
}

/** `POST /api/auth/sign-in`; the refresh cookie arrives with the response. */
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

/** `POST /api/auth/sign-out`: ends the Session on the server and clears the refresh cookie (`204`). */
export async function signOut(): Promise<void> {
  await apiClient.post("/auth/sign-out");
}
