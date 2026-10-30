# Given celestial coordinates and separate planetary scales

`north-star-guide` projects supplied right ascension and declination, constructs
the declared pointer great circle and computes angular separation and target
cross-track offset on the sphere. Screen rotation does not turn it into a local
date/time sky. Do not claim the guide line exactly reaches a target when the
computed offset says otherwise. The example is a static coordinate teaching map;
decorative terrain is not a measured horizon or observer bearing.

`planet-scales` separates two scales: body diameters from given mean radii, and
linear semimajor-axis distance from given astronomical units. The planet row is
not distance-spaced; the distance axis does not share the diameter scale.
Light travel times use the supplied characteristic distances, not live positions
or ephemerides. Solar and ring marks are schematic, not measured dimensions.
Volume ratios are spherical ratios derived from the given mean radii.

Read the example JSON and its bounded schema before selecting either route.
Use `core example north-star-guide` or `core example planet-scales`, followed by
`core render`. Objects, scales and measured labels reflow together. Unavailable
coordinates, observer-specific sky tasks or unsupported orbital calculations
require a different route, not guessed inputs. Passing numerical and geometry
tests does not establish astronomical observation validity or aesthetic approval.
