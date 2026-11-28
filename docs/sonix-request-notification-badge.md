# SONIX request notification badge

- Existing actor-scoped unread notifications remain canonical.
- Aggregate counts across currently authorized request contexts.
- Refresh while visible, on visibility change and after acknowledgement.
- Clear the badge on logout, context switch and authorization failure.
- Unsupported devices retain the normal in-app notification UI.
- No persistent browser storage or additional database table.
- No background push delivery in this implementation.

## Remaining acceptance

- Actual iOS installed PWA badge behavior.
- Android launcher-specific badge behavior.
- Session expiry, multiple tabs and tenant switch.
- Web Push subscriptions, VAPID, durable delivery and revocation.
- Background and closed-app receipt.
- Notification click with current authentication and authorization.

No production activation.
