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
