import { Injectable } from "@nestjs/common";
import { ApiError } from "../../../common/errors/api-error";
import { AccessTokenService, type AuthContext } from "../../../common/services/access-token.service";
import { PasswordHashService } from "../../../common/services/password-hash.service";
import { ClockService } from "../../../core/clock.service";
import { UserRepository } from "../../../database/repositories/user.repository";
import type { SignInBody, SignUpBody, User } from "../auth.types";
import { type IssuedRefreshCredential, SessionService } from "./session.service";

/**
 * What Sign up, Sign in and refresh answer: the User and a new access token, and the refresh credential to hand
 * to the browser. `refreshCredential` is `null` only for a refresh accepted within the grace window (ADR 0001).
 */
export type SignedIn = {
  user: User;
  accessToken: string;
  expiresIn: number;
  refreshCredential: IssuedRefreshCredential | null;
};

/** Sign up, Sign in, refresh and Sign out: each operation's rules, ordering and failure policy. */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly sessionService: SessionService,
    private readonly accessTokenService: AccessTokenService,
    private readonly clock: ClockService,
  ) {}

  /** Creates the User and starts their first Session. A taken email is caught by the unique index. */
  async signUp(input: SignUpBody & { userAgent: string | null }): Promise<SignedIn> {
    const passwordHash = await this.passwordHashService.hash(input.password);
    const user = await this.users.create({
      email: input.email,
      name: input.name,
      passwordHash,
      createdAt: this.clock.now(),
    });
    if (!user) throw new ApiError("user.email_taken");
    return this.startSession(user, input.userAgent);
  }

  /**
   * Checks the credentials and starts a new Session. An unknown email still pays for a hash verification, so it
   * fails in the same time and with the same code as a wrong password, and neither reveals which emails have a User.
   */
  async signIn(input: SignInBody & { userAgent: string | null }): Promise<SignedIn> {
    const found = await this.users.findWithPasswordHashByEmail(input.email);
    const matches = found
      ? await this.passwordHashService.verify(input.password, found.passwordHash)
      : await this.passwordHashService.verifyAgainstDecoy(input.password);
    if (!found || !matches) throw new ApiError("auth.invalid_credentials");
    return this.startSession(found.user, input.userAgent);
  }

  /** Rotates the presented refresh credential and issues a new access token for its Session. */
  async refresh(presentedCredential: string | null): Promise<SignedIn> {
    const { claims, issued } = await this.sessionService.refresh(presentedCredential);
    const user = await this.users.findById(claims.userId);
    if (!user) {
      throw new ApiError("auth.session_expired", { message: "The Session's User no longer exists." });
    }
    return this.signedIn(user, claims, issued);
  }

  /** Ends the Session the credential holds, with reason `sign-out`; a credential holding none is not an error. */
  async signOut(presentedCredential: string | null): Promise<void> {
    await this.sessionService.revokeForCredential(presentedCredential);
  }

  private async startSession(user: User, userAgent: string | null): Promise<SignedIn> {
    const { claims, issued } = await this.sessionService.start(user.id, userAgent);
    return this.signedIn(user, claims, issued);
  }

  private async signedIn(
    user: User,
    claims: AuthContext,
    refreshCredential: IssuedRefreshCredential | null,
  ): Promise<SignedIn> {
    return {
      user,
      accessToken: await this.accessTokenService.sign(claims, this.clock.now()),
      expiresIn: this.accessTokenService.lifetimeSeconds,
      refreshCredential,
    };
  }
}
