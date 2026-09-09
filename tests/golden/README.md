# JOIN Golden Test gate

GT-01–GT-12 are specified in docs/15-first-vertical-slice-contract-v1.md.
They are not implemented or claimed passing by the bootstrap.

After architecture review, implement them alongside commands, in document 15 order.
Use deterministic repository-owned fixtures, database-backed command tests, and
the browser acceptance flow. No conditional missing-fixture skips. The bootstrap's
database isolation tests cover prerequisites only, not GT-11 across Work/Change/Relation.

Pattern sources: atlib-sales-tools/test/kaizenAssessment.golden.test.ts and
test/fixtures/kaizenAssessmentGolden.json; atlib-cashflow/app/test/cashflowContract.test.ts.
The external-spreadsheet skip in atlib-cashflow/app/test/goldenImport.test.ts is excluded.
