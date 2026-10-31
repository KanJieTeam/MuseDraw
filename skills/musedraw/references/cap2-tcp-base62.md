# Exact Base62 teaching construction

`base62-encoding` explains an explicitly supplied unsigned decimal integer with
an explicit 62-character alphabet. It computes every integer quotient and
remainder, reverses the remainder characters, and verifies each digit's place
value. The blue input/output band, coloured digits and matching remainder column
keep the number transformation visible. Measured text height increases the
canvas; text keeps its reading size. Overflow refuses.

The family is registered in the normal `core render` route. An independent CLI is also available:

```sh
node scripts/cap2-tcp-render.mjs assets/musecore/cap2-tcp-base62-source.json --out output/base62
node --test tests/musecore/cap2-tcp-base62.test.mjs
```

Required fields are `family`, `title`, `subtitle`, `decimal`, `alphabet`,
`inputLabel`, `outputLabel` and `note`. `decimal` is canonical decimal **text**;
numeric values, missing values, signs, fractions and leading zeros refuse.
Accepted range is 0 through 218340105584895 (62^8 − 1). Zero has one digit.
`alphabet` is a permutation of all 62 ASCII alphanumeric characters; there is no
implicit alphabet. All caller labels and notes are retained. Digit count and
division row count are computed. When changing a source input, update factual
claims in its title and subtitle as well as its integer and alphabet.

The source auxiliary input computes 1000000 → 4c92 with the given
0–9/a–z/A–Z order. This carries the small computational example in
`e01-duanlianjie-zujian`; it does **not** adapt the full C4 component picture.
The existing architecture example remains a separate correct booking-service
diagram. Its external-to-external relationship refusal means the source
Kafka → statistics relationship still needs a different bounded construction.

This encoding is not a hash, a random identifier, an ID allocation policy,
access control or a guarantee of secure links. It makes no HTTP caching claim.
No original architecture details or observed operational data are inferred.

Model tests use a separate highest-place subtraction oracle, changed alphabets,
zero and range boundaries. Actual Noto normal/+40px ascent pressure renders
were inspected on the development inputs. These are functional and layout
checks, not aesthetic approval or independent host-transfer evidence.
