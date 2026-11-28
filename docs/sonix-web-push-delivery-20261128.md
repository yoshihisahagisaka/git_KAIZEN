# SONIX Web Push delivery candidate

- Canonical source: existing actor-specific request notifications. One durable claim per notification/subscription. Claim before I/O; no automatic resend of SENDING, UNKNOWN or rejected claims. ACCEPTED denotes push provider acceptance, not device display. GONE revokes the subscription. Never modifies acknowledgement or Work.
- Short-lived delivery: only unread notifications created since enrollment and within 24 hours; provider TTL 60 seconds. Current session membership, active operator, service, contract, channel, party and READ are checked immediately before sending. Within-tenant ambiguous active endpoints are excluded. A concurrent revocation after the last check cannot recall a submitted notification; generic content only and detail still requires authenticated READ. Global active endpoint uniqueness and tenant-local stale session cleanup are implemented in the next candidate. Multi-tab/re-login and actual-device races still require acceptance.
- Encrypted payload is only version and request UUID; no company, caller, content or arbitrary URL. HTTPS allowlist, no redirect, bounded timeout. Do not log endpoint, keys or response bodies.
- Explicit tenant-scoped one-shot runner only; no scheduler or Cloud Run Job created. Disabled unless FACTACT_WEB_PUSH_ENABLED and FACTACT_WEB_PUSH_DELIVERY_ENABLED are both true, matching VAPID key pair and subject configured, and FACTACT_WEB_PUSH_TENANT_ID specified. Never execute the enabled runner during synthetic tests.
- Activation requires review of dependency/security scan, actual browser and device acceptance, worker deployment and schedule approval, session lifetime and operational recovery, monitoring of SENDING/UNKNOWN, and separate Go. No production migration or external send in this candidate.

## Worker packaging and operational gates
- Build includes dist/worker/request-push-delivery.js; the existing runtime image can run it using node without development dependencies or OIDC secrets.
- Worker uses the restricted factact_runtime role and TLS or explicit loopback proxy; only the runtime DB credential and VAPID secrets are required.
- One active endpoint globally; conflict returns generic 409, including across tenants. Never automatically transfer ownership. Previously revoked rows remain as history; a new registration has a new ID.
- The migration stops on duplicate active endpoints or oversized endpoints; do not arbitrarily resolve pre-existing duplicates.
- Tenant-local cleanup retires invalid sessions before claiming. A live check immediately before sending is mandatory. The unavoidable final check-to-network race is mitigated by generic payload and authenticated detail access.
- Disabled command smoke test: FACTACT_WEB_PUSH_DELIVERY_ENABLED=false node dist/worker/request-push-delivery.js
- Before activation: build and scan exact immutable image, verify npm dependencies, run isolated synthetic delivery tests, establish tenant and secret bindings, approve schedule and concurrency policy. No GCP creation, deployment or live send in this candidate.
