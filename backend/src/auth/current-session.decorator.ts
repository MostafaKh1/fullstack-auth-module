import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { ApiError } from "../errors/api-error";
import type { AuthenticatedRequest } from "./access-token.guard";
import type { AccessClaims } from "./access-token.service";

/** The signed-in User and Session of a protected route, as the global guard established them. */
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessClaims => {
    const session = context.switchToHttp().getRequest<AuthenticatedRequest>().authSession;
    if (!session) throw new ApiError("auth.unauthenticated");
    return session;
  },
);
