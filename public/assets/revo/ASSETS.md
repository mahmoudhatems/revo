# REVO prototype assets

Copied unmodified from the owner-supplied packs unless noted. License: UNVERIFIED / pending owner approval.

| Path                    | Source                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| buildings/0*.png        | REVO_Station_Building_Assets_4x.zip, copied unmodified (4x nearest-neighbor sprites, transparent; shown at 0.5 = exact 2x source pixels) |
| surface/*.png           | Crops of Mars Surface Pixel Art Tileset.png (alpha-masked props/rocks/craters; ground and road tiles mirrored for seamless repeat, ground variants edge-feathered for blending; small items box-downscaled 50%) |
| stations/0*_station.png | revo-ui-changed-files.zip: public/assets/revo-ui/stations/ (atlas frames are mirrored in src/ui/components/Pixel.tsx)               |
| icons/*.png             | REVO_Categorized_Assets/01_Original_Size/UI_Icons (Icon_002, 004-008, 011-016, 018, 020-022, 029, 036, 039, 040, 042, 044, 046-049) |
| astronaut/aNNN.png      | REVO_Categorized_Assets/01_Original_Size/Astronaut/Astronaut_NNN_*                                                                  |
| drone/dNNN.png          | REVO_Categorized_Assets/01_Original_Size/Drone_Animations/Drone_NNN_*                                                               |
| tiles/*.png             | Crops of 00_Original_SpriteSheets/Martian Pixel Art Tileset Sheet.png (terrain tiles, ice "Special Ground", rock formation)         |

Small 10x10 glyphs that the pack does not include (sun, drop, heart, rover, crops, fuse, etc.) are drawn in code in src/ui/components/Icon.tsx using the REVO palette.

## Voice-over (optional)

Recorded read-aloud lines can be added as `vo/<line-id>.mp3` (the id is a hash of the line, see `lineId()` in `src/ui/voice.ts`). Missing files fall back to the browser speech engine; if that is unavailable, text stays on screen silently. No recordings are included yet.

## Data package

`src/game/data/*.json` are the files from `data final.zip`, unchanged. Conflicts with the Kid Edition scenario are listed in `docs/SCENARIO_DATA_CONFLICTS.md`.

## Mars surface

The colony is rendered by `src/surface/` from `src/surface/mars_surface_map.json` (layout proposal + `revo` adaptation block). The old flattened `map/colony-grid.png` was removed.
