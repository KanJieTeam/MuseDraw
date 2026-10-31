# Component boundary with declared outward context

Use `component-context` when one explicit API/container boundary contains
components, while a supplied relationship continues between objects outside that
boundary. `components` always remain inside and `externals` always remain
outside. Internal dependency levels and outward context levels recalculate from
the directed graphs; these columns do not assert execution order or durations.

Use the normal registered route:
`node scripts/musedraw.mjs core render assets/musecore/cap2-component-shortlink-source.json --out output/components`.
The independent CLI and model test are also available:

```sh
node scripts/cap2-component-render.mjs assets/musecore/cap2-component-shortlink-source.json --out output/components
node --test tests/musecore/cap2-component-context.test.mjs
```

Supply `title`, `subtitle`, `readerQuestion`, `scope`, `components`, `externals`,
`relationships` and `note`. Each object has an ID, full label and detail. Give a
technology string or explicit `null`; `null` is unknown and is not filled from
its neighbours. External objects declare person/system/container type and
before/after placement. Containers also declare application/data/queue type.
External `ownership` is explicit text or `null`; placement never infers it.
Scope technology and parent system can likewise be `null`.

Every directed relationship has an ID, two known distinct endpoints, a label
string or `null`, and technology text or `null`. Relationship classification is
computed from endpoint membership: internal, boundary crossing or external
context. No input edge is dropped. Arrow keys map to the complete relationship
ledger, preserving longer labels without smaller text. Unknown relationship
text is shown as missing. Scope and node dimensions reserve measured type
height. Geometric routing refuses when no safe corridor or key placement exists.

The bounded grammar allows 2–10 connected internal DAG components, four levels
with four objects per level, up to four before objects, 0–10 total external
objects, three outward context levels with four objects per level and 1–24
relationships. Before objects send to internal components; internal components
send to after objects. External-context relationships run only between after
objects. Every external object must connect directly to the focal scope or be
reachable through declared outward context. Cycles, duplicate directed endpoint
pairs, disconnected objects, unknown fields and incompatible directions refuse.
Use another construction for general external networks or reverse dependencies.

The short-link input preserves six source components, six external objects and
eleven arrows, including Kafka → statistics. The statistics service stays
outside the API and retains the author's other-team declaration. Missing
component technologies and the source's unlabeled arrow remain explicit nulls.
The separate Base62 construction carries the arithmetic inset. This is a new
bounded structural adaptation; it does not establish a full source-artwork
reproduction, aesthetic approval, HTTP cache policy or model superiority.

The prior `architecture` family keeps its original external-to-external guard.
The separate new-family model and figures introduce no change to its output.
Model tests reproduce that guard and exercise a longer external chain, missing
data and refusal conditions. Development evidence also includes normal/+40px
Noto ascent-pressure PNGs of the source and a different three-component API.
These checks do not verify a real architecture, message delivery, ownership
beyond the supplied declaration or operational correctness.
