# Detailed isometric furniture prototype

Branch: `experiment/detailed-isometric-assets`.

## New architectural study

Three live HQ rooms now share persistent AI simulation: work, lounge, rest. Use the sidebar room buttons (counts included) without reloading. New generated room files: `hq-lounge-v1.png`, `hq-rest-v1.png`. See [rooms-prompts.md](rooms-prompts.md) for prompts, routing behavior and current resting/transfer limits.

Entrance update: live HQ now uses `hq-entry-v3.png`, removing the lower-left workstation and chair for an open approach. The Entrance marker replaces Automation; collision and work/sitting targets follow this removal. One seated desk remains; no multi-room transfer is implemented yet. See [entry-v3-prompt.md](entry-v3-prompt.md).

Visibility update: HQ character heights are now 70 world pixels standing and 56 seated (+40%). Furniture redraw masks and translucent silhouettes are disabled; characters render fully opaque over the approved room, ordered against one another. This prioritizes visibility, not realistic furniture occlusion. Collision footprints still apply. Accurate chair/furniture foreground layers remain outstanding.

HQ now uses the generated character sheet for neutral/three-frame walking in four mirrored directions and the seated prototype at two calibrated desk spots. See [walk-prompts.md](walk-prompts.md) for generation prompts and animation limits. Both kinds currently share one model, distinguished by name badges; Office avatars remain unchanged.

Character style study: open `/character.html` to compare one developer's standing/seated poses against the room before building walk animations. Full prompts and limits: [character-prompts.md](character-prompts.md). Existing live avatars remain unchanged.

The approved `hq-furnished-v2.png` now drives the live `/?scene=home` scene. Characters use a calibrated source-space grid; furniture footprints block routing. Source polygon clips redraw furniture in front of characters by depth without altering original PNGs. This is a first interactive integration, not fully extracted sprites: hand-traced silhouettes can show fringes, chairs/plants need finer masks, and characters retain the original art style. The approved room lighting is baked in; the clock still follows local time, but this scene does not recolor for day/night or building themes. Office remains independent. The detailed-furniture switch applies to the older procedural scene, not the approved HQ image.

Open `/shell.html` to review the broad-board floor and matching empty room before adding furniture. See [shell-prompts.md](shell-prompts.md) for built-in image generation prompts and current integration limits. This review page does not replace the live HQ or Office.

Eleven original transparent raster assets were generated with built-in image_gen by separate agents: desk, rack, sofa, coffee bar, coffee table, meeting table, plant, armchair, office chair, bar stool and bunk bed. Full prompts and provenance: [desk](desk-prompt.md), [rack](rack-prompt.md), [lounge](lounge-prompts.md), [meeting](meeting-prompts.md), [rest](rest-prompts.md).

## Try it

Run `npm run dev`, refresh the Office, then open **ตั้งค่าฉาก**. The **เฟอร์นิเจอร์ละเอียด · ทดลอง** checkbox switches all eleven furniture types between generated sprites and original canvas drawing. Larger source previews appear below the switch. Save persists the choice; Cancel, X and Escape restore it. The experimental branch defaults to enabled unless the browser previously saved `false`.

The generated PNGs stay separate from characters, floor and walls. Collision footprints and object depth sorting are unchanged. Each image has a source crop in `detailedSprites` to remove transparent padding during drawing; the original PNG and its alpha are preserved. Failed or pending image loads use the original procedural furniture. Sleeping character positions follow the generated bunk mattresses.

## Scope and remaining art work

- This covers core furniture, not a finished reskin of every zone. Walls, glass, room structure and characters remain procedural.
- Bunks are flattened sprites: sleeping occupants render over rails, not between separate foreground layers.
- High-resolution originals increase first-load size; production needs optimized exports.
- The desk includes generated plant/books/pen-cup details, plus a soft halo. It is not a perfectly isolated pixel sprite and needs art cleanup before a production atlas.
- The rack has a faint halo. Its front faces the right visible side as required by the current room layout.
- At the existing 2×1 desk footprint, fine texture is intentionally downscaled. A larger room/sprite scale and matching characters/chairs would be needed to reach the reference's density consistently.
- Generated furniture does not recolor with the building palette. Cyberpunk or Industrial Loft currently gives the closest match.
- No character or animation assets have been replaced in this prototype.

The PNG files are generated project assets; the Kenney and Pixelarticons licenses in neighboring directories cover their respective original assets, not these new PNGs.
