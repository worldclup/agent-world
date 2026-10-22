# Code map and extension guide

| File | Purpose |
| --- | --- |
| `server.js` | Local HTTP server, static-file allowlist, session parsing/polling, SSE `/events` |
| `index.html` | Page, settings controls, styles, script loading |
| `office.js` | Layout data, furniture rendering, themes, movement, event handling |
| `office-backgrounds.js` | Layout-specific animated surroundings |
| `office.test.js` | Canvas/DOM simulation tests, geometry and path checks |
| `server.test.js` | Session parsing, replay, polling, and static-serving tests |
| `assets/` | Bundled reference art, UI icons, credits and third-party licenses |

## Change a room or furniture

Large-office objects and areas are defined before the `largePlan` snapshot in `office.js`. Home and medium layouts are built inside `setLayout`. Update the relevant area, objects, activity destinations, and any affected signs together.

`object(x,y,w,d,kind,options)` blocks its grid footprint. `deco` leaves the tile walkable and is used for seating. Coordinates are isometric grid coordinates, not screen pixels. Keep room contents within boundaries and avoid covering doorways.

Furniture is drawn in the `drawObject` switch using helpers such as `box`, `quad`, and `iso`. Add a renderer when introducing a new kind. Small tabletop details can be drawn inside the parent renderer rather than creating extra blocking objects.

Room plaque positions are in `layoutSigns`; drawing and hover hit testing share this data. Keep them attached to the actual wall/glass plane.

## Change appearance or backgrounds

`BUILDINGS` defines building palettes and surfaces. Use palette colors instead of hardcoded colors where appropriate. `drawOfficeSurroundings(t,p)` draws backgrounds per office layout using the animation time and theme palette; it must not mutate the office simulation.

`index.html` loads the background script before `office.js`. Any new separately served file must be added to the server's static allowlist; do not replace it with unrestricted filesystem serving.

## Verify

Run `npm test` after changes. Tests simulate the canvas; they do not prove that an arrangement looks correct. Also check the browser: all affected sizes, building themes, day/night appearance, plaque hover, DEMO movement, and entrances. Avoid moving or deleting unrelated user changes.
