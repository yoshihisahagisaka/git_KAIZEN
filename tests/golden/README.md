# JOIN Golden Test gate

GT-01–GT-12 are specified in docs/15-first-vertical-slice-contract-v1.md.
They are implemented in `join.test.ts` against real PostgreSQL with the restricted runtime role.

Run `npm run test:db` for bootstrap database tests plus GT-01–GT-12 and additional
authority, concurrency, correction and HTTP security guards. Fixtures are deterministic
and repository-owned, with no missing-fixture skips. Run `npm run test:browser` after
`npx playwright install chromium` for the browser flow; its injected test IdP does
not substitute for live Google OIDC deployment verification.

Pattern sources: atlib-sales-tools/test/kaizenAssessment.golden.test.ts and
test/fixtures/kaizenAssessmentGolden.json; atlib-cashflow/app/test/cashflowContract.test.ts.
The external-spreadsheet skip in atlib-cashflow/app/test/goldenImport.test.ts is excluded.
