/** A User as the application sees it: never with its password hash. */
export type User = { id: string; email: string; name: string; createdAt: Date };
