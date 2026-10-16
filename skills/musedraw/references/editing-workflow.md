# Edit an existing diagram

Reuse an approved case's `scene.json` for its composition, hierarchy and details.
Render unchanged cases directly. For text-only changes, write a small JSON list:

```json
[{"from":"市场占有率","to":"市场渗透率"},
 {"id":"erp","field":"label","expect":"ERP系统","value":"业务中台"}]
```

```sh
node <skill>/scripts/musedraw.mjs patch original/scene.json changes.json --out revision
```

The command preserves the original and unrelated fields, renders a separate
revision and records exact changes in `changes.json`. Missing/ambiguous targets
or stale `expect` values fail without changing the source. Repeated labels need
ID+field. Use original item IDs for semantic layout blocks.

For structural edits, change the affected module with stable IDs. Repeated
modules can use `grid`; long labels wrap and rows grow inside that module.
An undersized fixed frame fails instead of clipping or shrinking all type.
Check the resulting preview for the intended composition and visual hierarchy.
