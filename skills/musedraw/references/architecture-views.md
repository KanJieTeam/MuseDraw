# Component, Integration and Deployment Views

## Components and integration

Nodes are software components or external endpoints; containers represent explicit system or service boundaries. Place shared identity, messaging and storage separately, rather than treating them as internal functions of one service, unless the brief says otherwise.

For SDKs and foundational libraries, interface layers, adapters and implementation components can use nested ownership; give third-party dependencies a separate domain. These are not the fixed eight modules of a data platform. Without call information, preserve layered containment and do not infer a call chain from vertical position or proximity.

Monoliths, clients and framework internals can use small layered or nested views. Do not expand them into a microservices platform by default. When comparing a monolith with microservices, show the responsibilities, services and data ownership in the supplied material. This is not a recommendation to migrate, and a reference figure does not establish that every service should have its own database.

- Connect to specific node edges, not an empty container center. If exchange direction is unknown, do not use a one-way arrow; use a line with a short relationship label and state that direction was not supplied.
- Calls, events and data reads/writes are different relationships. Distinguish them with short labels or a legend only when the material supports it; do not use three colors to invent three protocols.
- A message broker may connect publishers and subscribers. The label "MQ" does not establish asynchronous behavior or persistence.
- Gateway plugins or processing chains, database adapters and rule engines can use local component views. Connect them as a chain only when the order is explicit. Separate configuration/management from runtime paths; do not make management functions mandatory steps in every request.
- Do not force cyclic calls into a one-way chain. For dense connections, split overview and detail views or divide by boundaries; do not delete components merely to make the figure tidy.
- Route edges orthogonally through grid gaps and keep endpoints identifiable. Avoid crossing labels, container headings or unrelated nodes. Bends do not indicate elapsed time, and cross-layer positions do not indicate sequence.

## Deployment

Label logical components and actual instances separately. Instances belong to the supplied environment or network region. Show repeated instances as duplicated nodes or an explicit count; do not infer two machines from the words "high availability."

- Cloud/on-premises, production/test and subnets are different boundaries. Use them only when provided.
- Without a named cloud vendor, use native neutral symbols rather than vendor logos. A database cylinder represents a data endpoint, not a product selection.
- Single-machine, multi-instance and hybrid-cloud deployments need their own views. Adding server icons beneath a capability matrix does not make it a deployment view.
- Technology names, old component versions, repeated instances and "cluster" labels in generic templates are neither recommendations nor evidence of high availability. Preserve what the user's material supplies; do not copy these details simply because a reference looks good.
- Draw only connectivity supported by the actual material. Without deployment information, deliver a capability or logical view and state the gap rather than presenting it as an actual deployment.

## Original drawing and checks

The capability renderer does not fit these views. Use native SVG `rect/path/line/text`; give each meaningful node or container a stable element ID so later edits can target it. Size components according to text and hierarchy, not a fixed "three cards per row."

Choose a family from [visual-decisions.md](visual-decisions.md) or the explicit visual reference. An ink technical view can rely on white fields and thin neutral boundaries; a colored domain matrix or dark system view has different color-area proportions. Do not force all views into a blue-and-white card wall. Add a short legend when line styles carry meaning. Keep supplied relationships legible and avoid coloring each connector differently without a semantic reason.

Check nodes, edges and labels against the input list; container ownership; endpoints and directions; wrapping of long labels; lines crossing text; and full-size and reduced previews. [preview.mjs](../scripts/preview.mjs) checks text collisions, canvas bounds and declared container bounds. It does not check architecture semantics or edge routing; those require actual visual inspection.
