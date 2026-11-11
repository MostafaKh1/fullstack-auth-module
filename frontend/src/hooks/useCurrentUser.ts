import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../utils/users-api";

export function useCurrentUser() {
  return useQuery({ queryKey: ["users", "me"], queryFn: getCurrentUser });
}
