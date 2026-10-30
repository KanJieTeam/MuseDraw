# Calendar arithmetic and civil time

`civil-calendar` makes a newspaper-style explanation of an explicit Gregorian
year (1600–9999), a valid reference date in that year and one to eight comparison
years. Month lengths, the February pattern, annual total, ordinal date and
weekday share the same arithmetic. The bar lengths use a common zero-based
scale. It never reads the system clock or guesses holidays and lunar dates.
The century exceptions follow the [Gregorian rule](https://aa.usno.navy.mil/downloads/c15_usb_online.pdf).
Historical local calendar adoption is outside this arithmetic model.

`daily-time` has two reader tasks. `clock` compares one to four explicit HH:MM
times with 12-hour notation and up to three elapsed intervals. Both interval
ends carry day offsets; equal times on the same day mean zero, not an assumed
overnight journey. Use 00:00 plus the next day's offset instead of ambiguous
24:00. The one-hand dial denotes position in a 24-hour day; its inner ring gives
the corresponding 12-hour numeral, not a conventional 12-hour hand angle.

`double-hour` produces a paper scroll with the twelve fixed two-hour periods,
zodiac correspondence and one to four supplied times. It uses the modern
correspondence beginning at 子时 23:00–01:00, with half-open boundaries; see the
[Academia Sinica questionnaire's time correspondence](https://www2.ios.sinica.edu.tw/sc/cht/download-tscs99.pdf).
The scroll does not display elapsed intervals; select clock notation for that
task. Ink variation is visual rhythm, not actual daylight. Historical solar
time, time zones, DST, leap seconds and divinatory date boundaries are excluded.

```sh
node scripts/musedraw.mjs core example civil-calendar --out output/year.json
node scripts/musedraw.mjs core render output/year.json --out output/year
node scripts/musedraw.mjs core example daily-time --out output/time.json
node scripts/musedraw.mjs core example double-hour-scroll --out output/scroll.json
```

Names and interval labels have an eighteen-character budget. The program owns
type, counting, marks and placement; do not hide an out-of-range time in prose.
