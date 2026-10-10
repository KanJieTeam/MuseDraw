# A small component-view example

This original, generic inspection-software example is bundled with the Skill:
[SVG](../assets/inspection-example.svg) and
[PNG](../assets/inspection-example.png). Its labels are Chinese. Use it to study
hierarchy, ownership and connection routing, not as facts about the user's system.

The brief contains ten nodes: mobile app, dispatch web page, unified API,
work-order service, field-record service, business database, object storage,
message service, notification service and identity service.

| Known relationship | Meaning |
| --- | --- |
| Mobile app → API | Uses |
| Dispatch web → API | Uses |
| API → work-order service | Accesses |
| API → field-record service | Accesses |
| Work-order service → business database | Writes structured records |
| Field-record service → business database | Writes structured records |
| Field-record service → object storage | Stores photos |
| Work-order service → message service | Publishes work-order changes |
| Notification service → message service | Subscribes; arrow indicates the subscription action/dependency, not message delivery |
| Identity service — API | Validates API-call identity; exchange direction is unspecified |

There are nine directed relationships and one undirected relationship. Light
containers express logical ownership, not machines or networks. The API receives
the main blue emphasis; other components remain white with thin edges. Event
relationships use dashed lines and labels. Connections reach actual node edges.

No protocol, vendor, deployment instance, replication or performance fact was
supplied. Do not add them during a visual-only revision. Preserve both services'
database writes and the separate photo-storage relationship.

Full-size PNG and native metadata were inspected when preparing this reference.
This is not an external acceptance report, a universal layout guarantee or proof
of token savings. Rerender and inspect after changing labels or structure.
