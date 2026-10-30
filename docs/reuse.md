# Pre-existing code and new work

Threadbare’s new repository began at **2026-10-31 06:36:08 +08:00**, commit `99c694a76ce7d80f893fc1bf753a74560b2f5b44`. This falls within the Kiroween 2026 creation period, which began at 2026-10-30 09:00 Pacific / 2026-10-31 00:00 Beijing.

## Earlier work reused

Source: [blucca/n8n-check, commit 8c83e93c0d26188db1dcafdb763dcfb4dc03abf6](https://github.com/blucca/n8n-check/tree/8c83e93c0d26188db1dcafdb763dcfb4dc03abf6/experiments/lineage-boundary), MIT licensed. These materials were completed before Threadbare and before the hackathon creation period.

| Threadbare files | Reused material |
| --- | --- |
| `vendor/audit-executions.cjs` | The deterministic native execution-boundary auditor and Node CLI contract. |
| `vendor/backtracking.cjs` | The native saved-item ancestry traversal. |
| `samples/original-parent.json`, `samples/original-child.json` | Complete saved native responses for the original synthetic case. |
| `samples/repaired-parent.json`, `samples/repaired-child.json` | Complete saved native responses for its previously recorded ancestry repair. |
| `samples/recorded-http.json` | A compact extract of the same earlier experiment’s recorded HTTP requests and recipient comparison. |

The original n8n 2.41.7 reproduction, runtime observations, and underlying repair predate this submission. Threadbare replays those saved recordings. The customers and orders are synthetic. The HTTP extract belongs to that recorded case alone.

## New work during this submission

- A static browser execution desk with a selectable dispatch-board interface and narrow-screen layout.
- Browser-compatible JSON structural equality and adaptation of the common auditor, retaining its Node CLI entry point.
- Optional evidence capture at the actual ancestry traversal visits: node/run/output/item coordinates, original pairing values, selected source entries, and RFC 6901 JSON Pointers. Parent recorded pairing evidence is exposed alongside the child trace.
- Parent-first file import that reads the recorded child execution ID and gives its complete-response download command; local two-file pairing and audit.
- A downloadable structural report that omits business item `.json` values.
- New spec, design, tasks, steering, custom Kiro agent configuration, and focused saved-evidence checks.

Kiro’s implementation is preserved at checkpoint `cc3a85c6ae9519602f6b28d36da6f4901e15150d` (2026-10-31 07:05:58 +08:00). Integration review then refined the shared traversal, evidence addresses, and checks. The [Kiro build record](kiro-build.md) describes the actual division of work.

## Other dependencies and licenses

- Project software: [MIT](../LICENSE). Original copyright and SPDX notices are retained in the vendored core.
- esbuild: the pinned build-time dependency listed in `package-lock.json`, MIT licensed.
- Atkinson Hyperlegible: Copyright 2020 Braille Institute of America, Inc.; [SIL Open Font License 1.1](../assets/fonts/atkinson-LICENSE.txt).
- Barlow Condensed: Copyright 2017 The Barlow Project Authors; [SIL Open Font License 1.1](../assets/fonts/barlow-condensed-LICENSE.txt).

Custom execution files stay local to the operator’s browser. They are separate from repository samples and from the synthetic case’s HTTP evidence.
