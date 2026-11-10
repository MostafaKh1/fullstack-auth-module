import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../utils/users-api";

/** The signed-in User, read from the protected endpoint. */
export function useCurrentUser() {
  return useQuery({ queryKey: ["users", "me"], queryFn: getCurrentUser });
}
