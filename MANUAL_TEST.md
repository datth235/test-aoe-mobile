# Mobile training flow

Run `npm run dev`, open the page in a landscape phone browser, and start a match. `?debug=1` enables the two test controls and the FPS display.

- [ ] Tap the villager near the Town Center. Barracks, Archery Range, and Stable appear in the bottom panel.
- [ ] Tap Barracks. Move a finger over clear ground or tap a site; the translucent ghost follows. Confirm and Cancel remain visible. A ground tap alone never places it.
- [ ] Tap Cancel, then repeat and tap Confirm. Wood drops immediately. The villager walks to the scaffold and its progress bar fills.
- [ ] Tap the finished Barracks. Clubman is enabled; Spearman and Swordsman show their age requirements. Train a Clubman and check that food drops immediately and a queue ring appears.
- [ ] Tap the queue ring. The item disappears and its full cost is refunded. Train again and let the timer finish; the unit spawns beside the Barracks.
- [ ] While the Barracks is selected, tap clear ground. The rally flag moves there. Train another Clubman and confirm that it walks toward the flag.
- [ ] Select the Town Center and train a Villager. Use its age button to unlock Bronze and Iron Age units. Repeat construction and training for the Archery Range and Stable.
- [ ] Spend food or fill population and check the disabled reason. Queue five units and check “Queue full” on the train button.
- [ ] With `?debug=1`, use “+1000 all resources” and “Instant build/train”; check that the controls are absent without the query parameter.
- [ ] Tap a UI button while a building is selected; the building stays selected and no world move or rally command is issued. Drag land to pan, pinch to zoom, and confirm a small tap does not pan.
- [ ] On Android Chrome, tap “⛶ Full” during a match, confirm the game fills the screen and the HUD fits, then tap “⛶ Exit”. The tap must not issue a world command. On iPhone Safari, confirm the button explains how to add the game to the Home Screen, then launch it from that icon.
- [ ] Check the browser console for JavaScript exceptions during the flow, then reload and repeat once in a production preview (`npm run build && npm run preview`).

The current simulation has no combat, gathering, building damage, or multiplayer. Decorative resource props and the Town Center chimney do not imply those systems are active.
