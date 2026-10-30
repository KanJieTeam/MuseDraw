# Content-computed campaign posters

`cup-calendar` composes a large annual count with a real Gregorian month/day
calendar and one to three explicit cup opportunities per day. Given year,
as-of date and daily assumption determine total, elapsed and remaining counts.
The scenario is conditional: elapsed days do not prove that cups were actually
discarded. No carbon, cost or environmental benefit is inferred from pictograms.
Activity name, dates, address and offer text are supplied facts or labelled
examples, not generated history.

`knight-tour` makes a declared empty standard eight-by-eight chessboard the main
visual. It accepts a legal non-revisiting supplied route or computes a bounded
deterministic Warnsdorff search from the given start and move preference. Every
step is checked; a full tour and partial route are distinguished. Search-budget
exhaustion is not proof that a tour is impossible. This is neither Chinese chess
with blocked horse legs nor a legal-move engine for arbitrary occupied positions.
Event text is supplied separately from the computed board.

Use `core example cup-calendar` or `core example knight-tour`, inspect the JSON,
then `core render`. The poster coordinates object repetition, dominant count or
board, title and event typography, reflowing long content inside bounded budgets.
Unsupported content leaves the route rather than shrinking text. Passing the
calendar, move and geometry checks does not approve the poster's aesthetics.
