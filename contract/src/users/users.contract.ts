import { bearerRoute } from "../common/route-security.js";
import { userSchema } from "../common/user.js";

export const usersContract = {
  me: bearerRoute({
    method: "GET",
    path: "/users/me",
    tags: ["users"],
    successStatus: 200,
    successDescription: "The signed-in User.",
  }).output(userSchema),
};
