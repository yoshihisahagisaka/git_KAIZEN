# FACTACT Human Review 1 — localhost runner

This development helper starts the integrated FACTACT UI with a disposable,
loopback-only PostgreSQL 17 database. It never reads the configured `DATABASE_URL`,
does not use Docker and does not provide a test authentication bypass.

## Prerequisites

- Node.js 24 and `npm ci`
- built client: `npm run build`
- existing ignored development environment containing the Google OIDC client
- exact registered callback `http://localhost:5173/auth/callback`
- port 5173 available on loopback

Do not copy OAuth secrets into this worktree. Point the runner at the existing
ignored environment file.

## Isolated lifecycle check

This verifies migrations, seed, restricted runtime role, Owner Gap fixture and
safe cleanup without opening a browser or performing Google login:

```powershell
npm.cmd run human-review -- --env-file C:\atlib\git_KAIZEN\.env --check
```

## Fresh Google verification and interactive start

The application accepts only the real Google OIDC provider. The one-shot verifier
creates an ignored proof containing issuer, subject and verification time, never
OAuth tokens. It expires after 30 minutes.

```powershell
npx.cmd tsx --env-file=C:\atlib\git_KAIZEN\.env scripts/verify-google-identity.ts
npm.cmd run human-review -- `
  --env-file C:\atlib\git_KAIZEN\.env `
  --identity-proof .env.google-identity.json
```

Open `http://localhost:5173`, use Google login, then review `#/responsibility`.
Google verification alone grants no role: the runner explicitly binds the verified
subject to the seeded Synthetic Operator inside only the disposable database.

## Synthetic scope

The existing seed supplies atLIB Development, Example株式会社, 田中 一郎, PC-0073,
情シスKAIZEN and the three internal read roles. It creates no real Work or Registry
outcome. Human reviewers create Device Context, Unknown/BYOD observations,
Continuation, Waiting/Resume, Follow-up and explicit Close through the UI.

The runner additionally creates one SUPPORT Work owned by `Synthetic 前担当者`,
then marks that synthetic Operator inactive. This makes Owner Gap visible without
automatic transfer or production data.

## Stop, reset and abnormal exit

Ctrl+C stops the web server, closes both pools, stops Embedded PostgreSQL and removes
only a `.factact-human-review-*` directory under this worktree. Restarting the command
creates a clean database and therefore acts as reset.

After forced process termination the directory may remain, but PostgreSQL is bound
only to a random loopback port. Do not delete it with a broad wildcard. Confirm that
no runner process remains, then remove only the exact `.factact-human-review-*`
directory recorded for that run. The next normal run uses a new directory.

This runner does not migrate or deploy Production, contact a configured business
API, or interact with Docker containers and volumes.
