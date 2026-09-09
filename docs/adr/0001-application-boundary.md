# ADR 0001: Application and deployment boundary

Status: Accepted for bootstrap, 2026-09-09. Architecture review precedes JOIN feature expansion.

One Node 24 / Express server serves a React/Vite client and same-origin APIs. npm workspaces retain explicit domain/application boundaries without multiple deployable services. Core imports no framework, database or vendor SDK. PostgreSQL adapters live in the server; Zod validates external input; Pino provides redacted operational logs. Domain audit is separate.

Use Supabase PostgreSQL with SQL migrations and pg. Supabase CLI owns migration history; no second custom runner. The Core stays portable to ordinary PostgreSQL. A Cloud Run-compatible container is prepared, but no cloud resources or deployment are part of this bootstrap. Secret Manager values will be injected as environment variables; no SDK or secret fallback is needed now.

Only the authentication shell, identity mapping, service-context seed and isolation baseline are implemented before review. Then follow document 15, from CreateJoinEvent onward. GT-01–GT-12 and browser acceptance are mandatory before SUPPORT, AI, KAIZEN analytics or integrations. Bootstrap tests are not substitutes for those tests.

References: docs/15 section 3; docs/16; docs/bootstrap.md for exact reuse paths.

JOIN checkpoint implementation, 2026-09-09: the same single deployable app now
contains the document 15 commands and minimal React workspaces. Native
embedded-postgres and the injected browser test IdP exist only under tests;
neither is imported by production, Domain or Application. No deployment redesign.
