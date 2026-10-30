// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Blucca
'use strict';

// Read-only diagnosis of one recorded, waiting, once-mode child call.
// This checks ancestry at the call boundary; business expectations stay separate.
// Browser-compatible: no Node fs/util imports at module top
const { findPairedItemThroughWorkflowData: trace, pointer } = require('./backtracking.cjs');
const { jsonDeepEqual } = require('./json-equal.cjs');

function requireEvidence(condition, reason) {
  if (!condition) throw new Error(reason);
}

function pairs(value) {
  requireEvidence(value !== undefined, 'Missing pairedItem provenance');
  const entries = Array.isArray(value) ? value : [value];
  requireEvidence(entries.length > 0, 'Empty pairedItem provenance');
  const unique = new Map();
  for (const entry of entries) {
    const pair = typeof entry === 'number' ? { item: entry } : entry;
    requireEvidence(pair && Number.isInteger(pair.item) && pair.item >= 0,
      'Invalid pairedItem item index');
    const input = pair.input ?? 0;
    requireEvidence(Number.isInteger(input) && input >= 0, 'Invalid pairedItem input index');
    requireEvidence(!pair.sourceOverwrite, 'Boundary sourceOverwrite requires a separate contract');
    unique.set(`${input}:${pair.item}`, { input, item: pair.item });
  }
  return [...unique.values()].sort((a, b) => a.input - b.input || a.item - b.item);
}

function auditBoundary(parent, child, options = {}) {
  const { includePaths = false } = options;
  
  const parentRuns = parent?.data?.resultData?.runData;
  const childData = child?.data;
  const childRuns = childData?.resultData?.runData;
  
  // Improved error messages with actual JSON pointers
  requireEvidence(parent?.id, 'Missing /id in parent execution');
  requireEvidence(child?.id, 'Missing /id in child execution');
  requireEvidence(parentRuns, 'Missing /data/resultData/runData in parent execution');
  requireEvidence(childRuns, 'Missing /data/resultData/runData in child execution');
  requireEvidence(parent?.status === 'success', 'Parent execution status is not "success"');
  requireEvidence(child?.status === 'success', 'Child execution status is not "success"');

  requireEvidence(Array.isArray(parent.workflowData?.nodes), 'Missing /workflowData/nodes in parent execution');
  requireEvidence(Array.isArray(child.workflowData?.nodes), 'Missing /workflowData/nodes in child execution');

  const calls = [];
  for (const [node, runs] of Object.entries(parentRuns)) {
    requireEvidence(Array.isArray(runs), 'Invalid parent runData at ' + pointer('data', 'resultData', 'runData', node));
    for (const [run, task] of runs.entries()) {
      if (String(task.metadata?.subExecution?.executionId) === String(child.id)) {
        calls.push({ node, run, task });
      }
    }
  }
  requireEvidence(calls.length === 1, 'Expected one parent call edge matching this child execution ID');
  const { node, run, task } = calls[0];
  
  const definition = parent.workflowData?.nodes?.find(value => value.name === node);
  requireEvidence(definition, `Missing workflow node definition for ${node}`);
  requireEvidence(definition?.type === 'n8n-nodes-base.executeWorkflow', `Node ${node} is not Execute Workflow`);
  requireEvidence(definition.typeVersion === 1.2, `Execute Workflow version is not 1.2 in node ${node}`);
  requireEvidence((definition.parameters?.mode ?? 'once') === 'once',
    'Use a waiting once-mode child call');
  requireEvidence(definition.parameters?.options?.waitForSubWorkflow !== false,
    'Use a waiting once-mode child call');
  requireEvidence(String(task.metadata.subExecution.workflowId) === String(child.workflowId),
    'Child workflow ID differs from the actual parent call edge');

  const roots = [];
  for (const [name, runs] of Object.entries(childRuns)) {
    requireEvidence(Array.isArray(runs), 'Invalid child runData at ' + pointer('data', 'resultData', 'runData', name));
    for (const [index, value] of runs.entries()) {
      requireEvidence(Array.isArray(value.source), 'Missing child source edges at ' + pointer('data', 'resultData', 'runData', name, index, 'source'));
      if (!value.source.some(source => source?.previousNode)) roots.push({ name, index, task: value });
    }
  }
  requireEvidence(roots.length === 1, 'Expected one recorded child input boundary');
  requireEvidence(roots[0].index === 0, 'Expected child input boundary at first run');
  const root = roots[0];
  
  const trigger = child.workflowData?.nodes?.find(value => value.name === root.name);
  requireEvidence(trigger, `Missing workflow node definition for child trigger ${root.name}`);
  requireEvidence(trigger?.type === 'n8n-nodes-base.executeWorkflowTrigger',
    `Child trigger ${root.name} is not Execute Workflow Trigger`);
  requireEvidence(trigger.parameters?.inputSource === 'passthrough',
    'Expected a passthrough Execute Workflow Trigger');
  requireEvidence(root.task.source.length === 0,
    'Expected a passthrough Execute Workflow Trigger with complete provenance');
  
  const reverseEdge = root.task.metadata?.parentExecution;
  requireEvidence(reverseEdge, 'Missing child parentExecution metadata');
  requireEvidence(String(reverseEdge?.executionId) === String(parent.id),
    'Child parentExecution executionId differs from this parent');
  requireEvidence(String(reverseEdge?.workflowId) === String(parent.workflowId),
    'Child parentExecution workflowId differs from this parent');

  requireEvidence(task.source?.length === 1, 'Expected a single recorded caller input edge');
  requireEvidence(task.source[0]?.previousNode, 'Missing caller input edge source');
  const source = task.source[0];
  const sourceRun = source.previousNodeRun ?? 0;
  const sourceOutput = source.previousNodeOutput ?? 0;
  const input = parentRuns[source.previousNode]?.[sourceRun]?.data?.main?.[sourceOutput];
  const start = root.task.data?.main;
  
  requireEvidence(Array.isArray(input), 'Missing caller input data at ' + pointer('data', 'resultData', 'runData', source.previousNode, sourceRun, 'data', 'main', sourceOutput));
  requireEvidence(start?.length === 1, 'Missing child trigger data main array');
  requireEvidence(Array.isArray(start[0]), 'Child trigger data main[0] is not an array');
  requireEvidence(start[0].length === input.length, 'Caller input and child trigger item counts differ');
  
  for (const [index, item] of start[0].entries()) {
    requireEvidence(jsonDeepEqual(item.json, input[index].json),
      'Child trigger does not preserve the recorded caller input JSON');
    requireEvidence(jsonDeepEqual(pairs(item.pairedItem), [{ input: 0, item: index }]),
      'Child trigger does not preserve the recorded caller input order and pairedItem');
  }

  const last = childData.resultData.lastNodeExecuted;
  requireEvidence(typeof last === 'string', 'Missing /data/resultData/lastNodeExecuted in child execution');
  const terminalRun = childRuns[last]?.length - 1;
  requireEvidence(Number.isInteger(terminalRun) && terminalRun >= 0,
    'Missing child terminal run at ' + pointer('data', 'resultData', 'runData', last));
  const returned = childRuns[last][terminalRun]?.data?.main;
  const actual = task.data?.main;
  
  requireEvidence(Array.isArray(returned), 'Missing child terminal output at ' + pointer('data', 'resultData', 'runData', last, terminalRun, 'data', 'main'));
  requireEvidence(Array.isArray(actual), 'Missing caller output at ' + pointer('data', 'resultData', 'runData', node, run, 'data', 'main'));
  requireEvidence(returned.length === actual.length,
    'Child terminal output and caller output shapes differ');
  
  const findings = [];
  
  for (const [output, items] of actual.entries()) {
    requireEvidence(Array.isArray(items), `Caller output ${output} is not an array`);
    requireEvidence(Array.isArray(returned[output]), `Child terminal output ${output} is not an array`);
    requireEvidence(items.length === returned[output].length,
      'Child terminal output and caller item counts differ at output ' + output);
    
    for (const [index, item] of items.entries()) {
      const terminal = returned[output][index];
      requireEvidence(jsonDeepEqual(item.json, terminal.json),
        'Caller output JSON differs from the recorded child terminal item at output ' + output + ', item ' + index);
      
      const pathEdges = [];
      const expected = pairs(trace(childData, terminal, index, includePaths ? {
        output,
        onStep: edge => pathEdges.push(edge)
      } : undefined));
      requireEvidence(expected.every(pair => pair.input === 0 && pair.item < input.length),
        'Child ancestry does not resolve within the recorded caller input at output ' + output + ', item ' + index);
      
      const observed = pairs(item.pairedItem);
      const finding = { 
        output, 
        item: index, 
        expected, 
        observed,
        status: jsonDeepEqual(expected, observed) ? 'consistent' : 'mismatch'
      };
      
      if (includePaths) {
        finding.parent_paired_item_path = pointer('data', 'resultData', 'runData', node, run, 'data', 'main', output, index, 'pairedItem');
        finding.parent_paired_item = item.pairedItem;
        finding.path = pathEdges;
      }
      
      findings.push(finding);
    }
  }
  
  requireEvidence(findings.length > 0, 'This child call returned no items to inspect');
  
  const mismatches = findings.filter(row => row.status === 'mismatch').length;
  const report = {
    status: mismatches ? 'mismatch' : 'consistent',
    scope: 'Recorded ancestry at one waiting, once-mode Execute Workflow 1.2 boundary',
    parent_execution: String(parent.id), 
    child_execution: String(child.id), 
    node, 
    run,
    caller_input: { node: source.previousNode, run: sourceRun, output: sourceOutput },
    checked_items: findings.length, 
    mismatches, 
    findings,
  };
  
  if (includePaths) {
    report.evidence = {
      parent_call: pointer('data', 'resultData', 'runData', node, run),
      caller_input: pointer('data', 'resultData', 'runData', source.previousNode, sourceRun, 'data', 'main', sourceOutput),
      child_root: pointer('data', 'resultData', 'runData', root.name, root.index),
      child_terminal: pointer('data', 'resultData', 'runData', last, terminalRun, 'data', 'main')
    };
  }
  
  return report;
}

module.exports = { auditBoundary };

// CLI main block - Node fs only required here, not at module top
if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('node:fs');
  let report;
  try {
    requireEvidence(process.argv.length === 4,
      'Usage: node audit-executions.cjs parent-execution.json child-execution.json');
    report = auditBoundary(...process.argv.slice(2).map(file => JSON.parse(fs.readFileSync(file, 'utf8'))));
  } catch (error) {
    report = { status: 'incomplete', reason: error.message };
  }
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = { consistent: 0, mismatch: 1, incomplete: 2 }[report.status];
}
