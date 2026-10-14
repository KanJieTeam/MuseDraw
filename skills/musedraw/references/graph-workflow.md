# Semantic graph drawing and conversation edits

Use this route for a component/integration diagram in **手绘线稿** or **终端色域**.
The agent understands the request; the installed drawing code produces native
shapes, text, layout, connectors and PNG. Do not invent coordinates or redraw a
gallery SVG. The same code accepts new systems and component names.

## Input to the tool, not to the user

Write a semantic JSON file. The user only supplies a short request and source facts.

```json
{
  "scene": {
    "title": "Project records",
    "groups": [],
    "nodes": [
      {"id": "portal", "label": "Field portal", "kind": "client", "parent": null},
      {"id": "records", "label": "Records service", "kind": "service", "parent": null},
      {"id": "archive", "label": "Archive", "kind": "store", "parent": null}
    ],
    "edges": [
      {"from": "portal", "to": "records", "label": "Submits"},
      {"from": "records", "to": "archive", "label": "Writes"}
    ]
  },
  "presentation": {"style": "手绘线稿", "composition": "flow"}
}
```

- `kind`: `client`, `service`, `store`, `queue`; choose from the component's
  supplied role, not from a fixed example. Optional `focus: true` marks a supplied
  focal component.
- `groups`: optional flat ownership groups `{id,label,role}`. `role` is `control`,
  `data` or `domain`; only classify control/data when the facts justify it.
  Nodes reference groups with `parent`; no parent is `null`.
- `edges`: explicit `{id?,from,to,label?,direction?}`. Direction is `forward`
  unless an explicitly undirected dependency uses `none`. Do not infer calls
  from membership. IDs are bounded ASCII identifiers; names are unrestricted
  Unicode labels within the documented length limits.
- `flow`: graph-ranked left-to-right view, with cycles kept as strongly connected
  components. The outline and role glyphs do not prescribe the business contents.
- `planes`: supplied flat domains are horizontal regions; external components
  sit outside them. Choose this only when actual groups exist, not to invent
  control/data planes for every system.

```sh
node <skill>/scripts/render_graph.mjs brief.json new-output --playwright <existing-module> --browser <existing-browser>
```

The output includes `document.json` (scene + presentation), `content.json`, `presentation.json`, SVG, full PNG, a 1200px
preview and rendered checks. A fresh output directory is required. It uses the
host's existing Node.js 22+, Playwright, Chromium and fonts; nothing is silently
installed. Missing runtime prevents PNG verification, not factual inspection.

## Two treatments, shared mechanics

**手绘线稿** uses white paper, ink/green outlines, repeatable ID-seeded pencil
geometry, open client figures and hatched storage cylinders. It is not just a
handwriting font on standard cards. Chinese uses the measured local Chinese font.

**终端色域** uses light canvas, warm control and cool data fields, clean geometry
and a technical wordmark. It is not a request for a dark theme. Supplied group
roles determine the fields. A different structure can use this style with `flow`.

Both share font measurement, semantic IDs, ports, obstacle routing, explicit
non-joining crossover bridges, export and validation. The style data lives in
[graph-styles.json](graph-styles.json); business content does not live there.

## Edit the existing graph

Do not regenerate the complete document for a small edit. Give the host an
operation list; `applyOperations(scene, operations)` validates the whole
transaction and does not mutate the input on failure:

```json
{"operations":[{"op":"rename_node","id":"records","label":"Records intake"}]}
```

Available operations are `rename_node` (`id`,`label`), `add_node` (`node`),
`remove_node` (`id`), `add_edge` (`edge`) and `remove_edge` (`id`). Removing a node
removes only its incident edges; it does not silently delete an empty group.
Do not add the new node's relationships unless the user supplies them. Use the
current `content.json`, preserve unrelated objects and presentation, and rerender
after applying edits. Reflow may move objects; it does not change their facts.

For a command-only host, write the operation response to `edits.json` and run:

```sh
node <skill>/scripts/render_graph.mjs current-output/document.json next-output --operations edits.json --playwright <existing-module> --browser <existing-browser>
```

To repeat the same drawing, run that command without `--operations`, with a fresh
output directory. The user does not need to write JavaScript or supply layout
parameters; the agent uses the installed command and its own available runtime.

## Scope and verification

This first graph route supports at most 80 nodes, 12 flat groups and 160 explicit
relations. It is not a universal architecture-layout guarantee. Nested groups,
self-relations, repeated endpoint pairs and overly dense layouts can be rejected;
retain the input and error rather than removing facts to obtain a pass.

Same normalized scene, presentation, code version and fonts produce repeatable
native geometry. Verify fresh renders, including the actual installed fonts;
cross-platform raster pixels may differ. Semantic test success, rendered bounds
and route checks are separate from aesthetic acceptance. Only model outputs that
actually use this route qualify as its generation examples; old manually drawn
gallery assets remain design references, not its claimed output.
