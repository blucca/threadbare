// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Blucca
'use strict';

// A single traversal serves the old root-only call and optional raw-edge capture.
// Addresses use the complete API execution shape (the function receives execution.data).
const pointer = (...parts) => '/' + parts.map(p => String(p).replaceAll('~', '~0').replaceAll('/', '~1')).join('/');

function findPairedItemThroughWorkflowData(workflowRunData, item, itemIndex, options) {
  const data = workflowRunData?.resultData;
  const runs = data?.runData;
  const last = data?.lastNodeExecuted;
  const runIndex = runs?.[last]?.length - 1;
  if (!Number.isInteger(runIndex) || runIndex < 0) return undefined;
  const active = new Set();
  const onStep = options?.onStep;
  function missing(path, reason) {
    // The engine overlay uses the original undefined contract. The UI needs an exact next location.
    if (onStep) throw new Error(reason + ' at ' + path);
    return undefined;
  }
  const terminalOutput = options?.output ?? -1;
  if (onStep && (!Number.isInteger(terminalOutput) || terminalOutput < 0)) {
    return missing(pointer('data', 'resultData', 'runData', last, runIndex, 'data', 'main'),
      'Evidence capture requires a terminal output index');
  }

  function visit(node, run, output, index, current) {
    const key = JSON.stringify([node, run, output, index]);
    const taskPath = pointer('data', 'resultData', 'runData', node, run);
    const itemPath = taskPath + '/data/main/' + output + '/' + index;
    if (active.has(key)) return missing(itemPath, 'Cyclic recorded ancestry');
    const task = runs[node]?.[run];
    if (!task) return missing(taskPath, 'Missing saved node run');
    if (current?.pairedItem === undefined) return missing(itemPath + '/pairedItem', 'Missing pairedItem provenance');
    const entries = Array.isArray(current.pairedItem) ? current.pairedItem : [current.pairedItem];
    if (!entries.length) return missing(itemPath + '/pairedItem', 'Empty pairedItem provenance');
    const roots = new Map();
    active.add(key);
    try {
      for (const [pairIndex, entry] of entries.entries()) {
        const pairPath = itemPath + '/pairedItem' + (Array.isArray(current.pairedItem) ? '/' + pairIndex : '');
        const pair = typeof entry === 'number' ? { item: entry } : entry;
        if (!pair || !Number.isInteger(pair.item) || pair.item < 0) return missing(pairPath, 'Invalid pairedItem index');
        const inlet = pair.input ?? 0;
        if (!Number.isInteger(inlet) || inlet < 0) return missing(pairPath, 'Invalid pairedItem input');
        const from = { node, run, output, item: index };
        if (!task.source?.length && !pair.sourceOverwrite) {
          if (onStep) {
            if (!Array.isArray(task.source)) return missing(taskPath + '/source', 'Missing recorded input boundary');
            onStep({ from, boundary: { input: inlet, item: pair.item },
              paired_item_path: pairPath, paired_item: entry,
              source_path: taskPath + '/source', source: task.source });
          }
          roots.set(pair.item, { item: pair.item });
          continue;
        }
        const sourcePath = pair.sourceOverwrite ? pairPath + '/sourceOverwrite' : taskPath + '/source/' + inlet;
        const source = pair.sourceOverwrite ?? task.source?.[inlet];
        if (!source?.previousNode) return missing(sourcePath, 'Missing selected recorded source');
        const previousRun = source.previousNodeRun ?? 0;
        const previousOutput = source.previousNodeOutput ?? 0;
        if (![previousRun, previousOutput].every(value => Number.isInteger(value) && value >= 0)) {
          return missing(sourcePath, 'Invalid producer run/output');
        }
        const previousPath = pointer('data', 'resultData', 'runData', source.previousNode, previousRun, 'data', 'main', previousOutput, pair.item);
        const previous = runs[source.previousNode]?.[previousRun]?.data?.main?.[previousOutput]?.[pair.item];
        if (!previous) return missing(previousPath, 'Missing upstream item');
        if (onStep) onStep({ from,
          to: { node: source.previousNode, run: previousRun, output: previousOutput, item: pair.item },
          paired_item_path: pairPath, paired_item: entry, source_path: sourcePath, source });
        const found = visit(source.previousNode, previousRun, previousOutput, pair.item, previous);
        if (!found) return undefined;
        for (const root of found) roots.set(root.item, root);
      }
      return [...roots.values()];
    } finally {
      active.delete(key);
    }
  }

  const roots = visit(last, runIndex, terminalOutput, itemIndex, item);
  return roots?.length === 1 ? roots[0] : roots;
}

module.exports = { findPairedItemThroughWorkflowData, pointer };
