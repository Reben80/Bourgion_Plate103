# Notes

The earlier prototype painted the weave one pixel at a time. This version builds the same geometry as SVG paths: one even-odd path per ring, a shared stroke for the boundaries, and an extra arc where the lower ring’s outer circle crosses the upper band. That joint sits inside the upper ring, so a boundary scan never draws it on its own.

One 6×6 period is constructed and repeated with `<use>`. Panning and zooming only change the view box. Flipping a marker rebuilds that period and reclassifies the group; on this machine the pair finishes in well under a tenth of a second, and the page updates in about 30 milliseconds.

## Palettes

The booklet’s hex colors were not in the files available while this was built. The glazes in `src/presets.ts` are stand-ins, kept in one list so a later match to the booklet is a one-place edit. The 3D-print view uses a single light band on a dark ground.

`original_booklet_palette.svg` was also absent, so the drawing has not been diffed line for line against that file. The automated checks cover the lattice, the key frame, ownership of sample points, the six named groups, the tile-shape sets, and the rule that the overlay never contains a mirror line.

## Symmetry

Rotations are decided from the signs: an orientation-preserving map has to send each key and each triangle to a cell with the same sign. Glides are decided from the owner of sample points, along the altitudes of the lattice, with a shift of one row. A pure reflection is not recorded, and the overlay draws hexagons, triangles, ovals, and dashed glides only.

The group names and the one-sentence explanations are in `GROUP_EXPLAIN`. Challenges remember p3, p2, pg, pgg, and p1 in the browser. pgg is recognized when two glide directions are present; none of the named presets is pgg.
