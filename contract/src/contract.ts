import { authContract } from "./features/auth/auth.contract.js";
import { healthContract } from "./features/health/health.contract.js";
import { usersContract } from "./features/users/users.contract.js";

/** Every route of the API; paths are relative to the `/api` prefix the back end sets. */
export const contract = {
  auth: authContract,
  health: healthContract,
  users: usersContract,
};
