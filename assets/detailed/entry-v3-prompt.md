# HQ entrance edit · v3

Built-in image_gen edit of `hq-furnished-v2.png`; original retained. Output `assets/detailed/hq-entry-v3.png` is the live HQ art. Only the lower-left workstation ensemble was removed, restoring walnut flooring. Original alpha preserved.

Code removes the automation collision footprint and fallback desk/chair, moves the spawn entrance to grid(8,17), removes the old work/seated target(9,15), and replaces the Automation marker with Entrance. No room transfer or door system is added yet.

## Prompt

Use case: precise-object-edit. Edit target: supplied furnished isometric Agent HQ room. Remove ONLY the entire FRONT LEFT workstation (the large desk at lower-left, approximately source x270..780,y450..845), including its navy swivel chair, monitors, keyboard, mouse, mugs, plants ON THAT desk, vertical lamps, books and desk drawers. Fill the vacated footprint with seamlessly continued matching walnut floorboards. This lower-left space must become a broad unobstructed entry/walkway from the front-left floor edge toward the center. Do NOT add any door, arch, mat, text, props or characters. Preserve EXACTLY the room framing, camera, floor diamond silhouette, transparent background, canvas1536x1024, tall navy walls, bookshelf at far left, BACK LEFT desk and chair under whiteboard, two server racks, meeting table with chairs, FRONT RIGHT desk/chair and all their decor. Preserve lighting, style, shadows and placement of everything outside the removed workstation. The ONLY semantic change is removal of the lower-left desk ensemble and rebuilding wood floor there. Genuine transparent alpha, original soft edge transparency. NO new furniture or people.

