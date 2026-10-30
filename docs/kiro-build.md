# Kiro build record

Threadbare used **Kiro CLI v3** for a real core implementation on **31 October 2026**, alongside the separately built browser UI.

## The task Kiro received

The root [`.kiro/`](../.kiro/) directory contains:

- [Requirements](../.kiro/specs/execution-desk/requirements.md): the supported saved-execution contract, exact raw evidence, parent-first acquisition, local import, portable report, and demo requirements.
- [Design](../.kiro/specs/execution-desk/design.md): a common deterministic core, evidence captured during traversal, RFC 6901 pointers, and browser-only data handling.
- [Tasks](../.kiro/specs/execution-desk/tasks.md): the complete product and delivery work.
- [Evidence steering](../.kiro/steering/evidence.md): preserve input/run/output axes and branches, keep recorded ancestry and business delivery evidence distinct, and keep imports local.
- [Custom agent configuration](../.kiro/agents/threadbare.json): the `threadbare` agent with those resources and an `AgentStop` hook configured to run `node tests/check.cjs`.

The implementation task limited Kiro’s edits to the vendored core, the focused test script, and core task status. The application interface and documentation were developed separately.

## Actual implementation

The completed native v3 session ran from **06:48:00 to 07:01:57 Beijing**, with process exit code **0**. Kiro read the specification and steering, examined the existing core and samples, then directly changed the repository:

1. Wrote `vendor/json-equal.cjs` for parsed-JSON structural equality, ignoring object-key order and preserving array order.
2. Added optional traversal evidence with real output coordinates, pairing/source values, and JSON Pointers to `vendor/backtracking.cjs`.
3. Adapted `vendor/audit-executions.cjs` for browser use while preserving its Node CLI entry point; added optional report paths and missing-record messages.
4. Wrote and ran `tests/check.cjs`, corrected concrete failures in legacy-result and CLI-exit handling, and checked original/repaired fixtures, missing data, evidence, and pointer escaping.

The session ran the test command directly. The agent configuration also records the intended stop-time check hook.

## Review and inspectable evidence

Kiro’s actual implementation was committed before integration review as [`cc3a85c6ae9519602f6b28d36da6f4901e15150d`](https://github.com/blucca/threadbare/commit/cc3a85c6ae9519602f6b28d36da6f4901e15150d). That checkpoint makes its code contribution inspectable. Subsequent integration edits consolidated evidence capture into the shared walker, refined escaped pointers and boundary evidence, exposed the parent’s recorded pairing address, and kept the test script focused.

The integration check completed successfully with `npm run check`. The browser UI calls this same core with `{ includePaths: true }`; it renders the evidence returned by traversal.

To inspect or repeat the public check from a checkout:

```sh
git show --stat cc3a85c
npm ci
npm run build
npm run check
```

Public evidence consists of the root configuration, spec/steering, implementation checkpoint, current source, and reproducible fixture checks. Raw service logs and account credentials remain private.

The [2:34 product walkthrough](https://blucca.github.io/threadbare/demo/) shows the real desk, local import, and edited excerpts of this completed Kiro build.
