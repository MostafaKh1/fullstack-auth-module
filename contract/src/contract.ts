import { authContract } from "./auth.contract.js";
import { healthContract } from "./health.contract.js";

/** Every route of the API; paths are relative to the `/api` prefix the back end sets. */
export const contract = {
  auth: authContract,
  health: healthContract,
};
