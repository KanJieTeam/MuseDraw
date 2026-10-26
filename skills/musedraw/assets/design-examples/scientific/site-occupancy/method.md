# Matched scientific conditions

Use this method when an explicit site occupancy changes on the same paired object.
One canonical `object-views` scientific entity owns both strands, all three sites,
their colours and the frame extent. Views contain only sparse marks overrides.
These are abstract supplied states, not inferred biology or empirical evidence.

The visual argument is the changed site, so do not add coloured panel cards or
repeat explanatory prose. Guides show correspondence without implying a process.
Use `sites[].name` for native site names; they remain aligned even for unmarked
sites. They appear only in the first view unless `showSiteNames` is explicit.
Never guess text coordinates or read SVG circle positions to create p/q/r labels.

Supply actual strand identity, site positions, and every required condition.
`marks:[]` explicitly removes a marker; an omitted site inherits its state.
Geometry, phase and palette cannot change through a sparse state override.
Name-only edits can use `patch` with the canonical site ID and `field:"name"`.
Keep the abstract crossbars schematic; they encode no nucleotide length.

Render the scene with the bundled engine, read checks and deliver the PNG and
SVG. All parts and names remain separately editable. This original
worked example demonstrates composition; it is not a user-approved manuscript
figure or evidence of a biochemical mechanism.
