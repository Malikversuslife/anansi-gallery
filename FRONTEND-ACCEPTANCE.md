# Anansi frontend presentation acceptance

This is a local presentation build, not a production launch or authenticated application.

## Completed journeys

- Dashboard artist creation/editing, artwork creation/editing and removal with immediate Undo; linked roster records use stable IDs.
- Artwork story, image selection, type-aware placement and self-contained GLB storage in IndexedDB.
- Exhibition draft, curator preview and publish-demo path; empty exhibitions cannot publish. Draft exhibition works are not shown to guests.
- Profile editing and browser-local save with explicit field bindings and validation.
- Guest entry → appearance → gallery; artwork details → save, enquiry, simulated artist chat or viewing shortcut.
- Enquiries use display names and pseudonymous visitor IDs, not mandatory email/phone; curator can read messages and update status.
- Notification-driven simulated chat, invitation accept/decline, block/unblock and clearly labelled local report action.
- Fictional visitor interaction, personal music mute, seating, room shortcuts and photo composition with exhibition attribution.
- Personal graphics quality setting, WebGL loading/retry guidance and lightweight catalogue fallback.
- Mobile action and destination menus, modal back controls and themed scrollbars.

## Verified in this finishing pass

- Created a clearly labelled presentation artist, exhibition and 12-triangle GLB sculpture fixture through the dashboard.
- Verified publish guard, publication, actual GLB rendering and enquiry creation without contact details.
- Verified incoming simulated invitation, accept, block and unblock paths.
- Saved profile through its form; checked lightweight catalogue and graphics preference controls.
- Walked the curved physical staircase to the upper floor and back down its curved section. The route requires following the curve rather than walking through its inner railing.
- Automated checks: nine identity/linking/publication assertions and eleven movement-policy assertions; HTML inline script parsing and module syntax checks.

## Still required before a live launch

- Real-device/browser testing, especially touch controls, older mobile GPUs and Safari; measured performance/load budgets. No universal no-lag guarantee is possible.
- Real authenticated curator access, authorized artist identities, anonymous session credentials and recovery policy.
- Shared database/object storage, asset processing, live presence/chat, server moderation and rate limits.
- Durable backups, cross-device data synchronization, deployment separation and production security checks.
- Review rights/licences for presentation assets and music before public use.

Local data and uploaded files can be lost when browser storage is cleared. The labelled acceptance fixtures are presentation data, not real artists or submissions. See DEMO-AND-LIVE.md for environment separation.
