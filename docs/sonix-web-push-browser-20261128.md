# SONIX Web Push browser policy
Approved: notifications default ON for eligible signed-in request users when deployment enrollment is enabled.
First permission request requires explicit user gesture. Later sign-in reconciles a granted permission without asking again; if the browser requires a gesture, offer a retry button. Deferred prompt is not opt-out. Explicit OFF persists per browser origin/device as a non-identifying boolean. No customer data or credentials in local storage.
Logout/context rotation invalidates the server session first and attempts local unsubscribe. A subscription from a prior session is removed before a new subscription is registered.
Status/revoke use current session, actor, tenant; no endpoints or keys returned. Service worker displays a generic notice and opens only a UUID request path. Current authenticated READ governs all detail. No offline caching.
Deployment enrollment remains disabled unless configured. No sender or actual push delivery in this slice.
Acceptance: iOS installed PWA, Android, permission denial, explicit OFF across sign-in, storage unavailable, multi-tab/session rotation, subscription expiry, VAPID delivery and current authorization recheck before send. No production activation.
