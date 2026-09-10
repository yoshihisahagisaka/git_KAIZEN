# Human-usable JOIN — UX review checkpoint

Date: 2026-09-10. Canonical UX inputs: documents 17 and 18 from origin/main
653d1fd, merged without replacing the previously reviewed JOIN implementation.

## Operator experience

The existing screens now follow 入社予定 → 必要な準備 → 担当 → 設定・手順・対象者の状況
→ PC候補 → 準備・引き渡しの記録 → 引き渡し確認 → 管理情報へ反映 → 完了.
Normal task completion uses Japanese consequence-based labels. Internal IDs,
evaluation snapshots and lifecycle names remain in expandable audit details.

- Persistent navigation exposes only existing Home, personal tasks, JOIN and
  Person views. Home shows actual owned work and its next step, with no invented
  metrics, deadlines, teams or recommendation scores.
- Task responsibility, current operator and originating JOIN are visible before
  action. The initial assignment explanation is derived only when consecutive
  creation/ownership audit entries establish it. Other assignment reasons remain
  未確認. The current operator is not represented as a separately assigned worker;
  the existing Core has no separate Assignee field for this slice.
- A bounded `join-guidance.ts` presentation fixture supplies versioned demo
  procedure and supporting knowledge only for the seeded Contract Profile v1.
  It is labeled as demo content, not approved production instructions or evidence.
  Other contracts show unknown procedure/configuration with a concrete contact
  action. No content management system or new authoritative configuration store.
- Company-PC necessity comes from the existing evaluation. OS, application,
  security and VPN configuration details, recipient-specific differences and
  real-device suitability remain unknown unless already supported by data.
  The screen tells the operator whom to consult before proceeding. These are
  preparation guidance, not new persisted requirements or machine-enforced
  completion gates. Finishing PC assignment does not resolve those unknowns.
- PC eligibility comes from the existing available-device query. No standard
  configuration verification or automatic recommendation is fabricated.
  Candidate selection is explicitly temporary browser state: no command, device
  reservation, Action or Relation is created. Reload clears it.
- The operator records actual execution once, reviews its handover evidence,
  then separately reflects the confirmed PC into managed information. Each
  step explains what changes and what does not. The existing correction and
  explicit replacement paths remain available; historical records are retained.

## Preserved boundaries

No Domain, Application, HTTP command, database adapter or migration changes were
made for this UX iteration. The same authentication, Contract Authority,
self-review, exact Origin/session-CSRF, RLS, verification and atomic Commit
boundaries remain authoritative. No additional domain features were introduced.

Earlier local setup work is preserved in its own commit: restricted-role password
configuration, a separate one-shot Google identity verifier and explicit issuer/sub
binding, plus `docs/local-join.md`. The verifier does not create an application
session or grant access. Local identity verification and explicit binding succeeded;
this is distinct from the test IdP used by automated browser acceptance. No secrets
or local identity output are tracked, and no sibling repository was changed.

## Verification and limits

- `npm test`: 16 bootstrap tests pass.
- `npm run test:db`: 31 database tests pass, including unchanged GT-01–GT-12.
- `npm run test:browser`: three browser tests pass, including the original
  document 15 lifecycle with translated labels and focused UX-GT-09–17 assertions.
  TypeScript, client and server builds also pass.
- Ownership/executor differences and unknown procedure/no-candidate scenarios use
  explicitly bounded read-projection fixtures in two UI tests. They do not claim
  that new Assignee or configuration domain capabilities exist.
- The main acceptance test uses real application routes and isolated PostgreSQL;
  it checks selection creates no Action/Relation, handover confirmation alone
  leaves Person unknown, final reflection reuses recorded information, and the
  resulting Fact persists after reload. A preparation screenshot is saved to the
  ignored Playwright results directory for visual review.

Automated assertions cover visible explanations and state transitions, not a human's
understanding. UX-GT-09–17 still require Product Owner / first-time operator review
of comprehensibility. Live Google interactive acceptance is separate from the
automated test IdP. Hosted Supabase deployment privileges remain a later gate.

Stop at this checkpoint for architecture/UX review. No SUPPORT, AI, KAIZEN,
MOT/TEL, Zoho, generic CMS or workflow builder was added.
