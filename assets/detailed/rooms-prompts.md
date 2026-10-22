# HQ lounge and rest rooms

Built-in image_gen, two separate generations using `hq-entry-v3.png` as style/camera reference. Originals preserved as transparent RGBA PNGs, 1536×1024.

- `hq-lounge-v1.png`: sofa, coffee table, coffee bar, bookshelf.
- `hq-rest-v1.png`: two bunk units, four berths.

Live HQ has three view buttons with per-room AI counts. Selecting a view does not reset events or simulation. Idle agents move to the lounge; at local night after three idle minutes they move to rest. New activity returns them to work on the next animation update. Transfer is immediate via each room's spawn, not a walking-door transition. Room-specific collision footprints and open foreground roaming targets are calibrated from the source artwork. All agents keep updating even when their room is not selected.

Limits: generated rooms are flattened art and characters stay in the foreground. Rest currently means standing/resting near the beds, not a lying animation or berth occupancy system. No sofa-sitting pose or room door animation yet. Room lighting is baked into art; local time controls room assignment only. Office remains independent.

## Lounge prompt

Use case: stylized-concept. Image1 is STYLE/CAMERA/ARCHITECTURE reference, not a room to retain furnishings. Create a new room in the SAME Agent HQ: identical square floor diamond, isometric camera, full silhouette in1536x1024 landscape, tall joined midnight navy paneled back walls, broad warm walnut boards, warm top-left lamps, restrained cyan accent at rear corner, thin navy slab edge. Genuine transparent background. Same hand-painted detailed game art, large readable furniture, coherent scale, not photorealistic. No people, characters, text, labels, logos or external backdrop. Leave the FRONT third of floor and a central circulation lane open for animated agents, with furniture mainly along back walls. Room is a cozy LOUNGE. Left back wall large navy leather sofa with two muted teal pillows. Right back wall compact walnut coffee bar with espresso machine and two stools. A low walnut coffee table on a small dark teal rug toward rear-center, two small mugs. Walnut bookshelf and a couple leafy planters. No desks, computers, servers, meeting table, beds, doors or new front walls. Not a sparse showroom: cohesive furnished sitting room with clear open front walking area.

## Rest prompt

Use case: stylized-concept. Image1 is STYLE/CAMERA/ARCHITECTURE reference, not a room to retain furnishings. Create a new room in the SAME Agent HQ: identical square floor diamond, isometric camera, full silhouette in1536x1024 landscape, tall joined midnight navy paneled back walls, broad warm walnut boards, warm top-left lamps, restrained cyan accent at rear corner, thin navy slab edge. Genuine transparent background. Same hand-painted detailed game art, large readable furniture, coherent scale, not photorealistic. No people, characters, text, labels, logos or external backdrop. Leave the FRONT third of floor and a central circulation lane open for animated agents, with furniture mainly along back walls. Room is a calm REST ROOM. Exactly TWO compact walnut bunk-bed units (four sleeping berths total), navy blue mattresses and cream pillows, one unit along each back wall. Minimal warm bedside lamps, a low walnut cabinet, small plant. Center and front floor remain clear for approach. No sofas, coffee bar, computers, office desks, server racks, rugs over approach, people, doors or new front walls. Beds mostly along rear perimeter so characters can stand near their foot ends.
