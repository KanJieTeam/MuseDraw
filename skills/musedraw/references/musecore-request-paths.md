# Explicit request paths

`mesh-request` coordinates two to four declared Pods, each with an application and
a sidecar, and one to six supplied messages. The host declares source, target,
transport, authorization, reached state, optional correlated reply and optional
segment timings. Application-to-sidecar and cross-Pod paths remain attached to
their actual objects. Explicit control-plane relationships are visually quieter
than the request path. The example distinguishes istiod configuration/CA service
from local agent certificate delivery to Envoy; it does not simulate complete
Istio traffic handling, certificate verification, retries or instance selection.
Unknown timing remains unknown; a missing reply is not invented.

`cdn-request` replays a finite declared sequence against one to three cache
layers and up to six explicit keys. Initial cache state, freshness, age and
public/private/no-store policy are inputs. Hit, miss, reached layer, origin fetch
and backfill age derive from that bounded model. Equality to freshness lifetime
means stale. Input ordering is not a network latency measurement. The illustrated
cache-hit fraction belongs only to the supplied sequence; it is not a production
performance estimate. The constellation is a visual route, not geographic scale.

Use `core example mesh-request` or `core example cdn-request`, inspect the example
fields, then call `core render`. These routes own object scale, route geometry
and measured attached labels. Unsupported protocol behaviour, undeclared state
or excessive content needs another route. Preserve full model metadata for
inspection, without converting the main graphic into a simulation log.
Passing execution and geometry checks is not an aesthetic approval or a claim
that a real system is configured or operating correctly.
