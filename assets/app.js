var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// vendor/backtracking.cjs
var require_backtracking = __commonJS({
  "vendor/backtracking.cjs"(exports, module) {
    "use strict";
    var pointer = (...parts) => "/" + parts.map((p) => String(p).replaceAll("~", "~0").replaceAll("/", "~1")).join("/");
    function findPairedItemThroughWorkflowData(workflowRunData, item, itemIndex, options) {
      const data = workflowRunData?.resultData;
      const runs = data?.runData;
      const last = data?.lastNodeExecuted;
      const runIndex = runs?.[last]?.length - 1;
      if (!Number.isInteger(runIndex) || runIndex < 0) return void 0;
      const active = /* @__PURE__ */ new Set();
      const onStep = options?.onStep;
      function missing(path, reason) {
        if (onStep) throw new Error(reason + " at " + path);
        return void 0;
      }
      const terminalOutput = options?.output ?? -1;
      if (onStep && (!Number.isInteger(terminalOutput) || terminalOutput < 0)) {
        return missing(
          pointer("data", "resultData", "runData", last, runIndex, "data", "main"),
          "Evidence capture requires a terminal output index"
        );
      }
      function visit(node, run, output, index, current) {
        const key = JSON.stringify([node, run, output, index]);
        const taskPath = pointer("data", "resultData", "runData", node, run);
        const itemPath = taskPath + "/data/main/" + output + "/" + index;
        if (active.has(key)) return missing(itemPath, "Cyclic recorded ancestry");
        const task = runs[node]?.[run];
        if (!task) return missing(taskPath, "Missing saved node run");
        if (current?.pairedItem === void 0) return missing(itemPath + "/pairedItem", "Missing pairedItem provenance");
        const entries = Array.isArray(current.pairedItem) ? current.pairedItem : [current.pairedItem];
        if (!entries.length) return missing(itemPath + "/pairedItem", "Empty pairedItem provenance");
        const roots2 = /* @__PURE__ */ new Map();
        active.add(key);
        try {
          for (const [pairIndex, entry] of entries.entries()) {
            const pairPath = itemPath + "/pairedItem" + (Array.isArray(current.pairedItem) ? "/" + pairIndex : "");
            const pair = typeof entry === "number" ? { item: entry } : entry;
            if (!pair || !Number.isInteger(pair.item) || pair.item < 0) return missing(pairPath, "Invalid pairedItem index");
            const inlet = pair.input ?? 0;
            if (!Number.isInteger(inlet) || inlet < 0) return missing(pairPath, "Invalid pairedItem input");
            const from = { node, run, output, item: index };
            if (!task.source?.length && !pair.sourceOverwrite) {
              if (onStep) {
                if (!Array.isArray(task.source)) return missing(taskPath + "/source", "Missing recorded input boundary");
                onStep({
                  from,
                  boundary: { input: inlet, item: pair.item },
                  paired_item_path: pairPath,
                  paired_item: entry,
                  source_path: taskPath + "/source",
                  source: task.source
                });
              }
              roots2.set(pair.item, { item: pair.item });
              continue;
            }
            const sourcePath = pair.sourceOverwrite ? pairPath + "/sourceOverwrite" : taskPath + "/source/" + inlet;
            const source = pair.sourceOverwrite ?? task.source?.[inlet];
            if (!source?.previousNode) return missing(sourcePath, "Missing selected recorded source");
            const previousRun = source.previousNodeRun ?? 0;
            const previousOutput = source.previousNodeOutput ?? 0;
            if (![previousRun, previousOutput].every((value) => Number.isInteger(value) && value >= 0)) {
              return missing(sourcePath, "Invalid producer run/output");
            }
            const previousPath = pointer("data", "resultData", "runData", source.previousNode, previousRun, "data", "main", previousOutput, pair.item);
            const previous = runs[source.previousNode]?.[previousRun]?.data?.main?.[previousOutput]?.[pair.item];
            if (!previous) return missing(previousPath, "Missing upstream item");
            if (onStep) onStep({
              from,
              to: { node: source.previousNode, run: previousRun, output: previousOutput, item: pair.item },
              paired_item_path: pairPath,
              paired_item: entry,
              source_path: sourcePath,
              source
            });
            const found = visit(source.previousNode, previousRun, previousOutput, pair.item, previous);
            if (!found) return void 0;
            for (const root of found) roots2.set(root.item, root);
          }
          return [...roots2.values()];
        } finally {
          active.delete(key);
        }
      }
      const roots = visit(last, runIndex, terminalOutput, itemIndex, item);
      return roots?.length === 1 ? roots[0] : roots;
    }
    module.exports = { findPairedItemThroughWorkflowData, pointer };
  }
});

// vendor/json-equal.cjs
var require_json_equal = __commonJS({
  "vendor/json-equal.cjs"(exports, module) {
    "use strict";
    function jsonDeepEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return false;
      if (typeof a !== typeof b) return false;
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (!jsonDeepEqual(a[i], b[i])) return false;
        }
        return true;
      }
      if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
          if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
          if (!jsonDeepEqual(a[key], b[key])) return false;
        }
        return true;
      }
      return a === b;
    }
    module.exports = { jsonDeepEqual };
  }
});

// vendor/audit-executions.cjs
var require_audit_executions = __commonJS({
  "vendor/audit-executions.cjs"(exports, module) {
    "use strict";
    var { findPairedItemThroughWorkflowData: trace, pointer } = require_backtracking();
    var { jsonDeepEqual } = require_json_equal();
    function requireEvidence(condition, reason) {
      if (!condition) throw new Error(reason);
    }
    function pairs(value) {
      requireEvidence(value !== void 0, "Missing pairedItem provenance");
      const entries = Array.isArray(value) ? value : [value];
      requireEvidence(entries.length > 0, "Empty pairedItem provenance");
      const unique = /* @__PURE__ */ new Map();
      for (const entry of entries) {
        const pair = typeof entry === "number" ? { item: entry } : entry;
        requireEvidence(
          pair && Number.isInteger(pair.item) && pair.item >= 0,
          "Invalid pairedItem item index"
        );
        const input = pair.input ?? 0;
        requireEvidence(Number.isInteger(input) && input >= 0, "Invalid pairedItem input index");
        requireEvidence(!pair.sourceOverwrite, "Boundary sourceOverwrite requires a separate contract");
        unique.set(`${input}:${pair.item}`, { input, item: pair.item });
      }
      return [...unique.values()].sort((a, b) => a.input - b.input || a.item - b.item);
    }
    function auditBoundary2(parent, child, options = {}) {
      const { includePaths = false } = options;
      const parentRuns = parent?.data?.resultData?.runData;
      const childData = child?.data;
      const childRuns = childData?.resultData?.runData;
      requireEvidence(parent?.id, "Missing /id in parent execution");
      requireEvidence(child?.id, "Missing /id in child execution");
      requireEvidence(parentRuns, "Missing /data/resultData/runData in parent execution");
      requireEvidence(childRuns, "Missing /data/resultData/runData in child execution");
      requireEvidence(parent?.status === "success", 'Parent execution status is not "success"');
      requireEvidence(child?.status === "success", 'Child execution status is not "success"');
      requireEvidence(Array.isArray(parent.workflowData?.nodes), "Missing /workflowData/nodes in parent execution");
      requireEvidence(Array.isArray(child.workflowData?.nodes), "Missing /workflowData/nodes in child execution");
      const calls2 = [];
      for (const [node2, runs] of Object.entries(parentRuns)) {
        requireEvidence(Array.isArray(runs), "Invalid parent runData at " + pointer("data", "resultData", "runData", node2));
        for (const [run2, task2] of runs.entries()) {
          if (String(task2.metadata?.subExecution?.executionId) === String(child.id)) {
            calls2.push({ node: node2, run: run2, task: task2 });
          }
        }
      }
      requireEvidence(calls2.length === 1, "Expected one parent call edge matching this child execution ID");
      const { node, run, task } = calls2[0];
      const definition = parent.workflowData?.nodes?.find((value) => value.name === node);
      requireEvidence(definition, `Missing workflow node definition for ${node}`);
      requireEvidence(definition?.type === "n8n-nodes-base.executeWorkflow", `Node ${node} is not Execute Workflow`);
      requireEvidence(definition.typeVersion === 1.2, `Execute Workflow version is not 1.2 in node ${node}`);
      requireEvidence(
        (definition.parameters?.mode ?? "once") === "once",
        "Use a waiting once-mode child call"
      );
      requireEvidence(
        definition.parameters?.options?.waitForSubWorkflow !== false,
        "Use a waiting once-mode child call"
      );
      requireEvidence(
        String(task.metadata.subExecution.workflowId) === String(child.workflowId),
        "Child workflow ID differs from the actual parent call edge"
      );
      const roots = [];
      for (const [name, runs] of Object.entries(childRuns)) {
        requireEvidence(Array.isArray(runs), "Invalid child runData at " + pointer("data", "resultData", "runData", name));
        for (const [index, value] of runs.entries()) {
          requireEvidence(Array.isArray(value.source), "Missing child source edges at " + pointer("data", "resultData", "runData", name, index, "source"));
          if (!value.source.some((source2) => source2?.previousNode)) roots.push({ name, index, task: value });
        }
      }
      requireEvidence(roots.length === 1, "Expected one recorded child input boundary");
      requireEvidence(roots[0].index === 0, "Expected child input boundary at first run");
      const root = roots[0];
      const trigger = child.workflowData?.nodes?.find((value) => value.name === root.name);
      requireEvidence(trigger, `Missing workflow node definition for child trigger ${root.name}`);
      requireEvidence(
        trigger?.type === "n8n-nodes-base.executeWorkflowTrigger",
        `Child trigger ${root.name} is not Execute Workflow Trigger`
      );
      requireEvidence(
        trigger.parameters?.inputSource === "passthrough",
        "Expected a passthrough Execute Workflow Trigger"
      );
      requireEvidence(
        root.task.source.length === 0,
        "Expected a passthrough Execute Workflow Trigger with complete provenance"
      );
      const reverseEdge = root.task.metadata?.parentExecution;
      requireEvidence(reverseEdge, "Missing child parentExecution metadata");
      requireEvidence(
        String(reverseEdge?.executionId) === String(parent.id),
        "Child parentExecution executionId differs from this parent"
      );
      requireEvidence(
        String(reverseEdge?.workflowId) === String(parent.workflowId),
        "Child parentExecution workflowId differs from this parent"
      );
      requireEvidence(task.source?.length === 1, "Expected a single recorded caller input edge");
      requireEvidence(task.source[0]?.previousNode, "Missing caller input edge source");
      const source = task.source[0];
      const sourceRun = source.previousNodeRun ?? 0;
      const sourceOutput = source.previousNodeOutput ?? 0;
      const input = parentRuns[source.previousNode]?.[sourceRun]?.data?.main?.[sourceOutput];
      const start = root.task.data?.main;
      requireEvidence(Array.isArray(input), "Missing caller input data at " + pointer("data", "resultData", "runData", source.previousNode, sourceRun, "data", "main", sourceOutput));
      requireEvidence(start?.length === 1, "Missing child trigger data main array");
      requireEvidence(Array.isArray(start[0]), "Child trigger data main[0] is not an array");
      requireEvidence(start[0].length === input.length, "Caller input and child trigger item counts differ");
      for (const [index, item] of start[0].entries()) {
        requireEvidence(
          jsonDeepEqual(item.json, input[index].json),
          "Child trigger does not preserve the recorded caller input JSON"
        );
        requireEvidence(
          jsonDeepEqual(pairs(item.pairedItem), [{ input: 0, item: index }]),
          "Child trigger does not preserve the recorded caller input order and pairedItem"
        );
      }
      const last = childData.resultData.lastNodeExecuted;
      requireEvidence(typeof last === "string", "Missing /data/resultData/lastNodeExecuted in child execution");
      const terminalRun = childRuns[last]?.length - 1;
      requireEvidence(
        Number.isInteger(terminalRun) && terminalRun >= 0,
        "Missing child terminal run at " + pointer("data", "resultData", "runData", last)
      );
      const returned = childRuns[last][terminalRun]?.data?.main;
      const actual = task.data?.main;
      requireEvidence(Array.isArray(returned), "Missing child terminal output at " + pointer("data", "resultData", "runData", last, terminalRun, "data", "main"));
      requireEvidence(Array.isArray(actual), "Missing caller output at " + pointer("data", "resultData", "runData", node, run, "data", "main"));
      requireEvidence(
        returned.length === actual.length,
        "Child terminal output and caller output shapes differ"
      );
      const findings = [];
      for (const [output, items] of actual.entries()) {
        requireEvidence(Array.isArray(items), `Caller output ${output} is not an array`);
        requireEvidence(Array.isArray(returned[output]), `Child terminal output ${output} is not an array`);
        requireEvidence(
          items.length === returned[output].length,
          "Child terminal output and caller item counts differ at output " + output
        );
        for (const [index, item] of items.entries()) {
          const terminal = returned[output][index];
          requireEvidence(
            jsonDeepEqual(item.json, terminal.json),
            "Caller output JSON differs from the recorded child terminal item at output " + output + ", item " + index
          );
          const pathEdges = [];
          const expected = pairs(trace(childData, terminal, index, includePaths ? {
            output,
            onStep: (edge) => pathEdges.push(edge)
          } : void 0));
          requireEvidence(
            expected.every((pair) => pair.input === 0 && pair.item < input.length),
            "Child ancestry does not resolve within the recorded caller input at output " + output + ", item " + index
          );
          const observed = pairs(item.pairedItem);
          const finding = {
            output,
            item: index,
            expected,
            observed,
            status: jsonDeepEqual(expected, observed) ? "consistent" : "mismatch"
          };
          if (includePaths) {
            finding.parent_paired_item_path = pointer("data", "resultData", "runData", node, run, "data", "main", output, index, "pairedItem");
            finding.parent_paired_item = item.pairedItem;
            finding.path = pathEdges;
          }
          findings.push(finding);
        }
      }
      requireEvidence(findings.length > 0, "This child call returned no items to inspect");
      const mismatches = findings.filter((row) => row.status === "mismatch").length;
      const report = {
        status: mismatches ? "mismatch" : "consistent",
        scope: "Recorded ancestry at one waiting, once-mode Execute Workflow 1.2 boundary",
        parent_execution: String(parent.id),
        child_execution: String(child.id),
        node,
        run,
        caller_input: { node: source.previousNode, run: sourceRun, output: sourceOutput },
        checked_items: findings.length,
        mismatches,
        findings
      };
      if (includePaths) {
        report.evidence = {
          parent_call: pointer("data", "resultData", "runData", node, run),
          caller_input: pointer("data", "resultData", "runData", source.previousNode, sourceRun, "data", "main", sourceOutput),
          child_root: pointer("data", "resultData", "runData", root.name, root.index),
          child_terminal: pointer("data", "resultData", "runData", last, terminalRun, "data", "main")
        };
      }
      return report;
    }
    module.exports = { auditBoundary: auditBoundary2 };
    if (typeof __require !== "undefined" && __require.main === module) {
      const fs = __require("node:fs");
      let report;
      try {
        requireEvidence(
          process.argv.length === 4,
          "Usage: node audit-executions.cjs parent-execution.json child-execution.json"
        );
        report = auditBoundary2(...process.argv.slice(2).map((file) => JSON.parse(fs.readFileSync(file, "utf8"))));
      } catch (error) {
        report = { status: "incomplete", reason: error.message };
      }
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
      process.exitCode = { consistent: 0, mismatch: 1, incomplete: 2 }[report.status];
    }
  }
});

// src/app.js
var import_audit_executions = __toESM(require_audit_executions());
var { auditBoundary } = import_audit_executions.default;
var $ = (id) => document.getElementById(id);
var make = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== void 0) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
var state = { mode: "original", parent: null, child: null, report: null, selected: 0, demo: true };
var imports = { parent: null, child: null };
var recordings;
var httpRecord;
function calls(execution) {
  const runs = execution?.data?.resultData?.runData;
  if (!runs) throw new Error("Missing /data/resultData/runData. Download the full execution response with includeData=true.");
  const edges = [];
  for (const [node, entries] of Object.entries(runs)) {
    if (!Array.isArray(entries)) throw new Error("Invalid /data/resultData/runData/" + node + ": expected saved run entries.");
    entries.forEach((task, run) => {
      if (task?.metadata?.subExecution?.executionId != null) {
        edges.push({ node, run, id: String(task.metadata.subExecution.executionId) });
      }
    });
  }
  return edges;
}
function reverseParent(execution) {
  const runs = execution?.data?.resultData?.runData;
  for (const entries of Object.values(runs || {})) {
    for (const task of Array.isArray(entries) ? entries : []) {
      if (task?.metadata?.parentExecution?.executionId != null) return String(task.metadata.parentExecution.executionId);
    }
  }
  return null;
}
function audit(parent, child, demo) {
  state.parent = parent;
  state.child = child;
  state.demo = demo;
  state.selected = 0;
  try {
    state.report = auditBoundary(parent, child, { includePaths: true });
  } catch (error) {
    state.report = { status: "incomplete", reason: error.message };
  }
  $("evidence-panel").hidden = true;
  render();
}
function inputItems() {
  const source = state.report.caller_input;
  return source ? state.parent.data.resultData.runData[source.node][source.run].data.main[source.output] : [];
}
function inputName(item) {
  if (state.demo) {
    const id = inputItems()[item]?.json?.order?.id;
    if (id) return String(id).replace(/^customer-/, "Customer ");
  }
  return "Input item " + item;
}
function originName(pair) {
  return pair.input === 0 && pair.item < inputItems().length ? inputName(pair.item) : "Input " + pair.input + ", item " + pair.item;
}
function selectedFinding() {
  return state.report?.findings?.[state.selected];
}
function selectItem(index, reveal = true) {
  state.selected = index;
  renderBoard();
  renderSelection();
  if (reveal) {
    $("evidence-panel").hidden = false;
    renderEvidence();
  }
}
function render() {
  const report = state.report;
  const status = report.status;
  $("scope-note").textContent = "Recorded ancestry at a successful, waiting once-mode Execute Workflow 1.2 call with a passthrough child trigger. Complete matching parent and child API responses. Imports and reports stay in your browser.";
  $("overall-status").textContent = status === "mismatch" ? "Crossed lines" : status === "consistent" ? "Lines agree" : "Missing evidence";
  $("overall-status").dataset.state = status;
  $("status-detail").textContent = status === "incomplete" ? report.reason : report.mismatches + " mismatches across " + report.checked_items + " returned items";
  $("return-demo").hidden = state.demo;
  $("case-provenance").textContent = state.demo ? "Synthetic customers \xB7 recorded n8n 2.41.7" : "Your saved executions \xB7 local analysis";
  if (state.demo && status !== "incomplete") {
    $("case-title").textContent = state.mode === "original" ? "Customer D\u2019s order went to A." : "The records agree again.";
    $("case-subtitle").textContent = state.mode === "original" ? "Both recorded workflows succeeded. All 11 business-node JSON snapshots matched. The saved pairing tells a different story." : "Both recorded workflows succeeded. The business-node JSON is unchanged. The parent now records the same inputs as the child.";
  } else {
    $("case-title").textContent = status === "mismatch" ? report.mismatches + " recorded pairings diverge." : status === "consistent" ? "These recorded links agree." : "The evidence is missing a piece.";
    $("case-subtitle").textContent = status === "incomplete" ? "Add the complete matching execution response to finish this boundary check." : "Parent " + report.parent_execution + " and child " + report.child_execution + " both succeeded. This desk checks their recorded item handoff.";
  }
  for (const mode of ["original", "repaired"]) {
    $("mode-" + mode).setAttribute("aria-pressed", String(state.demo && state.mode === mode));
  }
  $("download-report").disabled = status === "incomplete";
  $("trace-item").disabled = status === "incomplete";
  renderBoard();
  renderSelection();
  renderHttp();
}
function renderBoard() {
  const stage = $("switchboard");
  stage.replaceChildren();
  const report = state.report;
  if (report.status === "incomplete") {
    stage.classList.add("is-incomplete");
    const ghost = make("div", void 0, "ghost-plug");
    ghost.append(make("span", "\u25CB", "ghost-socket"), make("p", "An open socket needs its saved source."), make("p", report.reason, "missing-path"));
    stage.append(ghost);
    return;
  }
  stage.classList.remove("is-incomplete");
  const inputs = inputItems();
  const findings = report.findings;
  const height = Math.max(300, 64 * Math.max(inputs.length, findings.length) + 44);
  stage.style.aspectRatio = "940 / " + height;
  if (height > 300) stage.style.minHeight = height + "px";
  else stage.style.minHeight = "";
  const inputY = (i) => 54 + 64 * i;
  const returnY = (i) => findings.length === 1 ? height / 2 : 86 + (height - 172) * i / (findings.length - 1);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 720 " + height);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("board-wires");
  const left = make("div", void 0, "board-inputs");
  const right = make("div", void 0, "board-returns");
  inputs.forEach((item, i) => {
    const pin = make("div", void 0, "pin-input");
    pin.style.top = 100 * inputY(i) / height + "%";
    pin.append(make("span", inputName(i), "pin-label"), make("span", report.caller_input.node + " / item " + i, "pin-address"), make("span", void 0, "socket"));
    pin.lastChild.setAttribute("aria-hidden", "true");
    left.append(pin);
  });
  findings.forEach((finding, i) => {
    const pin = make("button", void 0, "pin-return" + (i === state.selected ? " selected" : "") + (finding.status === "mismatch" ? " is-mismatch" : ""));
    pin.type = "button";
    pin.style.top = 100 * returnY(i) / height + "%";
    pin.setAttribute("aria-pressed", String(i === state.selected));
    pin.setAttribute("aria-label", "Trace output " + finding.output + ", returned item " + finding.item + ", " + finding.status);
    pin.append(make("span", void 0, "socket"), make("span", "Item " + finding.item, "pin-label"), make("span", "Output " + finding.output + " / " + finding.status, "pin-address"));
    pin.firstChild.setAttribute("aria-hidden", "true");
    pin.onclick = () => selectItem(i);
    right.append(pin);
    for (const role of ["observed", "expected"]) {
      for (const pair of finding[role]) {
        if (pair.input !== 0 || !inputs[pair.item]) continue;
        const wire = document.createElementNS(ns, "path");
        const start = inputY(pair.item), end = returnY(i);
        const bend = role === "expected" ? 18 : -18;
        wire.setAttribute("d", "M70 " + start + " C270 " + (start + bend) + " 440 " + (end - bend) + " 650 " + end);
        wire.setAttribute("fill", "none");
        wire.classList.add("wire-" + role);
        if (i === state.selected) wire.classList.add("is-selected");
        if (finding.status === "consistent") wire.classList.add("is-consistent");
        wire.onclick = () => selectItem(i);
        svg.append(wire);
      }
    }
  });
  stage.append(svg, left, right);
  const legend = make("div", void 0, "board-legend");
  for (const [role, label] of [["observed", "Parent recorded"], ["expected", "Child resolves"]]) {
    const item = make("span");
    item.append(make("span", void 0, "legend-line " + role), document.createTextNode(label));
    legend.append(item);
  }
  stage.append(legend);
}
function renderSelection() {
  const target = $("selection-summary");
  target.replaceChildren();
  const finding = selectedFinding();
  if (!finding) {
    target.append(make("p", state.report.reason || "Load both saved execution responses."));
    return;
  }
  const p = make("p");
  p.append(make("strong", "Child resolves to " + finding.expected.map(originName).join(" + ")), document.createTextNode(". Parent records " + finding.observed.map(originName).join(" + ") + "."));
  target.append(p, make("p", "Returned output " + finding.output + ", item " + finding.item + " \xB7 " + state.report.node + ", run " + state.report.run, "selection-address"));
}
function renderEvidence() {
  const target = $("evidence-steps");
  target.replaceChildren();
  const finding = selectedFinding();
  if (!finding?.path?.length) {
    target.append(make("p", "This report has no captured traversal edges. Load a complete saved response and rerun the check."));
    return;
  }
  const recorded = make("div", void 0, "parent-evidence");
  recorded.append(
    make("h3", "What the parent recorded"),
    make("p", "Parent execution " + state.report.parent_execution + " pairs this returned item with the input below."),
    make("code", finding.parent_paired_item_path, "raw-path"),
    make("pre", JSON.stringify(finding.parent_paired_item, null, 2))
  );
  target.append(recorded);
  const relation = make("p", "From the child\u2019s actual terminal item to its recorded input boundary. Each address below resolves in your child execution JSON.", "evidence-intro");
  target.append(relation);
  finding.path.forEach((step, index) => {
    const details = make("details", void 0, "evidence-step");
    details.open = index === 0;
    const from = step.from;
    const summary = make("summary");
    summary.append(make("span", String(index + 1), "step-index"), make("span", from.node, "step-node"), make("span", "run " + from.run + " / output " + from.output + " / item " + from.item, "step-coordinate"));
    details.append(summary);
    const body = make("div", void 0, "raw-evidence");
    body.append(make("p", "Recorded paired item"), make("code", step.paired_item_path, "raw-path"), make("pre", JSON.stringify(step.paired_item, null, 2)));
    if (step.source_path) {
      body.append(
        make("p", step.boundary ? "Recorded input boundary (no upstream source)" : "Selected recorded source"),
        make("code", step.source_path, "raw-path"),
        make("pre", JSON.stringify(step.source, null, 2))
      );
    }
    if (step.to) {
      body.append(make("p", "Continue to " + step.to.node + ", run " + step.to.run + ", output " + step.to.output + ", item " + step.to.item));
    } else if (step.boundary) {
      body.append(make("p", "This child input corresponds to caller input item " + step.boundary.item + "."));
    }
    details.append(body);
    target.append(details);
  });
  if (state.report.evidence) {
    const context = make("details", void 0, "evidence-step");
    context.append(make("summary", "The matching parent\u2013child call"));
    const body = make("div", void 0, "raw-evidence");
    for (const [key, value] of Object.entries(state.report.evidence)) {
      body.append(make("p", key.replaceAll("_", " ")), make("code", typeof value === "string" ? value : JSON.stringify(value), "raw-path"));
    }
    context.append(body);
    target.append(context);
  }
}
function renderHttp() {
  const target = $("http-observations");
  target.hidden = !state.demo || state.report.status === "incomplete";
  target.replaceChildren();
  if (target.hidden) return;
  const observations = httpRecord[state.mode];
  target.append(make("h2", "Separately recorded HTTP delivery"), make("p", "Synthetic native run, n8n 2.41.7. This is the recorded request log, separate from the ancestry check."));
  const list = make("div", void 0, "http-rows");
  observations.requests.forEach((request, i) => {
    const row = make("p", void 0, "http-row");
    row.append(
      make("span", "Slot " + request.slot),
      make("span", "Expected " + observations.expected_recipients[i].replace("customer-", "Customer ")),
      make("strong", "Sent to " + request.recipient.replace("customer-", "Customer "))
    );
    list.append(row);
  });
  target.append(list, make("p", "Original and repaired business-node JSON snapshots are identical. These saved records include the changed pairing metadata.", "http-note"));
}
function showImport() {
  const dialog = $("import-dialog");
  if (!dialog.open) dialog.showModal();
  updateImportHelp();
}
function executionCommand(id, filename) {
  return 'curl -H "X-N8N-API-KEY: $N8N_API_KEY" \\\n  "$N8N_URL/api/v1/executions/' + id + '?includeData=true" > ' + filename;
}
function updateImportHelp() {
  const target = $("child-help");
  target.hidden = false;
  target.replaceChildren();
  const parent = imports.parent;
  if (parent) {
    let edges;
    try {
      edges = calls(parent);
    } catch (error) {
      target.append(make("p", error.message));
      $("import-audit").disabled = true;
      return;
    }
    if (!edges.length) {
      target.append(make("p", "No /data/resultData/runData/<caller>/<run>/metadata/subExecution/executionId is saved in this response. Add the parent execution that recorded the waited child call."));
    } else {
      target.append(make("p", "This parent recorded " + edges.length + " child call" + (edges.length === 1 ? "" : "s") + ". Download the matching full child response:"));
      for (const edge of edges) {
        target.append(make("p", edge.node + ", run " + edge.run + " \u2192 child execution " + edge.id), make("pre", executionCommand(encodeURIComponent(edge.id), "child.json"), "download-command"));
      }
    }
  } else if (imports.child) {
    const id = reverseParent(imports.child);
    target.append(make("p", id ? "This child recorded parent execution " + id + ". Add that full parent response:" : "Add the matching full parent response."));
    if (id) target.append(make("pre", executionCommand(encodeURIComponent(id), "parent.json"), "download-command"));
  } else {
    target.append(make("p", "Start with the parent\u2019s full API execution response. Its saved call metadata gives the real child execution ID. Set N8N_URL and N8N_API_KEY in your own shell; this page collects neither."));
    target.append(make("pre", executionCommand("<parent-id>", "parent.json"), "download-command"));
  }
  $("import-audit").disabled = !(imports.parent && imports.child);
}
async function readFile(file) {
  try {
    const value = JSON.parse(await file.text());
    if (!value?.id || !value?.data?.resultData?.runData) {
      throw new Error("Missing /id or /data/resultData/runData. This looks like a workflow definition or partial response. Use GET /api/v1/executions/<id>?includeData=true.");
    }
    return value;
  } catch (error) {
    throw new Error(file.name + ": " + error.message);
  }
}
async function receiveFiles(files, slot) {
  if (slot) imports[slot] = null;
  $("import-audit").disabled = true;
  $("import-status").textContent = "Reading the selected execution files\u2026";
  try {
    if (!files.length || files.length > 2) throw new Error("Choose one parent response and one child response.");
    const values = await Promise.all([...files].map(readFile));
    if (slot) imports[slot] = values[0];
    else if (values.length === 2) {
      const [a, b] = values;
      if (calls(a).some((call) => call.id === String(b.id))) Object.assign(imports, { parent: a, child: b });
      else if (calls(b).some((call) => call.id === String(a.id))) Object.assign(imports, { parent: b, child: a });
      else throw new Error("These execution IDs have no matching recorded parent call edge. Add the child ID from the parent metadata.");
    } else {
      const value = values[0];
      if (reverseParent(value)) imports.child = value;
      else imports.parent = value;
    }
    $("import-status").textContent = "Loaded " + (imports.parent ? "parent " + imports.parent.id : "no parent yet") + " and " + (imports.child ? "child " + imports.child.id : "no child yet") + ". Files remain local.";
    $("import-status").dataset.state = "ready";
    updateImportHelp();
  } catch (error) {
    if (slot) imports[slot] = null;
    else Object.assign(imports, { parent: null, child: null });
    updateImportHelp();
    $("import-status").textContent = error.message;
    $("import-status").dataset.state = "error";
  }
}
$("open-import").onclick = showImport;
$("close-import").onclick = () => $("import-dialog").close();
$("parent-file").onchange = (event) => receiveFiles(event.target.files, "parent");
$("child-file").onchange = (event) => receiveFiles(event.target.files, "child");
$("import-drop").ondragover = (event) => {
  event.preventDefault();
  event.currentTarget.classList.add("is-dragging");
};
$("import-drop").ondragleave = (event) => event.currentTarget.classList.remove("is-dragging");
$("import-drop").ondrop = (event) => {
  event.preventDefault();
  event.currentTarget.classList.remove("is-dragging");
  receiveFiles(event.dataTransfer.files);
};
$("import-audit").onclick = () => {
  if (!(imports.parent && imports.child)) return;
  audit(imports.parent, imports.child, false);
  if (state.report.status === "incomplete") {
    $("import-status").textContent = state.report.reason;
    $("import-status").dataset.state = "error";
  } else $("import-dialog").close();
};
$("return-demo").onclick = () => {
  Object.assign(imports, { parent: null, child: null });
  $("parent-file").value = "";
  $("child-file").value = "";
  $("import-status").textContent = "Choose a parent execution to begin.";
  $("import-status").dataset.state = "";
  $("import-dialog").close();
  loadMode("original");
};
function loadMode(mode) {
  state.mode = mode;
  audit(recordings[mode].parent, recordings[mode].child, true);
}
for (const mode of ["original", "repaired"]) $("mode-" + mode).onclick = () => loadMode(mode);
$("trace-item").onclick = () => {
  $("evidence-panel").hidden = false;
  renderEvidence();
  $("evidence-panel").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
};
$("download-report").onclick = () => {
  if (!state.report || state.report.status === "incomplete") return;
  const blob = new Blob([JSON.stringify({ tool: "Threadbare", ...state.report }, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = make("a");
  link.href = url;
  link.download = "threadbare-ancestry-report.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
};
try {
  const names = ["original-parent", "original-child", "repaired-parent", "repaired-child", "recorded-http"];
  const values = await Promise.all(names.map(async (name) => {
    const response = await fetch("./samples/" + name + ".json");
    if (!response.ok) throw new Error("Saved sample response " + name + " is unavailable (HTTP " + response.status + ").");
    return response.json();
  }));
  recordings = { original: { parent: values[0], child: values[1] }, repaired: { parent: values[2], child: values[3] } };
  httpRecord = values[4];
  loadMode("original");
} catch (error) {
  state.report = { status: "incomplete", reason: error.message };
  render();
}
