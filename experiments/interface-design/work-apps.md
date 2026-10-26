# Work applications · evidence within reach

Use for applications where people inspect records and act on them: coordination,
review queues, operations, planning or similar daily work. Follow the supplied
product and design system. Choose the working view from the decision; a ledger,
timeline, map or document may each be appropriate. This is not a landing-page
template or a prescribed visual style.

## Make an exception verifiable

Place the evidence needed for a decision beside the exception or within its
immediate detail view. Preserve the original facts as well as the derived result.
For a resource collision, show both records' identity, resource and full time
ranges, then the overlapping interval. Showing only the overlap makes the user
reconstruct the source; showing only the source makes them calculate the overlap.
For another subject, identify its equivalent source facts and derived difference.
Do not replace missing evidence with a confident alert.

Keep workflow state separate from the underlying condition. Acknowledged,
reviewed or confirmed describes an action; the collision, shortage or discrepancy
remains until the data or resolution actually removes it. Derive both from their
own rules, and test the combination “action complete, problem still present”.

## Give working data a reading role

Before adjusting decoration, assign type roles to the information people compare:
record names, values, units, dates, status, labels and explanatory text. Core
values and action names should be readable during repeated use at the intended
viewport. Small captions can support them; making every table cell caption-sized
weakens the task even when a large heading looks clear.

Set a practical starting scale in the project's typography, then inspect actual
Chinese or Latin text, long names and dense rows at normal browser zoom. If core
data needs zooming, first recover space from repetition and secondary chrome;
do not shrink the values to preserve a decorative layout. There is no universal
font size or density that establishes readability across fonts and tasks.

## Protect the narrow working area

At a narrow viewport, preserve the current context, exception evidence, filters,
records and next action. Compress repeated branding, breadcrumbs and ornamental
headings when they consume the space needed for that work. Keep navigation that
the task actually needs. A familiar brand treatment or an English label can be
useful; assess its role instead of applying a blanket ban.

Decide where selection details will appear. If details move below a long list,
provide a clear route to them and a return path to the selected record. Check the
longest real title and the next action after selection, rather than judging only
the initial narrow screenshot.

## Preserve the keyboard's place

Prefer stable DOM nodes, stable framework keys and native focus behaviour. When a
vanilla application replaces a working region, capture the focused control's
stable identity before the synchronous update and restore it afterwards. If it
disappears or becomes disabled, explicitly choose a useful successor: the next
record, a remaining action or the relevant detail heading with `tabindex="-1"`.
Do not move focus when it started outside that region or when the update has
deliberately placed it elsewhere.

For this narrow vanilla case, [focus-preservation.js](focus-preservation.js) is a
classic script that works from a local HTML file. Keep the region element stable
and give replaceable controls unique `data-focus-key` values (stable `id` is the
fallback identity). Use a synchronous update; this helper does not manage async
render commits, modal focus traps, selection ranges or input values.

```html
<script src="./focus-preservation.js"></script>
<script>
  // region is an existing, stable element; renderRecords updates its children.
  FocusPreservation.update(region, renderRecords, {
    fallback: () => region.querySelector('[data-next-action]') ||
                    region.querySelector('[data-detail-heading]')
  });
</script>
```

## Verify behaviour, then retest the method

Inspect a desktop and a narrow first draft before revising. Check whether a user
can identify the exception, compare the original facts and complete the next
action. Exercise filtering, an empty result, long content and confirmation while
the original problem persists. Record visible problems separately from passing
interaction tests.

Run `node test-focus-preservation.mjs` with an available Playwright runtime and
Chromium. The runner accepts `--playwright <module-file>` and
`--chromium <executable>` (or `PLAYWRIGHT_MODULE` / `CHROMIUM_PATH`); it installs
nothing. It verifies actual browser focus after replacement, target removal and
focus outside the region, including a classic script loaded from `file://`.

These priorities respond to observed weaknesses in one small, two-brief frontend
trial. The focus helper has browser regression coverage; that does not establish
an aesthetic advantage. For the next unfamiliar subject, begin with
[frontend-method.md](frontend-method.md), apply this reference only when it is a
working application, freeze the first source and equal-size previews, then use
independent task and visual review before adding further rules.
