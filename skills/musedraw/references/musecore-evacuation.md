# Drawing supplied floor geometry and evacuation-route annotations

`evacuation-plan` is a bounded blueprint renderer for explicitly supplied single-floor geometry and routes. Drawing a plan is not certification of its real-world usability.

- Start from `assets/musecore/evacuation-plan.json`. Supply the rectangular coordinate domain, orthogonal walls, door openings, hinges/opening sides, annotation zones, stair/exit references, origin and explicit polylines.
- Walls are cut at declared openings; door leaves and 90-degree arcs use the same geometry. A shared x/y scale preserves supplied proportions. Room labels are annotation regions, not inferred enclosed rooms.
- The programme checks supplied route endpoints, bounds, wall/open-leaf contact, repeated points, reversals and self-intersection. It does not find, optimise or select a route.
- Equipment symbols have supplied positions, without coverage or accessibility certification. A stair endpoint on this floor does not prove a discharge to outdoors.
- Schematic mode visibly says it is not a field evacuation guide. Caller-approved mode retains the caller's approval reference and visibly states that site conditions were not verified; it does not authenticate that approval.
- Reject unsupported curved/diagonal/multi-floor geometry, conflicts and unreadable capacity. No occupant capacity, hardware clearance, smoke/fire state, code compliance, lighting or safest-exit assessment is inferred.

Keep the declared input and source/approval references with the export. Actual emergency plans require the appropriate real site review; geometric checks alone do not establish safety or aesthetic quality.
