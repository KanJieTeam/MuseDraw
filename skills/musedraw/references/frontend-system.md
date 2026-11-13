# Experimental executable frontend systems

Use this kit when the reader needs a **public catalogue** or a **timed public
programme**. It builds working HTML/CSS/JavaScript from structured content, or
installs scoped assets beside an existing application. It does not decide that
every website is a dashboard, replace a host application's business logic, or
generate arbitrary landing pages from prose.

Run these commands from the installed `musedraw` Skill directory. Outputs must
be new directories. No repository checkout, package installation, network asset,
model call or deployment is required. From any other working directory, replace
`scripts/` with the absolute `<skill>/scripts/` path and resolve your input/output
paths for that working directory; assets resolve relative to the installed CLI.

```sh
node scripts/frontend-system.mjs list
node scripts/frontend-system.mjs validate --input assets/frontend-system/examples/tidemark.json
node scripts/frontend-system.mjs build --input assets/frontend-system/examples/tidemark.json --out output/tidemark-demo
node scripts/frontend-system.mjs build --input assets/frontend-system/examples/night-signal.json --out output/night-signal-demo
node scripts/frontend-system.mjs install --system specimen --out output/catalogue-kit
```

Open a built `index.html` directly in Chrome. Edit the structured input and build
into another new directory to retain the first draft. A build includes original
`source.json`, relocated `content.json`, editable modules/CSS, original local
image bytes, an offline `browser.js` bundle and a derived `manifest.json`.

## Choose by content and reader task

| System | Coordinated composition | Controls and narrow layout |
| --- | --- | --- |
| `specimen` | Serif statement, factual year/count marker, taxonomy band, fine rules, text-first record rows. Dark green reading/action ink, pale green category surface, restrained lime selection count. Optional subject image with landscape or portrait framing. | Search and category rail become a stacked phone filter. Records become year/ID headers followed by readable title/summary and a keep control. Detail dialog and local reading list retain the complete source. |
| `signal` | Bold sans statement over a declared subject image, dark blue reading field, orange action/date band, large day indices, explicit time columns and session/place hierarchy. | Horizontal filter strip becomes stacked fields. Civil-day bands become compact day headings; time, subject, title and keep control remain visible. A local itinerary reports overlapping intervals. |

These are separate compositions with different markup and reading order, not a
single hero/card page with two palettes. Both coordinate display/body/metadata
type roles, image frames, section spacing, controls and responsive breakpoints.
The root tokens and named classes in `base.css`, `specimen.css` and `signal.css`
are also usable with host-rendered markup.

The original implementations studied six user-preferred, project-owned works:
GearLedger, Waycup, Turncycle, Afterhours, Fieldnotes and Secondlife. Their useful
linked decisions included concrete task previews, disciplined image credits,
different type roles and public-facing subject identities. The examples here
use new content, original vector artwork and original code. Those relative
preferences are project evidence, not universal aesthetic goldens or approval
to ship these experimental systems. No Taste implementation or assets are used.

## Structured input and derived decisions

Start from either example JSON; the validator refuses unknown fields rather
than discarding them. Version 1 accepts `system`, `locale` (`en` or `zh-CN`),
`brand`, `page`, optional `image`, and `items`.

- `brand`: `name`, `kicker`.
- `page`: `kicker`, `title`, `intro`, `actionLabel`, `sectionTitle`, `footer`.
- Every item: unique ASCII `id`, `title`, `summary`, `category`, nonempty `source`,
  optional `detail` array of up to five text paragraphs.
- Specimen item: explicit integer `year` (1000–2200), `creator`, `format`.
- Signal item: real `date` (`YYYY-MM-DD`), `start`/`end` (`HH:MM`), `place`, `cost`.
  End must follow start on the same civil day. `cost` is supplied text, not a
  computed checkout amount. Keep does not reserve capacity.
- `image`: local relative `src`, meaningful `alt`, actual integer `width` and
  `height`, `credit`, `fit` (`cover` or `contain`), and `position` (`center`,
  `top`, `bottom`, `left`, `right`). Signal requires a subject image; Specimen
  supports a text-only index. Assets must remain inside the input directory.
  SVG must contain passive self-contained geometry/text; no external loading,
  scripts, event handlers or embedded documents. PNG/JPEG/WebP are also accepted.

The content model derives counts, category groups, year range, civil-day bands,
image aspect class, and open/dense row rhythm. A declared character-width
heuristic chooses one of three title scales; browser text wraps at natural
height rather than being clipped or silently abbreviated. It is not a measured
typographic optimiser. Specimen preserves the supplied record order; Signal
sorts sessions by supplied date and start time. No missing facts are invented.

The bounded contract is **1–24 items, at most six categories, at most seven
programme days**. Titles support up to 180 characters, summaries up to 700;
the validator reports the exact field and limit. It rejects larger collections,
arbitrary section arrays, booking/capacity fields, overnight intervals and
remote media. Use the existing frontend route or host app for dashboards,
checkout, real registration, inventory mutation, maps, charts, timezone
conversion and long-form publishing. Do not remove facts to fit this kit.

## Integrate without replacing the app

Install into a new asset directory, link `base.css` and the selected system CSS,
then import the module through the host's normal build or local HTTP server:

```js
import { mountFrontendSystem } from './catalogue-kit/browser.mjs';

const view = mountFrontendSystem(dedicatedRoot, content, {
  storageKey: 'my-project-reading-list-v1',
  onSelectionChange({ids, conflicts}) {
    // Hand the selected identities to existing product logic.
  }
});
view.getSelection();          // {ids, count, conflicts}
view.setSelection(['TM-26-01']);
// view.destroy();            // removes only the mounted view and its listeners
```

Use a dedicated root. The module validates content, renders only that root and
emits a bubbling `mfs:selection-change` event with IDs and conflict pairs. It
reserves unique element IDs across independently installed module copies,
including roots mounted while detached and attached later. It never makes a
network request. `storage` may be an injected synchronous
`getItem`/`setItem` adapter; the default is localStorage. Storage failures leave
a visible page-only-state message. The host owns authentication, routing,
backend, mutable product state and actual submission. Treat mounted content as
immutable; destroy/remount a dedicated view when supplied content changes.

## Reproduce checks

```sh
node --test tests/frontend-system/model.test.mjs
node tests/frontend-system/browser.mjs --playwright EXISTING_PLAYWRIGHT_MODULE --browser EXISTING_CHROME_EXECUTABLE --out output/frontend-system-browser
node tests/frontend-system/package-smoke.mjs --out output/frontend-system-package-smoke --playwright EXISTING_PLAYWRIGHT_MODULE --browser EXISTING_CHROME_EXECUTABLE
```

Use the already prepared Playwright module and installed Chrome; the runner
does not download either. A prepared Skill often has the module at
`output/runtime/node_modules/playwright/index.mjs`. Quote paths with spaces.
Browser evidence requires another new output directory on rerun. Model tests
write into the operating system's temporary directory by default; set
`MFS_TEST_OUTPUT` to retain them elsewhere.

The model suite checks structure/refusals, Unicode filtering, overlap
arithmetic, exact source/asset preservation and non-overwrite installation.
The browser runner builds four new-content examples: English catalogue and
programme plus Chinese long-title, 24-item variants. It captures actual pages
at 1440, 1024, 390 and 320 pixels, checks all records/assets and usable controls,
and exercises search, category/empty states, keyboard detail/save, source text,
focus return, reload/clear, itinerary conflicts, blocked storage, direct-file
opening and integration beside working host UI. Screenshots and a JSON report
are retained together with their editable sources. Fonts use installed system
stacks; appearance can vary across machines.

The package smoke copies only the installed Skill tree (excluding local
`output`), runs `list`, both `build` commands and both `install` commands from an
unrelated working directory, and checks source preservation and native module
resolution. With the optional existing browser/runtime arguments it also opens
both copied-package demos directly, imports both installed modules separately,
mounts detached roots and checks unique IDs plus the second root's real label,
anchor and dialog targets beside a working host action. It does not rely on
repository-root scripts or tests.

These checks establish tested function and bounded layout behavior in Chrome.
They do not establish aesthetic superiority, accessibility certification,
cross-browser compatibility, production readiness or approval to publish.
