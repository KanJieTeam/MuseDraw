# MuseCore heatmap

`heatmap` is a bounded scientific matrix figure for a rectangular set of explicitly supplied measurements. Rows and columns retain their input order. Each cell carries a source string, and the colour ramp is a visual encoding of the supplied numeric value.

The model accepts 3–24 rows and 3–18 columns. It rejects ragged matrices, duplicate identifiers, missing cell provenance, non-finite values, and unsupported claims. It does not cluster rows or columns, normalize values, impute missing cells, infer significance, or attach biological meaning to a colour pattern. If a caller needs clustering, uncertainty, or a statistical test, that result must be supplied and documented by a separate composition.

The demonstration uses synthetic teaching measurements and must remain labelled as such. Before delivery, state the unit, ordering, missing-data policy and analysis used to produce the values in the surrounding report. Passing geometry and source checks does not establish scientific validity or aesthetic approval.
