import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "auth:isPublic";

/**
 * Lets a route through the global guard without an access token. Every other route requires one.
 * Only Sign up, Sign in, refresh, Sign out and health carry it.
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);
