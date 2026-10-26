MuseDraw spatial scene experiment

Status: experimental. This is not a premium gallery release or a universal aesthetic guarantee.

Use this route when a physical facility and its spatial relationships are the main view.
Do not impose 3D on comparisons, statistical reports, schedules or workflows that do not need it.

Run: serve this folder with any static HTTP server, then open index.html?case=harbor or index.html?case=water.
For example, with Python installed: python -m http.server 8980 --bind 127.0.0.1
The ES modules require HTTP. No build, network asset, external font, API key or image service is needed.
A WebGL-capable browser is required; the page reports failure explicitly if no context is available.

Reusable code:
- stage.mjs owns the camera framing, local environment, shadow setup, material roles, primitives and projected anchors.
- A geometry module implements buildScene(stage) and returns anchors with stable IDs, a select(id) function and camera recommendations.
- Native HTML owns labels, business facts, charts, selection and keyboard focus. Keep them independent of the model geometry.
- app.mjs projects labels from real model points and tries a finite set of nearby non-overlapping positions while keeping leader lines.

Production procedure:
1. Identify the physical objects and the current decision. Freeze the identity and data contract first.
2. Build object silhouette, intermediate structures and functional details at three scales. Do not repeat equal boxes as a substitute for the subject.
3. Give ground, wall, roof, water, structure and status different material roles. Evaluate their rendered luminance under the shared lights.
4. Reduce the brightness of non-focal trusses/rails before adding luminous edges. Selection may lighten an object's original material, while status uses its own text and small accent.
5. Preserve enough horizontal camera extent at narrow aspect ratios. Reproject and pack labels after view or size changes.
6. Compare at least two cameras when repeated structures overlap. Camera choice must preserve the physical object/data contract.
7. Use entityFocus to own per-entity material copies and restore from base colors on each selection. Exclude semantic status materials explicitly.
8. Render and inspect the actual output, then test selected object identity, native values, anchor bounds and keyboard behavior.

Evidence: two original themes, four viewports, two cameras, 64 object/camera checks. Independent image review records local improvement in object recognizability and depth; it does not establish top-level taste across all tasks.
The aspect framing constant and finite label candidates were tested only for the two example geometries and three objects. Denser scenes require their own constraints and validation.

All geometry and example business data are original fictitious demonstrations. External EasyV images and models are not included. Three.js is vendored at 0.180.0 under the included MIT license.
No construction, navigation, production-control or regulatory accuracy is asserted by these demonstration models.

Reproduce the browser regression independently:
  npm install
  npx playwright install chromium
  npm test
The test starts and closes its own loopback HTTP server. It checks 64 identity, focus, projection and label-layout states, not aesthetic quality.
Existing managed runtimes may supply PLAYWRIGHT_MODULE (an absolute module URL) and BROWSER_EXECUTABLE instead of installing.
Local test output: regression-local.json. The recorded regression.json is the author's last run, not a claim about your machine.

Remaining visual boundary: repeated crane detail may still be dense at small sizes. Water focus separation remains subtle. This method does not yet generate arbitrary facilities from natural language and is not established as a universal taste improvement.
