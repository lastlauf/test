# Static assets

`turkey.png` — the tournament mascot shown on the sign-in screen. Drop the
artwork here with exactly that filename; the auth page falls back to the drawn
`TurkeyMark` illustration if the file is missing, so a missing asset never
renders a broken image.

Keep it square-ish, transparent background, and under about 300 KB — it is the
first thing loaded on the sign-in screen, sometimes over a course's worth of
cell signal.
