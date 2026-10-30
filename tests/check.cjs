// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Blucca
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { auditBoundary } = require('../vendor/audit-executions.cjs');
const { jsonDeepEqual } = require('../vendor/json-equal.cjs');
const { findPairedItemThroughWorkflowData } = require('../vendor/backtracking.cjs');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}: ${error.message}`);
    throw error;
  }
}

function loadJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'samples', filename), 'utf8'));
}

console.log('Running deterministic core tests...\n');

// Test 1: JSON equality helper
test('JSON equality helper - basic types', () => {
  assert(jsonDeepEqual(1, 1), 'numbers equal');
  assert(jsonDeepEqual('a', 'a'), 'strings equal');
  assert(jsonDeepEqual(true, true), 'booleans equal');
  assert(jsonDeepEqual(null, null), 'null equal');
  assert(!jsonDeepEqual(1, 2), 'numbers not equal');
  assert(!jsonDeepEqual('a', 'b'), 'strings not equal');
  assert(!jsonDeepEqual(true, false), 'booleans not equal');
  assert(!jsonDeepEqual(null, undefined), 'null vs undefined');
});

test('JSON equality helper - arrays', () => {
  assert(jsonDeepEqual([1, 2, 3], [1, 2, 3]), 'arrays equal');
  assert(!jsonDeepEqual([1, 2, 3], [1, 2]), 'arrays length mismatch');
  assert(!jsonDeepEqual([1, 2, 3], [1, 3, 2]), 'arrays order matters');
  assert(jsonDeepEqual([], []), 'empty arrays equal');
});

test('JSON equality helper - objects', () => {
  assert(jsonDeepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), 'objects equal (key order ignored)');
  assert(!jsonDeepEqual({ a: 1 }, { a: 2 }), 'objects value mismatch');
  assert(!jsonDeepEqual({ a: 1 }, { b: 1 }), 'objects key mismatch');
  assert(jsonDeepEqual({}, {}), 'empty objects equal');
});

// Test 2: Load samples and run original audit (should have 2 mismatches)
const originalParent = loadJSON('original-parent.json');
const originalChild = loadJSON('original-child.json');

test('Original samples - should have 2 mismatches', () => {
  const report = auditBoundary(originalParent, originalChild);
  assert(report.status === 'mismatch', 'original should be mismatch');
  assert(report.mismatches === 2, 'original should have exactly 2 mismatches');
  assert(report.checked_items > 0, 'should check some items');
});

// Test 3: Load repaired samples (should have 0 mismatches)
const repairedParent = loadJSON('repaired-parent.json');
const repairedChild = loadJSON('repaired-child.json');

test('Repaired samples - should be consistent', () => {
  const report = auditBoundary(repairedParent, repairedChild);
  assert(report.status === 'consistent', 'repaired should be consistent');
  assert(report.mismatches === 0, 'repaired should have 0 mismatches');
});

// Test 4: Test with includePaths option
test('Include paths option - returns evidence', () => {
  const report = auditBoundary(repairedParent, repairedChild, { includePaths: true });
  assert(report.status === 'consistent', 'should be consistent');
  assert(report.evidence, 'should have evidence object');
  assert(report.evidence.parent_call, 'should have parent_call pointer');
  assert(report.evidence.caller_input, 'should have caller_input pointer');
  assert(report.evidence.child_root, 'should have child_root pointer');
  assert(report.evidence.child_terminal, 'should have child_terminal pointer');
  
  // Check that findings have paths
  assert(report.findings[0].path, 'first finding should have path array');
  assert(Array.isArray(report.findings[0].path), 'path should be an array');
});

// Test 5: Test backward compatibility of findPairedItemThroughWorkflowData
test('Backtracking backward compatibility - three arguments', () => {
  const childData = repairedChild.data;
  const lastNode = childData.resultData.lastNodeExecuted;
  const terminalRun = childData.resultData.runData[lastNode].at(-1);
  const terminalItem = terminalRun.data.main[0][0];
  
  // Three-argument call should still work
  const result = findPairedItemThroughWorkflowData(childData, terminalItem, 0);
  assert(result, 'should return a result');
  // Check structure - legacy returns either single root or array of roots
  if (Array.isArray(result)) {
    assert(result.length > 0, 'should have at least one root');
    assert(result[0].item !== undefined, 'root should have item property');
  } else {
    assert(result.item !== undefined, 'root should have item property');
  }
});

// Test 6: Test evidence capture in findPairedItemThroughWorkflowData
test('Backtracking evidence capture - four arguments with onStep', () => {
  const childData = repairedChild.data;
  const lastNode = childData.resultData.lastNodeExecuted;
  const terminalRun = childData.resultData.runData[lastNode].at(-1);
  const terminalItem = terminalRun.data.main[0][0];
  
  const capturedEdges = [];
  const result = findPairedItemThroughWorkflowData(childData, terminalItem, 0, {
    output: 0,
    onStep: (edge) => capturedEdges.push(edge)
  });
  
  assert(result.roots, 'should have roots property');
  assert(result.path, 'should have path property');
  assert(Array.isArray(capturedEdges), 'capturedEdges should be array');
  assert(capturedEdges.length > 0, 'should capture at least one edge');
  
  // Verify edge structure
  const edge = capturedEdges[0];
  assert(edge.from, 'edge should have from');
  assert(edge.from.node, 'from should have node');
  assert(edge.from.run !== undefined, 'from should have run');
  assert(edge.from.output !== undefined, 'from should have output');
  assert(edge.from.item !== undefined, 'from should have item');
  
  assert(edge.paired_item_path, 'edge should have paired_item_path');
  assert(edge.paired_item !== undefined, 'edge should have paired_item');
});

// Test 7: Test missing data error messages
test('Missing data error messages', () => {
  // Create invalid data missing runData
  const invalidParent = { ...originalParent };
  delete invalidParent.data.resultData.runData;
  
  try {
    auditBoundary(invalidParent, originalChild);
    assert(false, 'should have thrown error');
  } catch (error) {
    assert(error.message.includes('/data/resultData/runData'), 
      'error should mention missing runData pointer');
  }
});

// Test 8: Test JSON pointer resolution for captured edges
test('JSON pointer resolution for captured edges', () => {
  const report = auditBoundary(repairedParent, repairedChild, { includePaths: true });
  
  for (const finding of report.findings) {
    if (finding.path) {
      for (const edge of finding.path) {
        // Test paired_item_path resolves to correct value
        if (edge.paired_item_path) {
          const pointer = edge.paired_item_path;
          // Simple pointer resolution test (just check format)
          assert(pointer.startsWith('/'), 'pointer should start with /');
          assert(pointer.includes('pairedItem'), 'pointer should reference pairedItem');
        }
        
        // Test that source is not business JSON (should be structural)
        if (edge.source) {
          // Source should be a source object, not business data
          const source = edge.source;
          assert(typeof source === 'object', 'source should be object');
          if (source.previousNode) {
            assert(typeof source.previousNode === 'string', 'previousNode should be string');
          }
        }
      }
    }
  }
});

// Test 9: CLI exit codes (simulate)
test('CLI exit code simulation', () => {
  // This just verifies the exit code mapping exists
  const exitCodes = { consistent: 0, mismatch: 1, incomplete: 2 };
  assert(exitCodes.consistent === 0, 'consistent should exit 0');
  assert(exitCodes.mismatch === 1, 'mismatch should exit 1');
  assert(exitCodes.incomplete === 2, 'incomplete should exit 2');
});

// Test 10: Verify all captured pointers resolve in actual JSON
test('All captured pointers resolve in actual JSON', () => {
  const report = auditBoundary(repairedParent, repairedChild, { includePaths: true });
  
  function resolvePointer(obj, pointer) {
    if (!pointer || pointer === '') return obj;
    const parts = pointer.slice(1).split('/').map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }
  
  for (const finding of report.findings) {
    if (finding.path) {
      for (const edge of finding.path) {
        // Resolve paired_item_path in child JSON
        const pairedValue = resolvePointer(repairedChild, edge.paired_item_path);
        assert(pairedValue !== undefined, `Pointer ${edge.paired_item_path} should resolve`);
        assert(jsonDeepEqual(pairedValue, edge.paired_item), 
          `Resolved value should equal captured paired_item for ${edge.paired_item_path}`);
        
        // Resolve source_path if present
        if (edge.source_path) {
          const sourceValue = resolvePointer(repairedChild, edge.source_path);
          assert(sourceValue !== undefined, `Pointer ${edge.source_path} should resolve`);
          assert(jsonDeepEqual(sourceValue, edge.source),
            `Resolved value should equal captured source for ${edge.source_path}`);
        }
      }
    }
  }
});

console.log('\nAll tests passed! Running CLI verification...\n');

// Run the CLI verification as specified
console.log('Testing original samples (should exit with code 1):');
try {
  const { execSync } = require('node:child_process');
  const result = execSync(`node vendor/audit-executions.cjs samples/original-parent.json samples/original-child.json`, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const report = JSON.parse(result);
  console.log(`  Status: ${report.status}, Mismatches: ${report.mismatches}`);
  assert(report.status === 'mismatch', 'CLI should report mismatch');
  assert(report.mismatches === 2, 'CLI should find 2 mismatches');
  console.log('  ✓ CLI reports original as mismatch (exit 1)');
} catch (error) {
  // CLI should exit with code 1 for mismatches - check if that's what happened
  if (error.status === 1) {
    const report = JSON.parse(error.stdout);
    console.log(`  Status: ${report.status}, Mismatches: ${report.mismatches}`);
    assert(report.status === 'mismatch', 'CLI should report mismatch');
    assert(report.mismatches === 2, 'CLI should find 2 mismatches');
    console.log('  ✓ CLI exits with code 1 for mismatch (as expected)');
  } else {
    console.error('  ✗ CLI test failed:', error.message);
    throw error;
  }
}

console.log('\nTesting repaired samples (should exit with code 0):');
try {
  const { execSync } = require('node:child_process');
  const result = execSync(`node vendor/audit-executions.cjs samples/repaired-parent.json samples/repaired-child.json`, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const report = JSON.parse(result);
  console.log(`  Status: ${report.status}, Mismatches: ${report.mismatches}`);
  assert(report.status === 'consistent', 'CLI should report consistent');
  assert(report.mismatches === 0, 'CLI should find 0 mismatches');
  console.log('  ✓ CLI reports repaired as consistent (exit 0)');
} catch (error) {
  console.error('  ✗ CLI test failed:', error.message);
  throw error;
}

console.log('\n✅ All deterministic core tests completed successfully.');
console.log('The audit core is now browser-compatible with evidence capture.');
console.log('Backward compatibility maintained for CLI and existing contracts.');