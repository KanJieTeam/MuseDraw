# Synthetic ring and cinema programme posters

One thin material construction module serves two different poster objects.
`synthetic-ring-poster` samples a prescribed radial Gaussian with angular cosine
asymmetry in supplied angular units. The scale bar follows those units, not an
observed measurement. This is a synthetic bright annulus: no EHT ingestion,
general-relativistic ray tracing, photon-ring identification, horizon radius,
mass, distance or reconstruction is calculated. Event text is separately supplied.

`silent-cinema-poster` coordinates a film-strip object, intertitle and one to eight
supplied screenings in one venue. Dates and start times sort the programme;
supplied screening durations determine end times and conflict checks. A duration
is a given scheduling value, not a verified runtime of a particular restoration.
Film names, years and admission copy are supplied records. Perforations and
ornament are compositional material, not a physical film-gauge or projector model.

Use `core example synthetic-ring-poster` or `core example silent-cinema-poster`,
inspect the examples, then `core render`. Titles and programmes reflow within
bounded measured budgets or leave the route. Shared event-date and typography
tools are reused. Passing arithmetic and layout tests does not prove physical
interpretation, availability of a screening or aesthetic quality.
