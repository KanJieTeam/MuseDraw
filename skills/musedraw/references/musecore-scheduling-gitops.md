# Explicit scheduling policy and GitOps comparisons

`pod-scheduling` filters one supplied Pod against one to twelve supplied nodes:
integer millicpu/MiB requests, exact-match labels and the supported exact
NoSchedule tolerations. Explicit CPU/memory weights calculate a single
continuous remaining-capacity score. Ties remain ties. It is a policy
illustration, not Kubernetes' complete score, binding result or scheduler
simulator. The paper-and-red-pencil table distinguishes filtered nodes and
calculated candidates. See the
[Kubernetes scheduling framework](https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/).

`gitops-pull` compares one to ten resources with one to four explicitly supplied
scalar fields each. Present, absent and unknown are distinct; health is supplied
independently of field equality. Automated/self-heal settings and change origin
produce conditional actions. Recorded attempts do not imply deployment success.
The dotted-paper construction ties desired/live comparisons to the feedback
loop. It does not parse arbitrary YAML, infer permissions, simulate deletion or
promise a fixed reconciliation period. See
[Argo CD automated sync](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/).

```sh
node scripts/musedraw.mjs core example pod-scheduling --out output/scheduling.json
node scripts/musedraw.mjs core render output/scheduling.json --out output/scheduling
node scripts/musedraw.mjs core example gitops-pull --out output/gitops.json
```

Select by reader task and supported data shape. Neither construction executes
cluster operations. Inspect the actual work; computed consistency is separate
from aesthetic approval and operational correctness of a real cluster.
