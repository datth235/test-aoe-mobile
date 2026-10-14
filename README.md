# Ages of Dominion — Milestone 1

Original mobile-browser RTS foundations, built with Phaser **3.90.0**, strict TypeScript, Vite, and vite-plugin-pwa. This milestone is a land explorer, not a playable RTS match yet. M2 has not been started.

## Status

- Production build: passed, zero TypeScript errors.
- ESLint: passed, zero findings.
- Automated tests: six passed (seed reproduction, spawn clearings and wood placement on both map sizes, seed variation, all isometric tile-center round trips, fixed simulation tick and stall cap).
- Production PWA output: manifest, icons, service worker and precache generated.
- Browser interaction, real Android/iOS testing and Render deployment: **pending**. No live Render URL is claimed.
- Vite reports its expected large-chunk warning for the Phaser engine (~1.21 MB minified / 332 KB gzipped). This is not a TypeScript error.

## Assumptions and scope

M1 implements Boot → Preload → Tap-to-Start → Main Menu → minimal Setup → Game + UI, two seeded maps (64/96), a Town Center placeholder, camera gestures, pause, browser hardening, PWA packaging and Render configuration. Setup exposes size and a new-seed button; edit `src/data/match.ts` to enter a specific reproducible seed. AI options, color selection, settings, localization, resource counters and other gameplay screens belong to later milestones. There are no villagers/scout yet.

All in-game terrain, trees and the Town Center are original runtime Phaser Graphics textures. App icons are original locally generated geometric art, not external game assets. No remote fonts, images or runtime CDNs are required.

## Local run

Use **Node 20.19+**, Node 22.12+, or a current Node 24 release. The implementation was checked with Node 24.19.0; `.node-version` pins that version for Render and CI. The stricter lower bound follows Vite 7's requirements.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Tap to start, choose a map size, then Begin exploration. On desktop: left-drag the land to pan, wheel to zoom. Home returns to the Town Center. Plus/minus buttons provide an alternative to pinch/wheel.

```sh
npm run build
npm run preview
npm test
npm run lint
npm run format:check
```

`dist/` is the deployable static build. Dependencies are locked in `package-lock.json`; do not commit `node_modules/` or `dist/`. Vite dev mode intentionally does not enable the production service worker.

## Phone over LAN

1. Put your computer and phone on the same Wi-Fi network (disable client isolation if your router enables it).
2. Run `npm run dev` and open Vite's **Network** URL on the phone, such as `http://192.168.1.25:5173`. Use the actual printed address; localhost on your phone refers to the phone.
3. If unreachable, allow Node/Vite through the computer firewall and confirm the LAN address. In WSL, networking/firewall forwarding may need configuration; running Node from Windows can simplify LAN testing.
4. Turn the phone to landscape; portrait should show the rotate overlay.
5. Test one-finger drag, two-finger pan, pinch, pause/resume and the Home button. Touch gestures must not scroll/zoom the browser page.
6. For the production bundle, run `npm run build` then `npm run preview` and open its Network URL (normally port 4173).

HTTP LAN testing covers input and rendering. Service workers/PWA installation require a secure context; a plain HTTP LAN address usually does **not** qualify. Test install/offline behavior on the Render HTTPS URL, not the LAN dev server. Fullscreen/orientation locking is best effort; rejecting it must not block play.

## Deploy to Render through GitHub Blueprint

1. Create a GitHub repository and upload the complete source with `package-lock.json` and `render.yaml` at the repository root. For a new empty repo:

```sh
git init -b main
git add .
git commit -m "Implement M1 browser RTS foundations"
git remote add origin https://github.com/YOUR_USERNAME/ages-of-dominion.git
git push -u origin main
```

Replace the owner/repository URL with the repository you actually created. Never overwrite an existing project or force-push for this setup.

2. Sign in to Render and connect your GitHub account/repository.
3. Choose **New → Blueprint**, select the repository and let Render read `render.yaml`.
4. Review the Static Site definition. Build: `npm ci && npm run build`; Publish: `./dist`. If deploying from a monorepo, set the service Root Directory to this project's folder.
5. Deploy and wait for the service to show its successful live deploy.
6. Open the **actual HTTPS onrender.com URL returned by Render** on desktop and phone. Do not guess the URL from the service name.
7. Check that `/manifest.webmanifest`, `/sw.js`, `/icons/icon-192.png` and `/icons/icon-512.png` load. In browser DevTools, confirm Application → Manifest and Service Workers have no errors.
8. Test the latest two Chrome Android and Safari iOS versions on real devices before marking M1 complete.

The supplied Blueprint sets `no-cache` on application entry/service-worker requests and one-year immutable caching on hashed `/assets/*`. The Vite `base` is `./`; manifest scope/start URL target the **site root**. Subfolder hosting is not supported in this milestone.

## Install as a PWA

**Android Chrome:** open the Render HTTPS URL, wait until the first load finishes, then use Chrome's menu → Install app / Add to Home screen. Launch from the new icon. The manifest requests standalone landscape mode; Fullscreen API is separately attempted after Tap to Start.

**iPhone/iPad Safari:** open the HTTPS URL in Safari, Share → Add to Home Screen → Add. Launch from that icon and rotate to landscape. iOS may reject Fullscreen API and cannot be relied on to lock landscape; the rotate overlay is the fallback.

**Offline:** first visit online, wait for service-worker installation, reload online once so the worker controls the page, then close the app, turn on airplane mode and reopen. Both maps and runtime-generated graphics should work without network access. Offline mid-match saves are not part of M1.

**Updates:** make a visible UI text change and deploy a new build. Reopen the installed app online. When a waiting worker is found, the toast reads “New version available – tap to reload”. Tap it to activate the new worker and reload. The app also checks for updates hourly while visible. M1 has no game saves, so accepting the update restarts exploration.

## Architecture

- `sim/` contains map generation, walkability and a capped 15 Hz clock with no Phaser imports. Map generation uses integer-seeded Mulberry32; it never consumes the renderer's RNG. Visual tile variations do not affect simulation.
- `render/` converts grid coordinates to 64×32 diamonds, generates shared textures, assigns terrain/entity depths and culls images only when camera/viewport changes. Trees and the Town Center sort by their ground-contact world y.
- `input/` owns native canvas pointer gestures. It ignores gestures beginning in top/bottom HUD strips, tracks two pointers, resets baselines when a finger leaves and preserves the world position beneath a pinch center. Zoom clamps to 0.5–2.0.
- The `UI` scene observes the clock and emits typed camera/pause intent through `EventBus`; simulation logic does not live in UI. Timer text updates once per second, debug values twice per second.
- Browser viewport/visibility handling is isolated in `main.ts`. Phaser Scale.RESIZE follows `visualViewport`, safe-area-aware HUD elements stay inside screen cutouts, hidden/portrait states sleep the render loop, and manual pause stops the clock and camera independently.
- Phaser 3.90 has no `GameConfig.resolution` field. M1 deliberately uses a **1× CSS-pixel backing buffer**, meeting the requested ≤2 DPR cap without unsupported configuration or coordinate mismatches. High-DPI quality tuning can follow profiling in M10.
- `?debug=1` displays FPS, 0 units, simulation tick, zoom and instrumented WebGL draw calls. Canvas fallback reports draw calls as n/a. Instrumentation is debug-only.

The future command queue, entity interpolation, pathfinding worker, pools and gameplay managers are intentionally reserved for their milestones rather than introduced as empty implementations. The current clock exposes interpolation alpha for M2.

## M1 acceptance checklist

Record device model, OS/browser version, URL/deploy ID and result for each check. This checklist remains **unverified** until exercised in a browser/device.

- [ ] Tap to Start opens the menu even when fullscreen/orientation requests are denied.
- [ ] Choose both map sizes; terrain, lake, clustered trees and Town Center are visible.
- [ ] Restart the same seed and size; map layout matches.
- [ ] Pan using one and two fingers; adding/removing a finger does not jump the camera.
- [ ] Pinch clamps at 0.5× and 2×; wheel and +/- also clamp.
- [ ] Home returns to the Town Center; the camera focus cannot escape the rectangular map envelope.
- [ ] HUD buttons do not pan the map. All buttons are at least 48 CSS px tall.
- [ ] Pause freezes the timer and blocks camera gestures; Resume restores input.
- [ ] Return to menu and start another map; no duplicate listeners or previous clock accumulator.
- [ ] Portrait shows the rotate overlay; landscape restores the game.
- [ ] Hide the tab/switch apps for 10 seconds; timer does not accumulate those seconds.
- [ ] Resize/address-bar/fullscreen changes do not stretch or clip the canvas/HUD.
- [ ] Test 16:9 and 20:9 landscape and a notched device.
- [ ] No browser context menu, native page scrolling or pinch page-zoom during play.
- [ ] Render build is successful; site loads over HTTPS with no JS/asset errors.
- [ ] Android/iOS home-screen install succeeds; offline reload works after first controlled visit.
- [ ] New deploy shows update toast; accepting it loads the new version.
- [ ] Debug FPS meets at least 30 FPS while exploring both maps on target devices.

The 60 FPS / 100-unit target cannot be validated in M1 because units do not exist yet.

## Known limitations

- Not deployed to Render yet; no browser/physical phone validation has been performed in this workspace.
- No units, selection, commands, pathfinding, combat, resource economy, AI, fog, minimap, saved matches or sound effects. The start gesture resumes Web Audio only.
- Seed reproduction is supported for the same generator version, not guaranteed after generator algorithm changes. Only nearby wood/clearings are equalized now; food/mineral fairness comes with resource-node placement.
- The camera clamps its **focus** to the map's rectangular envelope; some background can remain visible around diamond edges and at low zoom.
- The medium map creates individual static tile/tree images once at setup. Visible rendering is culled, but initialization/display-list traversal remains proportional to map size. Chunk baking should be evaluated on-device before later 100-unit claims.
- UI text is English only. Browser fullscreen, orientation locking and PWA install presentation vary by browser.
- WebGL context-loss recovery and aggressive memory-pressure testing are pending.

## Deployment handoff

GitHub account `datth235` is connected, but no accessible repositories were returned. The exposed GitHub tools support writes to existing repositories and cannot create a repository. Create an empty repository named `ages-of-dominion`, grant the GitHub connection access to it, and provide its URL. Render is connected and lists `My Workspace`; confirm that workspace before creating the Static Site. No repository, service or live deploy has been created yet.

The archive includes the complete source plus the already-built `dist/` directory. Extract it before running npm commands. `.github/workflows/ci.yml` repeats format/lint/test/build on push and pull requests and uploads the static build; its first hosted run is pending.

## Complete file inventory

See `FILES.md` for every source/configuration/icon/test file. All delivered source files are complete, with no omitted implementation placeholders.
