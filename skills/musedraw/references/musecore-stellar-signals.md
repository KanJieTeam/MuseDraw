# Ideal stellar signals

`transit-lightcurve` predicts a single opaque planet crossing a uniform stellar
disk on explicitly circular kinematics. Supply radius ratio, separation in
stellar radii, inclination, period, time window and three to seven snapshots.
The sky geometry and flux use the same exact two-circle overlap. Contact knots
and finite ingress/egress refinement supplement uniform time sampling. A genuine
non-transiting configuration is flat; a grazing transit is not replaced by a
full-depth box. Positive depths below 1 ppm exit this numerical graphic range;
this is not an instrument detection threshold. There is no limb darkening,
exposure integration, measured-data fitting, mass inference or discovery claim.

`radial-velocity` predicts circular two-body reflex motion from explicitly
supplied IAU nominal masses, period, inclination and systemic velocity. Eight
to sixty-four given times and three to six snapshots share a time origin. The
star's barycentric scale, velocity semi-amplitude and low-speed spectral shifts
are calculated. Positive radial velocity means away from the observer; the
curve labels distinguish total velocity from the reflex component. Zero planet
mass or face-on inclination preserves zero amplitude. Illustrative disk sizes
and separately magnified spectra do not imply physical size equality. This is
a forward model; it does not implement period search, fitting or mass inversion.

```sh
node scripts/musedraw.mjs core example transit-lightcurve --out output/transit.json
node scripts/musedraw.mjs core render output/transit.json --out output/transit
node scripts/musedraw.mjs core example radial-velocity --out output/velocity.json
```

Use the examples' declared model/units and keep source observations separate
from synthetic predictions. Inspect the actual figure at its delivery size.
