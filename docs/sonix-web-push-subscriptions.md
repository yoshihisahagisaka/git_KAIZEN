# SONIX Web Push subscription foundation

## Scope

- Device subscription schema with FORCE RLS.
- Session-bound ownership.
- Strict endpoint and key validation.
- Authenticated registration and revocation routes.
- Default-disabled configuration.
- Existing service-request notifications remain canonical.

## Safety

No external delivery is implemented or enabled.
Never expose endpoint keys in logs or notification payloads.
Future dispatch must validate the stored session hash using
IdentityStore.readSession and recheck current request authority.
A stored subscription alone is never sufficient authority.

## Remaining integration gates

- Mount routes in application composition.
- Connect logout and context switch to revocation.
- Complete subscription lifecycle and expiration tests.
- Integrate browser opt-in and service worker.
- Implement VAPID delivery and durable delivery attempts.
- Verify endpoint compatibility on actual devices.

Do not activate in production.
