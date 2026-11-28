# SONIX MOT/TEL CTI reception

## Entry point

`/support/cti?tel=%TEL`

The production origin and the installed MOT/TEL client's
URL expansion must be confirmed before activation.

## Behavior

- Telephone number is an unverified search hint.
- Reuse scoped member lookup and recent inquiry history.
- Never create an Event or Work merely by opening the URL.
- No automatic beneficiary confirmation or authority grant.
- Unknown and withheld numbers use manual reception.
- Remove query from the browser URL immediately.
- Do not save caller numbers in browser persistent storage.
- Discard caller hint on logout or tenant context switch.
- Existing authentication and API permissions remain required.

## Acceptance gates

- Verify actual MOT/TEL Windows client URL expansion.
- Verify reverse proxy and load balancer logs omit caller data.
- Verify signed-in number lookup and multiple candidates.
- Verify withheld and unregistered numbers.
- Verify logout and tenant isolation.
- Verify browser back/refresh and unsaved-work behavior.

Do not activate in production until acceptance is complete.
