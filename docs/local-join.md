# Run JOIN locally with real Google login

Use Node 24 and running Docker Desktop. Commands below run in `git_KAIZEN`.
On Windows PowerShell use `npm.cmd` and `npx.cmd`. No hosted Supabase project
or Supabase Auth setup is required. Google OIDC remains server-owned.

## First setup

1. `npm.cmd ci`
2. `npm.cmd run db:start` starts the repository's local Supabase PostgreSQL 17.
3. `npm.cmd run db:migrate` applies pending local migrations without resetting data.
4. Create ignored `.env` from `.env.example`, and set real Google OAuth Web client
   ID and secret. Keep `APP_ORIGIN=http://localhost:5173` and register exactly
   `http://localhost:5173/auth/callback` in Google. Configure the Google audience
   to permit the intended account. Do not put credentials in Git or chat.
5. `npm.cmd run db:configure-local` generates a random password for the existing
   restricted `factact_runtime` role, updates only `DATABASE_URL` in `.env`, and
   verifies runtime privileges. It does not reset any data. Stop an existing app
   first: this rotates its local database password. The command is limited to
   development `127.0.0.1:54322/postgres`. It uses the standard local Supabase
   administrative connection unless `ADMIN_DATABASE_URL` is explicitly provided.
6. With the UI server stopped, run `npm.cmd run auth:verify-local`. Open
   `http://localhost:5173` in your normal browser and select the Google verification
   link. Personally sign in with the account intended for the seeded Operator.
   This separate one-shot administrative listener uses the application's Google
   verifier: signature, issuer, state, nonce and PKCE. It creates no application
   session and grants no access. It expires after ten minutes.
7. After the success page, run within 30 minutes:
   `npm.cmd run db:bind-operator -- --verified-local`.
   This explicitly binds the verified issuer/subject to the deterministic demo
   Operator and records an audit event. The ignored `.env.google-identity.json`
   contains only issuer, subject and verification time, no OAuth tokens. Treat it
   as local administrative input. Existing real bindings are never replaced.
8. Start `npm.cmd run dev` and `npm.cmd run dev:ui` in separate terminals. Open
   `http://localhost:5173` and use Google login again. This time the real
   application resolves the bound Operator and creates its normal opaque session.

For subsequent starts, use `db:start`, then `dev` and `dev:ui`. Repeat neither
password rotation nor binding unless the database was reset. Stop application
terminals with Ctrl+C; `npx.cmd supabase stop` stops local containers while keeping
their data. Do not append flags that delete data for ordinary shutdown.

## Reset the disposable demo

Reset is deliberately separate from startup. It deletes all local FACTACT demo
work, Changes, Relations, sessions and identity bindings. Never use a hosted or
shared database for these steps.

1. Stop both app terminals and any identity-verification listener.
2. In this repository check `supabase/config.toml`: project `factact`, database
   port `54322`. Confirm that these are the disposable demo data you intend to lose.
3. Run `npm.cmd run db:reset` (the script explicitly specifies `--local`).
4. Run `npm.cmd run db:configure-local`, then repeat real Google verification and
   explicit binding from steps 6–7. Old proof files expire and never authorize login.
5. Restart both app terminals and sign in again.

The seed creates Tenant, Organization, Person 田中 一郎, Service, bounded COMPANY_PC
Contract Profile, PC-0073 and the demo Operator. It does not create JOIN results
or committed device Facts. No department/employment fields are added.

## Browser check

Follow document 15 section 14: create JOIN, inspect no Work before evaluation,
evaluate COMPANY_PC, open its Work, inspect Next Action and Why, record an actual
demo assignment, inspect proposed Change while Person remains UNKNOWN, Verify,
Commit, inspect verified PC-0073 and provenance, complete Work, inspect readiness
and Timeline. Treat the assignment as a synthetic demo, not a real customer record.

`npm.cmd test` and `npm.cmd run test:db` preserve bootstrap and GT-01–GT-12 checks.
`npm.cmd run test:browser` runs isolated automated acceptance with a test IdP and
test-only PostgreSQL. It does not test your Google account or change your demo DB;
the real Google/browser check above is separate. Never replace Google verification
with that test IdP for local interactive use.
