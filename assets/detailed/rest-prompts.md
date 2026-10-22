# Detailed rest and seating assets

Generated with the built-in `image_gen` tool in three separate calls on 2026-10-21. No CLI/API fallback. Original generated PNG bytes copied into this project with alpha preserved; no cropping or recoloring was applied. These are AI-generated assets, not copied third-party game sprites. Inspected each original with `view_image`.

## Integration measurements

Physical crop bounds are `[x,y,width,height]` measured at alpha >= 128 to exclude low-opacity fringe. Actual files retain their complete original alpha.

| File | Native size | Physical crop | Notes |
| --- | --- | --- | --- |
| bunk-bed-v1.png | 1536×1024 | [332,36,875,955] | Upper mattress center approximately (770,327); lower (766,663). Long axis down-right. Ladder on right. |
| office-chair-v1.png | 1245×1263 | [255,67,786,1152] | Rear-facing navy chair, occupant faces top-right. |
| bar-stool-v1.png | 1217×1293 | [244,76,730,1138] | Walnut seat, dark metal legs and footrest. |

The bunk is a single flattened image: compositing an occupant behind the upper front rail would require an additional foreground rail layer or masking. Current mattress centers are visual estimates, not precise collision coordinates.

## Bunk bed prompt

Use case: stylized-concept. Asset type: transparent standalone isometric game furniture sprite. Create ONE dark walnut two-tier bunk bed for a detailed handcrafted pixel-art dark tech office, matching rich walnut material, charcoal outlines, restrained cyan edge highlights and crisp stepped pixel shading. Two navy blankets and pale pillows, both upper and lower mattresses clearly visible. Ladder on right end. Long axis runs down-right. Open front faces bottom-left, unobstructed by any wall. Strict 2:1 isometric projection, horizontal world edges slope +/-0.5, vertical uprights vertical, orthographic no perspective convergence. Footprint 2x1 grid units. Complete object fully visible with all legs and ladder, centered with transparent padding. Truly transparent alpha background. No floor tile, no walls, no people, no text, no logos, no ambient glow outside object, no cast shadow background.

Source: `/Users/jetniphatpanphol/.codex/generated_images/01a15f19-d0ed-7a23-8e32-961be1522ddd/exec-6eb27a90-7941-470e-abef-5e595a678b79.png`

## Office chair prompt

Use case: stylized-concept. Asset type: transparent standalone isometric game furniture sprite. Create ONE navy padded ergonomic office swivel chair with charcoal dark metal five-wheel base, armrests and detailed stitched upholstery. Backrest is toward viewer; occupant would face top-right. Rich handcrafted pixel-art dark tech office style, crisp charcoal outlines, restrained cyan reflected edge highlights, stepped pixel shading, fine material texture. Strict 2:1 isometric projection, horizontal world edges slope +/-0.5, verticals vertical, orthographic no perspective convergence. Footprint 1x1 grid unit. Full chair completely visible including all wheels, centered with transparent padding. Truly transparent alpha background. No person, no desk, no floor tile, no walls, no text, no logos, no glow outside object, no cast shadow background.

Source: `/Users/jetniphatpanphol/.codex/generated_images/01a15f19-d0ed-7a23-8e32-961be1522ddd/exec-e6470453-92ff-4cb4-97ed-1676e74aaf53.png`

## Bar stool prompt

Use case: stylized-concept. Asset type: transparent standalone isometric game furniture sprite. Create ONE compact bar stool with square dark walnut seat, slim charcoal metal four legs and metal footrest. Rich handcrafted pixel-art dark tech office style, crisp charcoal outlines, detailed walnut grain, restrained cyan reflected edge highlights, stepped pixel shading and fine material texture. Strict 2:1 isometric projection, horizontal world edges slope +/-0.5, verticals vertical, orthographic no perspective convergence. Footprint 1x1 grid unit. Full stool completely visible including all feet, centered with transparent padding. Truly transparent alpha background. No person, no bar, no floor tile, no walls, no text, no logos, no ambient glow outside object, no cast shadow background.

Source: `/Users/jetniphatpanphol/.codex/generated_images/01a15f19-d0ed-7a23-8e32-961be1522ddd/exec-524d8fec-b86a-43c3-9145-55c25dff3dcd.png`
