# Anansi demo and live environments

Use one shared codebase and two separate deployments, not independent copies of the product.

## System 1: presentation demo

Entry page: `dist/demo.html`.

- Guest gallery: `gallery.html`
- Curator gallery: `gallery.html?mode=curator`
- Curator dashboard: `index.html#overview`
- Public website (no 3D required): `catalogue.html`
- Lightweight artwork browsing: `catalogue.html#works`

Records currently remain in this browser. Artist replies and visitors are simulated. The curator query parameter is not an authorization boundary. Demo conversations are in memory and reset on reload.

Artwork and artist IDs link local records. Guest UUIDs are pseudonymous identifiers, not authenticated identities. Enquiries require a display name, not email or phone. Uploaded GLB files remain in IndexedDB on the current browser; other records use localStorage. Clearing browser data removes these records and files. Nothing is backed up to a server.

Exhibitions follow a browser-local draft → curator preview → publish-demo flow. Draft works are hidden from guest views. Publishing requires at least one placed work, but does not create a public deployment. Changes to installation geometry require reloading the gallery. Imported sculptures must be self-contained GLB 2 files, up to 25 MB and 150,000 triangles; missing assets show an explicitly labelled placeholder. Real shared storage, security and asset processing are deferred.

## System 2: live product — not implemented or deployed

The live deployment should expose guest gallery, curator gallery and curator dashboard routes under one address. Curator routes require authenticated, authorized access enforced by the backend, not a URL switch.

Keep demo and live database, object storage, credentials, browser-storage namespaces and deployment configuration separate. Do not migrate presentation enquiries or simulated messages into live records. Disable demo reply generation in the live build. Fail closed if live configuration is missing; never silently fall back to browser-local demo storage.

Sharing the codebase lets visual and accessibility fixes benefit both systems. Keep data access behind separate demo/live adapters when backend work resumes. Test live flows against a separate staging environment before production.

No live URL exists yet. Choose permanent demo/live addresses when deployment resumes; the local demo URL only works on the computer running the preview server.

## Public website presentation

The catalogue now opens as Anansi’s public front door. Hash-based routes provide Home, Exhibitions, Artworks, Artists, About, Saved works and individual exhibition/artist/artwork views. Published browser-local curator records appear alongside the clearly labelled Tidal Intervals presentation study. Draft works are excluded. Refresh the website after curator record changes.

Website saves use the same artwork IDs as the gallery. Its display-name-only interest form writes local enquiry records visible in the curator dashboard. This is not a live purchase, reservation, or sent artist message. Artist biographies show supplied data or an explicit missing-biography state; no real artist identity is invented. The dashboard remains at index.html and the 3D gallery at gallery.html.

Verified: homepage render, search, artwork story, saved collection, artist profile, exhibition detail, mobile menu/no horizontal overflow, and website enquiry receipt/readback in the curator dashboard. Controls use the gallery’s 10px button corners, teal primary fill, pale borders and light secondary treatment. Mobile checks use a browser viewport simulation, not a physical device.

## Cinematic website introduction

The homepage progressively enhances its original static opening into three native-scroll chapters: The space → The encounter → The story. A camera timeline reuses the existing Anansi GLB and ends at the Tidal Intervals installation. The website remains a presentation; this sequence does not install the curator's changing local artworks or create live visitor presence.

Three.js and the gallery model load only when the homepage requests motion. Still view and prefers-reduced-motion avoid starting the 3D scene. A loading poster, explicit still-view control, skip-introduction control, chapter shortcuts and an unavailable-3D fallback keep ordinary browsing reachable. Motion preference stays in this browser. Painting textures are displayed without extra tone mapping to retain their presentation colours.

Rendering is event-driven: frames settle after camera movement, pause offscreen/in hidden tabs, and scene resources are disposed when navigating away from Home. Mobile starts with lower resolution and no reflective-floor pass or shadow map. These safeguards are not a universal frame-rate guarantee.

Checked in the browser: desktop camera approach/artwork endpoint, mobile framing and horizontal fit, still/motion switch, skip introduction, reversible chapter controls and exhibition navigation. A settled render counter remained unchanged between observations; the exhibition page had zero canvases after navigation. The camera-path test covered 2,002 finite, continuous desktop/mobile samples plus clamped endpoints. Real-device performance and forced context-loss/reduced-motion environment tests remain outstanding.

The remaining homepage sections now extend the motion sequence using CSS and scroll updates only: a pinned exhibition image/story, progressive About-statement emphasis, staggered/parallax collection cards, keyboard/hover-linked artist artwork previews, and a full-screen closing image zoom. Artist previews use supplied artwork, with an explicit missing-image state; no invented portraits are added. The still-view switch disables section pinning and emphasis alongside the opening. Short mobile viewports use an unpinned exhibition layout. Browser checks confirmed mobile horizontal fit, complete featured content, keyboard artist selection and readable words in still mode. Section observers and listeners are disposed when leaving Home. No new canvas is used for these sections.
# Public website: reference-led design update

The public frontend is the intended foundation for the live Anansi website, not a disposable presentation. It is still a local presentation until shared storage, curator authentication, real enquiries, and private conversations are connected and verified. Existing demo labels remain truthful; no production backend has been provisioned by this update.

The homepage now uses `reference-home.js/css`: a full-screen entrance, pinned rotating framed artwork, image-and-type scenes, a responsive discovery directory, grouped FAQ and dark closing invitation. This supersedes the earlier homepage section-motion implementation. `public-theme.css` carries its typography, neutral palette and controls into catalogue, artist, exhibition, artwork detail, saved-work and about routes without changing their data paths.

Motion view loads the existing gallery GLB through `hero-gallery.js` and moves the camera even while the page is stationary. Its animation pauses offscreen, when the tab is hidden, in Still view, and on route disposal. Still view uses the architectural image. Reduced-motion users retain the still presentation; failed WebGL loads fall back to the image. Artwork rotation remains scroll-driven, separately lazy-loaded and disposed on navigation.

The rendered gallery model and the architectural concept image are different visual assets; this update does not claim that the model is photorealistic or that all devices can run it without lag.
