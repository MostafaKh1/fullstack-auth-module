import { Injectable } from "@nestjs/common";
import { PasswordHashService } from "../../../auth/password-hash.service";
import { SessionIssuerService } from "../../../auth/session-issuer.service";
import { UserRepository } from "../../../database/user.repository";
import { ApiError } from "../../../errors/api-error";
import type { SignInBody } from "../auth.schema";
import type { SignedIn } from "./sign-up.handler";

/**
 * Sign in: check the credentials and start a new Session.
 * An unknown email still pays for a hash verification, so it fails in the same time and with the same code
 * as a wrong password, and neither reveals which emails have a User.
 */
@Injectable()
export class SignInHandler {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly sessionIssuerService: SessionIssuerService,
  ) {}

  async execute(input: SignInBody & { userAgent: string | null }): Promise<SignedIn> {
    const found = await this.users.findWithPasswordHashByEmail(input.email);
    const matches = found
      ? await this.passwordHashService.verify(input.password, found.passwordHash)
      : await this.passwordHashService.verifyAgainstDecoy(input.password);
    if (!found || !matches) throw new ApiError("auth.invalid_credentials");
    return { user: found.user, ...(await this.sessionIssuerService.start(found.user.id, input.userAgent)) };
  }
}
