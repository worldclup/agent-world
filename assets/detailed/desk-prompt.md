# Developer workstation prototype v1

- Asset: `desk-workstation-v1.png`
- Created with built-in `image_gen`; generated original copied intact into this directory. No background removal or raster modification.
- Original: `/Users/jetniphatpanphol/.codex/generated_images/01a15f19-873a-7b50-9700-f94a3710ba67/exec-c76ddb44-f037-4114-bcbf-04cb80aa70a1.png`
- Dimensions: 1536 × 1024, RGBA PNG. Inspected visually with `view_image` and decoded PNG alpha independently: range 0–254; 604739 of 1572864 pixels have nonzero alpha.
- Nonzero-alpha bounds: x=43, y=17, width=1399, height=992. Includes soft monitor/ambient glow; do not use this as a collision footprint.
- Suggested ground front anchor: approximately (966, 991), normalized (0.629, 0.968). Confirm in the game preview before placing over a grid.
- Intended footprint: 2 × 1 isometric tiles. Display at a larger scale for asset review; tiny 36-pixel rendering loses fine detail.
- Caveats: generated extra plant, books, and pencil cup; approximate isometric orientation and fine pixel texture require review at the final scene scale. This is a prototype furniture cutout, not an animation sprite sheet.

## Final generation prompt

Use case: stylized-concept

Asset type: isolated furniture sprite for an isometric office game.

Primary request: One highly detailed handcrafted pixel-art developer workstation: dark warm walnut desk, two glowing cyan-blue monitors showing abstract small code strokes, keyboard, mouse, ceramic mug, compact under-desk PC.

Scene/backdrop: genuinely transparent background, no background plane.

Style/medium: refined rich retro isometric pixel art with crisp controlled pixel edges, nuanced dark wood grain and restrained cyan monitor lighting; dark sci-fi office aesthetic.

Composition/framing: strict 2:1 isometric, horizontal ground axes slope plus/minus 0.5; desk front user-facing long side toward bottom-left, back edge toward top-right. Entire single asset centered with transparent margin, no clipping. Desk approximately twice as wide as deep. View from above showing desk top and front/side cabinetry.

Constraints: furniture only; no person, no chair, no floor tile, no walls, no room, no labels, no logo, no watermark. No perspective vanishing points. All screens and desk parts share one consistent isometric orientation. Actual transparent alpha background.
