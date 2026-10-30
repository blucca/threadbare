# Threadbare · Dispatch Desk

**Trace a crossed n8n item, inspect its saved evidence, and take the finding with you.**

Customer D’s order went to A. Both recorded workflows succeeded. Across the original and repaired runs, all 11 business-node JSON snapshots match. Threadbare opens that saved synthetic case at the point where the parent’s recorded pairing and the child’s resolved origin diverge.

The desk is for n8n delivery engineers investigating a saved parent–child handoff. Choose a returned item, follow its actual `pairedItem` and `source` entries, and download a structural report to review alongside the original executions.

## Try the case

[Open the desk](https://blucca.github.io/threadbare/) · [Source](https://github.com/blucca/threadbare)

For a local checkout:

```sh
npm ci
npm run build
npm run check
python3 -m http.server 8080 --bind 127.0.0.1
```

Open **http://127.0.0.1:8080/**. The bundled browser assets also work with a static HTTP server directly.

1. In **Original**, the desk finds **2 mismatches across 2 returned items**.
2. Click **Trace selected item**. Returned output 0, item 0 resolves through the child to caller input item 3, Customer D. The parent records input item 0, Customer A.
3. Open the raw steps. At `Select`, `pairedItem.input: 1` selects `source[1]`; `Right Sort` leads to `Start`, item 3. Every step includes its saved node/run/output/item address and the value read there. The parent’s recorded pairing has its own raw address.
4. Switch to **Repaired** to audit the separately saved repair: **0 mismatches**. This switches recordings and reruns the same auditor.
5. Choose **Download report** to keep `threadbare-ancestry-report.json`.

The separate HTTP panel replays requests recorded for these synthetic orders in n8n 2.41.7. It shows the original A/B recipients and repaired D/C recipients.

## Inspect your executions

Use **complete API execution responses**. Threadbare reads the execution IDs, saved workflow definitions, `data.resultData.runData`, and both directions of the recorded call metadata.

One acquisition route, run in your own shell:

```sh
export N8N_URL='https://your-n8n-instance.example'
export N8N_API_KEY='your-n8n-api-key'
export PARENT_ID='your-parent-execution-id'

curl -fsS -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_URL/api/v1/executions/$PARENT_ID?includeData=true" > parent.json
```

In **Import executions**, choose `parent.json` first. The desk reads the actual caller node, saved run, and `metadata.subExecution.executionId`, then displays a `curl` command containing that child’s ID. Run that command in the same shell to save `child.json`. Choose the child file and click **Audit executions**.

You can also drop both files together; the importer uses their IDs and recorded call edge to identify the pair. A workflow-definition export is for recreating a workflow. This desk needs the saved execution responses, including provenance. Missing data produces an actionable path or contract requirement, such as `/data/resultData/runData` or a specific upstream item address.

Custom files are parsed locally in the browser. Your instance URL and API key stay in your own shell. The synthetic HTTP panel stays with the bundled demo; imported executions receive an ancestry check.

## Supported boundary

- One recorded **Execute Workflow 1.2** call matching the supplied child, in **once** mode and waiting for completion.
- Successful parent and child executions, with a single recorded caller input source.
- One child input boundary: a **passthrough Execute Workflow Trigger** at its first saved run, preserving caller input JSON, item order, and pairing.
- Complete saved item provenance and source entries through the child; matching child terminal and parent returned JSON.

The traversal preserves consumer input, producer output, producer run, and recorded ancestry branches. Input values are plain parsed JSON: object-key order is ignored; array order is preserved.

| Report state | Meaning |
| --- | --- |
| `mismatch` | A parent returned item records a different input-item set from the set resolved through its child ancestry. |
| `consistent` | All inspected parent pairing sets agree with the child-resolved sets within this boundary contract. |
| `incomplete` | A required saved record or supported boundary condition is missing. The desk gives the location or requirement to address. |

## What the report contains

Execution IDs; caller and input coordinates; returned-item findings; expected and recorded input-item sets; parent pairing evidence; and the child’s ordered traversal edges with JSON Pointers and original pairing/source metadata. These addresses let a reviewer open the same locations in the original files.

Business item `.json` values are excluded. Node names and execution IDs remain as structural references. The report covers recorded ancestry; the bundled case’s HTTP delivery observations are a separate evidence source.

For a compact command-line check using the same core:

```sh
node vendor/audit-executions.cjs parent.json child.json
# Exit codes: consistent 0, mismatch 1, incomplete 2.
```

## Build and Kiro

`npm ci` installs the pinned build dependency. `npm run build` bundles `src/app.js` into `assets/app.js`. `npm run check` runs the focused saved-record checks, including two original mismatches, zero repaired mismatches, exact raw-pointer values, missing evidence, and the original CLI contract.

Kiro CLI v3 performed the spec-driven core implementation: browser JSON equality, traversal evidence, browser-compatible auditing, and fixture checks. The public [`.kiro/`](.kiro/) contains the requirements, design, tasks, evidence steering, and custom-agent check hook. [Kiro build record](docs/kiro-build.md) separates that implementation from subsequent integration review.

## Origin and license

This browser desk was started on **31 October 2026** for the Kiroween **Costume Contest**. Its midnight dispatch-board costume makes the two evidence roles tangible: crossed threads for divergent pairings and an open socket for missing evidence.

The earlier MIT audit core and four saved synthetic executions come from `blucca/n8n-check`, pinned at `8c83e93`. The new browser desk, traversal explanations, local acquisition/import flow, and report are documented in [reuse.md](docs/reuse.md). Software is [MIT](LICENSE); bundled Atkinson Hyperlegible and Barlow Condensed fonts retain their SIL Open Font License files in `assets/fonts/`.

The demonstration uses the bundled synthetic recordings.
