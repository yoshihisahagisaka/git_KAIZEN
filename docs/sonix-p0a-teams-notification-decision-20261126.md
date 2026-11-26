# SONIX ONE / FACTACT — Teams通知の承認済み範囲（2026-11-26）

Status: user-approved scope; technical delivery acceptance pending. Base: PR #137, CI success. Issue #101; Decision 5/6 and existing escalation lifecycle remain authoritative.

## Initial release
- atLIB records specialist request in FACTACT; automatically notify configured Teams channel per tenant/service, optional manually entered single email @mention.
- No SONIX-side request management UI, SMS, email fallback, PWA, user directory synchronization or individual chat in this release.
- atLIB records request progress (未対応 / 対応中 / 対応済み) and answer. Notification success never means the person has read or accepted the request. Work ownership/status remains independent.
- Notification payload: opaque request identifier, generic request notice, optional mention address only. No customer name, inquiry text, phone, credentials, raw payload or grant disclosure. No public link or inaccessible customer UI. Keep current Teams collaboration operational.
- Use Microsoft Teams Workflows: webhook trigger, resolve optional address with Get an @mention token for a user, post in fixed channel. Guest UPN may differ from ordinary email: verify actual notification in the existing channel. On token resolution failure post without mention and record fallback. Never blindly repost after an ambiguous post failure.
- Use only deployment-owned HTTPS workflow endpoint and secret, mapped by tenant/service. No client-supplied endpoint or redirect; don't log URL or credentials. No automatic real send before PoC and release authorization.
- Persist notification intent atomically with existing escalation event; dispatch after commit. Request event ID is correlation/deduplication key; store each attempt and result independently. Manual retry for known failure; uncertain submission requires operator verification to avoid duplicates. HTTP 2xx means webhook accepted, NOT confirmed channel post. Need authenticated workflow result callback or equivalent verified receipt for POSTED / mention fallback, otherwise show accepted/unconfirmed.
- Initial adapter has no queue worker, endpoint configuration or real delivery; no production activation. Next slice: durable intent/attempt storage, per-service configuration, authorized dispatch/manual retry and status/UI. Avoid generalized notification platform.

## PoC acceptance
1. Dedicated test workflow and channel; normal post, single member mention, external SONIX account mention; inspect actual device notification.
2. Invalid/unresolvable mention falls back to ordinary post, reports degraded result. Verify no duplicate post when outcome uncertain.
3. Verify retry, timeout, non-2xx, disabled config, wrong tenant/service and log redaction. Notification failure must not roll back the escalation.
4. Configure owner/co-owner continuity and secret rotation. Confirm channel membership and tenant policy before real use.

Microsoft reference: https://learn.microsoft.com/en-us/power-automate/teams/send-a-message-in-teams

## Superseding decision — 2026-11-26, approved after live PoC
This section supersedes conflicting initial scope above; retain earlier text as decision history.
- Existing private Teams channel: live ordinary Adaptive Card POST HTTP 202 and visible Japanese card confirmed. Internal user mention activity confirmed. SONIX guest home UPN did not visibly resolve; atLIB resource-tenant Entra Object ID rendered a mention. Guest recipient activity and seven-person simultaneous mention remain rehearsal gates; no more live sends today.
- Use the existing Workflow template, Adaptive Card msteams.entities with resource-tenant Object IDs; no Graph, token lookup or workflow customization required for tested path. Service-owned active recipient roster; ALL / individual / NONE, default ALL subject to explicit confirmation. No raw identifiers from browser; roster membership never grants FACTACT access. No real roster or webhook committed.
- Generic response request includes collaboration/relay/visit and specialist escalation, not all requests imply escalation. Preserve Decision 5/6. Existing escalation records remain; do not classify relay as escalation.
- Teams card links to authenticated request detail on trusted application origin; no customer details in card. SONIX minimal portal: outgoing call request, incoming response-request list/detail, explicit status (未対応/対応中/対応完了), comments/result required on completion. atLIB sees updates and in-app notifications with direct links; initial polling ~30s, per-actor acknowledgement independent from request completion. No WebSocket or general workflow engine.
- Request completion never closes parent Work or changes owner. Separate delivery/acknowledgement from request status. Append-only attribution, revisions, idempotency and current authority on each read/write. External response authority limited to explicitly assigned service/recipient/request; do not reuse broad SUPPORT UPDATE as portal authority. Notification recipient is not a grant.
- Fit: current #138 tree includes common scoped intake, lifecycle escalation and explicit grant gate, but no identifiable dedicated SONIX outbound-call form/portal route in filename inventory. Verify issue and actual route/UI before claiming reusable portal; do not expose existing full SUPPORT history to external responders. Need explicit publication projection, narrow request authority, durable intent/attempts and portal E2E. No new Core object presumed; choose persistence after Fit/Gap.
- Actual send remains disabled until rehearsal/Go. HTTP 202 is accepted only; no automatic resend of ambiguous deliveries. With unchanged Workflow no verified posting/fallback callback; expose accepted/unconfirmed, do not claim mention fallback or delivery confirmation.

## Scope clarification — generic inbound request form (user-approved)
- SONIX-facing Web portal provides a generic 対応依頼フォーム, not a dedicated outbound-call form. 発信依頼 is one use case alongside investigation, relay and other IT-support requests; examples are not a fixed mandatory taxonomy.
- Reuse the same request/response/status semantics in both directions, with explicit sender, recipient, service and authority. Existing inquiry intake remains distinct; receiving a request must not implicitly authorize or complete a Work.
- Portal navigation: 対応依頼を登録 / 依頼一覧（送信・受信）. Keep the form minimal and avoid separate SONIX-only schemas or a workflow engine. Exact fields and existing asset fit remain implementation checks.
- This clarification supersedes references above to an outbound-call-only form or navigation. No production action.

## Request type selection — user-confirmed 2026-11-26
Both directions use the same required selection, with no preselected type: CALL_REQUEST（発信依頼）, SUPPORT_REQUEST（対応依頼）, INVESTIGATION_REQUEST（調査依頼）, INQUIRY（問合せ）, OTHER（その他）. Stable codes are implementation labels; preserve the five Japanese display labels exactly. Free-text request content supplements the category. Category does not imply escalation, priority, permission, owner transfer, or automatic completion. No category-specific workflow or SONIX-only schema. This supersedes earlier illustrative category lists. Implementation and acceptance remain pending.

## Onsite request type — user-confirmed 2026-11-26
Add ONSITE_REQUEST（オンサイト対応依頼） as a sixth selectable request category for atLIB-to-SONIX requests only. The five previously confirmed categories remain available in both directions. Onsite requests are used when remote support is insufficient and the SONIX representative is asked to perform onsite support. Filter permitted categories by configured request direction on the server and in the common form; no separate onsite workflow, SONIX-specific Core schema, implicit escalation, dispatch, ownership transfer or parent Work completion. The same request status, response history, Teams notification and authority rules apply. This supersedes the preceding five-category-only restriction. Implementation and acceptance pending.


## Teams recipient selection UI — user-approved 2026-11-26
Use checkboxes only (no Ctrl multi-select or ALL/SELECTED/NONE radio controls). Initially check all enabled service roster entries; provide Select all / Clear all and selected count. Desktop two columns, mobile one column. Explicit submission confirms selection. Map all checked to ALL, partial to SELECTED with internal roster IDs, zero to NONE (channel post without mentions, not suppression). For empty roster use NONE. Preserve server-side validation, current enabled roster checks and immutable notification intent; do not expose Entra Object IDs. No real send or deployment. Implementation pending.


## Mention selection UI — user-confirmed 2026-11-26
Use checkboxes for enabled configured Teams recipients, initially all unchecked. Provide select-all and clear-all controls; PC two columns, smartphone one column. No Ctrl multi-select or separate mode radio buttons. Zero selections means NONE (ordinary channel card without mention), subset means SELECTED, all explicitly selected means ALL. This supersedes the earlier default ALL decision. Preserve explicit confirmation on request submission, server roster validation and immutable intent; no browser Object IDs, no grant inference. UI implementation pending; no real notification or production change.
