# ADR 0002: Identity, session and Authority

Status: Accepted for bootstrap, 2026-09-09.

Google OIDC Authorization Code + S256 PKCE proves external identity. Use openid-client for protocol validation, adapting PPAP's flow rather than maintaining a new protocol implementation. State, nonce and verifier are generated independently. A one-use database login transaction expires in ten minutes; the browser carries an opaque flow cookie. Discovery trusts only the configured Google issuer. Redirect URI must belong to the configured application origin.

An explicit identity binding (issuer, subject) resolves to an internal Operator UUID and Tenant UUID. Email is display/contact information only; no email/domain JIT enrollment or auth bypass exists. The initial Operator belongs to one Tenant; multi-tenant membership selection requires a later decision. Identity bindings live in a private infrastructure schema, not Registry Person identity.

The session cookie holds a random opaque token; only its SHA-256 digest is stored. Sessions expire server-side after eight hours and are revoked on logout. Every authenticated request rechecks active Operator and Tenant through RLS. Cookies are HttpOnly, SameSite=Lax, Secure with __Host- prefix in production. Unsafe requests require exact Origin and a session CSRF token. OAuth callback uses one-use state/nonce/PKCE, not the mutation CSRF token. There is no dev header or password fallback.

PostgreSQL stores login transactions/sessions across instances. Restricted SECURITY DEFINER functions expose only the needed operations and return session identity, never business data. These functions do not authorize domain commands.

ADMIN, OPERATOR and REVIEWER grants are explicit, tenant-scoped Operator data. The bootstrap does not grant operational permissions through authentication. Subsequent commands must also check Service/Contract Authority. An Operator may hold multiple roles; configured self-review may be allowed for the first device flow, but must be explicitly permitted by the Contract Profile. ADMIN does not override tenant isolation.

Seed identity uses an untrusted .invalid issuer and cannot log in. A deliberate local admin command binds a verified Google subject to the seeded Operator. No real subject or credential is committed.
