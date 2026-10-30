# Supplied experiment and canary records

`chaos-experiment` combines an explicitly selected method step, declared injection
interval, optional actual stop and supplied metric samples. One to three metrics
and up to thirty-two samples are supported. Baseline summaries and threshold
comparisons use the provided values; missing observations stay unknown. A
threshold crossing and a recorded stop are different facts. Planned injection
does not become an observed experiment, and the chart does not establish cause,
reliability, statistical significance or permission to inject production faults.

`canary-plan` separates declared allocation targets from observed metrics across
one to six progressively increasing stages. It supports one to four explicit
absolute or baseline comparison gates and required observation durations. The
bounded policy permits observed advancement only after a fully observed passing
stage. Missing data or insufficient time is not a pass. Stage share is a target
in the declared allocation unit, not measured traffic or a replica count.
Requested/completed rollback is supplied separately; a failed gate alone does
not prove rollback happened.

Use `core example chaos-experiment` or `core example canary-plan`, inspect the
example JSON, then `core render`. The layouts coordinate method/observation
objects, metric curves, large stage shares and quiet policy detail. They reuse
sample summaries, explicit state transitions and common numeric gates; replica
rollout and error-budget models are not interchangeable with traffic allocation.
Unsupported policies or excessive content need another route. Passing execution
and geometry checks does not establish operational safety or aesthetic approval.
