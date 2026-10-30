# Representation routing for office and research diagrams

MuseDraw must decide **what relationship the reader needs to see** before it
chooses boxes, icons or colours. A named style is not a representation.

Every new office or research diagram must declare one primary representation:

| Reader question | Representation | Visual evidence that must be visible |
| --- | --- | --- |
| Which objects are related? | `entity-chain` | actual entities, shared keys and the links between them |
| How does evidence become a judgement? | `evidence-branch` | evidence → condition check → calculation or review → result |
| How do sources become a document or product? | `source-to-output` | source fields anchored to the output sections they feed |
| Who acts, decides or reviews? | `swimlane` | role lanes, actions in the responsible lane, decision and return paths |
| What changes over time? | `timeline` | one time axis, parallel work on that axis, real milestones |
| What sits inside which boundary? | `boundary-map` | explicit containment, external dependencies and interface edges |

The host should put the choice in `scene.meta.representation` and name the one
sentence the figure proves in `scene.meta.readerQuestion`. If none of the six
fits, stop and choose a custom representation explicitly. Do not silently fall
back to a card grid.

## Hard defaults to remove

- Do not use four equal columns as a generic architecture layout.
- Do not turn every noun into a rounded rectangle or a stock database/file/person
  icon.
- Do not draw a connector unless it carries a supplied relationship.
- Do not make a legend explain relationships that the objects could show
  directly.
- Do not make every object the same size, colour or visual weight when the
  content has a real focal object, shared resource or exception.

## The minimum authoring contract

Before rendering, the semantic input must include:

```json
{
  "meta": {
    "representation": "entity-chain",
    "readerQuestion": "How are a project, borehole, stratum, sample and test result linked?",
    "primaryRelation": "shared sample and layer identifiers"
  }
}
```

`readerQuestion` and `primaryRelation` are authoring metadata, not text to place
on the canvas. The diagram is successful only when a reader can answer the
question from the objects and relationships without reading a paragraph of
explanation.

## Refusal conditions

Refuse or split the figure when the requested content has no single primary
relationship, when more than about 25 objects are required for one view, or
when labels must be shrunk below the delivery size. A smaller font and more
cards are not a valid repair.

The six report figures in the勘察报告 example should route as follows:

- stage results: `boundary-map` or a four-result overview;
- data resources: `entity-chain`;
- report generation: `source-to-output`;
- professional evaluation: `evidence-branch`;
- integrated application: `swimlane` or `boundary-map`;
- acceptance arrangement: `timeline`.

