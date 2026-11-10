import { Injectable } from "@nestjs/common";
import { PasswordHashService } from "../../../auth/password-hash.service";
import { SessionIssuerService, type StartedSession } from "../../../auth/session-issuer.service";
import { Clock } from "../../../clock/clock";
import { type User, UserRepository } from "../../../database/user.repository";
import { ApiError } from "../../../errors/api-error";
import type { SignUpBody } from "../auth.schema";

export type SignedIn = StartedSession & { user: User };

/** Sign up: create the User and start their first Session. A taken email is caught by the unique index. */
@Injectable()
export class SignUpHandler {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly sessionIssuerService: SessionIssuerService,
    private readonly clock: Clock,
  ) {}

  async execute(input: SignUpBody & { userAgent: string | null }): Promise<SignedIn> {
    const passwordHash = await this.passwordHashService.hash(input.password);
    const user = await this.users.create({
      email: input.email,
      name: input.name,
      passwordHash,
      createdAt: this.clock.now(),
    });
    if (!user) throw new ApiError("user.email_taken");
    return { user, ...(await this.sessionIssuerService.start(user.id, input.userAgent)) };
  }
}
