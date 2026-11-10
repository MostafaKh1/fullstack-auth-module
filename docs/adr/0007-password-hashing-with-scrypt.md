# Passwords are hashed with scrypt from Node's built-in crypto

Passwords are stored only as scrypt hashes computed with `node:crypto`, with a 16-byte random salt per password and the parameters encoded in the hash itself: `scrypt$<log2 N>$<r>$<p>$<salt>$<key>` (base64), `r = 8`, `p = 1`, a 64-byte key, and the cost `log2 N` from `PASSWORD_HASH_COST` (default 17, so about 128 MiB and a few hundred milliseconds per hash; production refuses less).
Because each hash names its own parameters, raising the cost later leaves existing hashes verifiable.
A Sign in with an unknown email verifies against a decoy hash made at boot with the same cost, so it takes as long as a wrong password and answers the same `auth.invalid_credentials`.

## Considered options

- **argon2id.** OWASP's first choice and the original plan, but the `argon2` package ships a native `.node` addon, and the development machine's Windows Application Control blocks unsigned native addons. A pure-JavaScript argon2 is far slower than native code, which forces a weaker cost for the same latency.
- **bcrypt.** Widely used, but it silently ignores everything past 72 bytes, which a 128-character password with multi-byte characters can exceed; it is not memory-hard; and its maintained packages are native addons too.
- **scrypt from `node:crypto`.** Memory-hard, listed by OWASP as acceptable when argon2id is unavailable, implemented natively inside Node itself, so no dependency at all and no length limit.

## Consequences

- Node caps scrypt's memory at 32 MiB by default, below what cost 17 needs (`128 * N * r` bytes), so the hasher raises `maxmem` explicitly.
- Each hash occupies one libuv thread-pool thread while it runs; the throttling of Sign up and Sign in (#19) is what bounds how many run at once.
- Tests may lower the cost to 10 for speed; the stored-hash test runs at the default 17.
