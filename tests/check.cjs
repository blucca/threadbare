// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { auditBoundary } = require('../vendor/audit-executions.cjs');
const { findPairedItemThroughWorkflowData: trace, pointer } = require('../vendor/backtracking.cjs');
const { jsonDeepEqual } = require('../vendor/json-equal.cjs');
const load = name => JSON.parse(fs.readFileSync(path.join(__dirname, '../samples', name + '.json')));
const original = [load('original-parent'), load('original-child')];
const repaired = [load('repaired-parent'), load('repaired-child')];
const resolve = (object, p) => p.slice(1).split('/').reduce((v, k) => v?.[k.replaceAll('~1', '/').replaceAll('~0', '~')], object);
function checkEdges(pair) {
  const report = auditBoundary(...pair, { includePaths: true });
  for (const finding of report.findings) {
    assert.deepEqual(resolve(pair[0], finding.parent_paired_item_path), finding.parent_paired_item);
    assert.ok(finding.path.length);
    for (const step of finding.path) {
      assert.ok(step.from.output >= 0);
      assert.deepEqual(resolve(pair[1], step.paired_item_path), step.paired_item);
      assert.deepEqual(resolve(pair[1], step.source_path), step.source);
      assert.ok(step.to || step.boundary);
    }
  }
  for (const [role, address] of Object.entries(report.evidence)) {
    assert.ok(resolve(role.startsWith('child') ? pair[1] : pair[0], address));
  }
  return report;
}
const before = checkEdges(original), after = checkEdges(repaired);
assert.equal(before.status, 'mismatch'); assert.equal(before.mismatches, 2);
assert.deepEqual(before.findings[0].expected, [{ input: 0, item: 3 }]);
assert.equal(after.status, 'consistent'); assert.equal(after.mismatches, 0);
assert.ok(!('evidence' in auditBoundary(...original))); // Default CLI report shape stays compact.
const d = original[1].data, last = d.resultData.lastNodeExecuted;
const item = d.resultData.runData[last].at(-1).data.main[0][0];
assert.deepEqual(trace(d, item, 0), { item: 3 }); // The original caller's item 0 resolves to input 3.
assert.throws(() => trace(d, item, 0, { onStep: () => {} }), /terminal output index at .*\/data\/main$/);
assert.ok(jsonDeepEqual({ a: 1, b: [2] }, { b: [2], a: 1 }));
assert.ok(!jsonDeepEqual([1, 2], [2, 1]));
const absent = structuredClone(original[0]); delete absent.data.resultData.runData;
assert.throws(() => auditBoundary(absent, original[1]), /\/data\/resultData\/runData/);
for (const role of ['parent', 'child']) {
  const pair = structuredClone(repaired);
  const execution = role === 'parent' ? pair[0] : pair[1];
  const other = role === 'parent' ? pair[1] : pair[0];
  const edge = role === 'parent' ? 'parentExecution' : 'subExecution';
  delete execution.workflowId;
  const task = Object.values(other.data.resultData.runData).flat().find(value => value.metadata?.[edge]);
  delete task.metadata[edge].workflowId;
  assert.throws(() => auditBoundary(...pair), /\/workflowId/);
}

// Real node names can contain slashes/tilde: every resulting address still resolves.
const escaped = structuredClone(original[1]), renamed = last + '/~';
escaped.data.resultData.runData[renamed] = escaped.data.resultData.runData[last];
delete escaped.data.resultData.runData[last];
escaped.data.resultData.lastNodeExecuted = renamed;
escaped.workflowData.nodes.find(n => n.name === last).name = renamed;
assert.equal(checkEdges([original[0], escaped]).status, 'mismatch');
assert.ok(pointer('Return/~').includes('Return~1~0'));
const missingTerminal = structuredClone(escaped);
delete missingTerminal.data.resultData.runData[renamed].at(-1).data.main;
assert.throws(() => auditBoundary(original[0], missingTerminal, { includePaths: true }), {
  message: 'Missing child terminal output at ' + pointer('data', 'resultData', 'runData', renamed, missingTerminal.data.resultData.runData[renamed].length - 1, 'data', 'main')
});
const broken = structuredClone(original[1]);
const firstSource = broken.data.resultData.runData[last][0].source[0];
delete broken.data.resultData.runData[firstSource.previousNode][firstSource.previousNodeRun ?? 0].data.main[firstSource.previousNodeOutput ?? 0][0];
assert.throws(() => auditBoundary(original[0], broken, { includePaths: true }), /Missing upstream item at \/data\/resultData\/runData\//);

// One shared walker preserves fan-in and the producer's run/output axes.
const axes = { resultData: { lastNodeExecuted: 'Merge', runData: {
  Source: [{ source: [], data: { main: [[], []] } }, { source: [], data: { main: [[], [{ pairedItem: 4 }]] } }],
  Merge: [{ source: [null, { previousNode: 'Source', previousNodeRun: 1, previousNodeOutput: 1 }], data: { main: [[{ pairedItem: { input: 1, item: 0 } }]] } }],
} } };
const edges = [];
assert.deepEqual(trace(axes, axes.resultData.runData.Merge[0].data.main[0][0], 0, { output: 0, onStep: e => edges.push(e) }), { item: 4 });
assert.deepEqual(edges[0].to, { node: 'Source', run: 1, output: 1, item: 0 });
const snap = x => Object.fromEntries(Object.entries(x.data.resultData.runData).filter(([n]) => n !== 'Webhook').map(([n, runs]) => [n, runs.map(r => r.data.main.map(out => out.map(i => i.json)))]));
assert.deepEqual(snap(original[0]), snap(repaired[0]));
assert.deepEqual(snap(original[1]), snap(repaired[1]));
assert.equal(Object.keys(snap(original[0])).length + Object.keys(snap(original[1])).length, 11);
for (const [mode, code] of [['original', 1], ['repaired', 0]]) {
  const cli = spawnSync(process.execPath, [path.join(__dirname, '../vendor/audit-executions.cjs'), path.join(__dirname, '../samples/' + mode + '-parent.json'), path.join(__dirname, '../samples/' + mode + '-child.json')], { encoding: 'utf8' });
  assert.equal(cli.status, code); assert.ok(JSON.parse(cli.stdout).findings.length);
}
console.log('PASS: two mismatches / zero repaired / exact raw pointers / missing evidence / shared axes / original CLI');
