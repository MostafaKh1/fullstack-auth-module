import { Injectable } from "@nestjs/common";
import { ApiError } from "../../common/errors/api-error";
import { ClockService } from "../../core/clock.service";
import { type User, UserRepository } from "../../database/repositories/user.repository";
import type { SignUpBody } from "../auth.types";
import { PasswordHashService } from "../password-hash.service";
import { SessionIssuerService, type StartedSession } from "../session-issuer.service";

export type SignedIn = StartedSession & { user: User };

/** Sign up: create the User and start their first Session. A taken email is caught by the unique index. */
@Injectable()
export class SignUpHandler {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly sessionIssuerService: SessionIssuerService,
    private readonly clock: ClockService,
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
