import { Injectable } from "@nestjs/common";
import { ApiError } from "../../../common/errors/api-error";
import { AccessTokenService, type AuthContext } from "../../../common/services/access-token.service";
import { PasswordHashService } from "../../../common/services/password-hash.service";
import { ClockService } from "../../../core/clock.service";
import { UserRepository } from "../../../database/repositories/user.repository";
import type { SignInBody, SignUpBody, User } from "../auth.types";
import { type IssuedRefreshCredential, SessionService } from "./session.service";

/** `refreshCredential` is `null` only for a refresh accepted within the grace window (ADR 0001). */
export type SignedInWithCredential = {
  user: User;
  accessToken: string;
  expiresIn: number;
  refreshCredential: IssuedRefreshCredential | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly sessionService: SessionService,
    private readonly accessTokenService: AccessTokenService,
    private readonly clock: ClockService,
  ) {}

  /** A taken email is caught by the unique index. */
  async signUp(input: SignUpBody & { userAgent: string | null }): Promise<SignedInWithCredential> {
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

  /** An unknown email still pays for a hash verification and fails as a wrong password does, so neither reveals which emails have a User. */
  async signIn(input: SignInBody & { userAgent: string | null }): Promise<SignedInWithCredential> {
    const found = await this.users.findWithPasswordHashByEmail(input.email);
    const matches = found
      ? await this.passwordHashService.verify(input.password, found.passwordHash)
      : await this.passwordHashService.verifyAgainstDecoy(input.password);
    if (!found || !matches) throw new ApiError("auth.invalid_credentials");
    return this.startSession(found.user, input.userAgent);
  }

  async refresh(presentedCredential: string | null): Promise<SignedInWithCredential> {
    const { claims, issued } = await this.sessionService.refresh(presentedCredential);
    const user = await this.users.findById(claims.userId);
    if (!user) {
      throw new ApiError("auth.session_expired", { message: "The Session's User no longer exists." });
    }
    return this.signedIn(user, claims, issued);
  }

  async signOut(presentedCredential: string | null): Promise<void> {
    await this.sessionService.revokeForCredential(presentedCredential);
  }

  private async startSession(user: User, userAgent: string | null): Promise<SignedInWithCredential> {
    const { claims, issued } = await this.sessionService.start(user.id, userAgent);
    return this.signedIn(user, claims, issued);
  }

  private async signedIn(
    user: User,
    claims: AuthContext,
    refreshCredential: IssuedRefreshCredential | null,
  ): Promise<SignedInWithCredential> {
    return {
      user,
      accessToken: await this.accessTokenService.sign(claims, this.clock.now()),
      expiresIn: this.accessTokenService.lifetimeSeconds,
      refreshCredential,
    };
  }
}
