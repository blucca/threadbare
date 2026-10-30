import core from '../vendor/audit-executions.cjs';

const { auditBoundary } = core;
const $ = id => document.getElementById(id);
const make = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const state = { mode: 'original', parent: null, child: null, report: null, selected: 0, demo: true };
const imports = { parent: null, child: null };
let recordings;
let httpRecord;

// Complete API execution JSON only. These paths also power the acquisition help.
function calls(execution) {
  const runs = execution?.data?.resultData?.runData;
  if (!runs) throw new Error('Missing /data/resultData/runData. Download the full execution response with includeData=true.');
  const edges = [];
  for (const [node, entries] of Object.entries(runs)) {
    if (!Array.isArray(entries)) throw new Error('Invalid /data/resultData/runData/' + node + ': expected saved run entries.');
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
    state.report = { status: 'incomplete', reason: error.message };
  }
  $('evidence-panel').hidden = true;
  render();
}

function inputItems() {
  const source = state.report.caller_input;
  return source ? state.parent.data.resultData.runData[source.node][source.run].data.main[source.output] : [];
}
function inputName(item) {
  if (state.demo) {
    const id = inputItems()[item]?.json?.order?.id;
    if (id) return String(id).replace(/^customer-/, 'Customer ');
  }
  return 'Input item ' + item;
}
function originName(pair) {
  return pair.input === 0 && pair.item < inputItems().length
    ? inputName(pair.item) : 'Input ' + pair.input + ', item ' + pair.item;
}
function selectedFinding() { return state.report?.findings?.[state.selected]; }

function selectItem(index, reveal = true) {
  state.selected = index;
  renderBoard();
  renderSelection();
  if (reveal) {
    $('evidence-panel').hidden = false;
    renderEvidence();
  }
}

function render() {
  const report = state.report;
  const status = report.status;
  $('scope-note').textContent = 'Recorded ancestry at a successful, waiting once-mode Execute Workflow 1.2 call with a passthrough child trigger. Complete matching parent and child API responses. Imports and reports stay in your browser.';
  $('overall-status').textContent = status === 'mismatch' ? 'Crossed lines' : status === 'consistent' ? 'Lines agree' : 'Missing evidence';
  $('overall-status').dataset.state = status;
  $('status-detail').textContent = status === 'incomplete' ? report.reason
    : report.mismatches + ' mismatches across ' + report.checked_items + ' returned items';
  $('return-demo').hidden = state.demo;
  $('case-provenance').textContent = state.demo
    ? 'Synthetic customers · recorded n8n 2.41.7'
    : 'Your saved executions · local analysis';
  if (state.demo && status !== 'incomplete') {
    $('case-title').textContent = state.mode === 'original'
      ? 'Customer D’s order went to A.' : 'The records agree again.';
    $('case-subtitle').textContent = state.mode === 'original'
      ? 'Both recorded workflows succeeded. All 11 business-node JSON snapshots matched. The saved pairing tells a different story.'
      : 'Both recorded workflows succeeded. The business-node JSON is unchanged. The parent now records the same inputs as the child.';
  } else {
    $('case-title').textContent = status === 'mismatch' ? report.mismatches + ' recorded pairings diverge.'
      : status === 'consistent' ? 'These recorded links agree.' : 'The evidence is missing a piece.';
    $('case-subtitle').textContent = status === 'incomplete' ? 'Add the complete matching execution response to finish this boundary check.'
      : 'Parent ' + report.parent_execution + ' and child ' + report.child_execution + ' both succeeded. This desk checks their recorded item handoff.';
  }
  for (const mode of ['original', 'repaired']) {
    $('mode-' + mode).setAttribute('aria-pressed', String(state.demo && state.mode === mode));
  }
  $('download-report').disabled = status === 'incomplete';
  $('trace-item').disabled = status === 'incomplete';
  renderBoard();
  renderSelection();
  renderHttp();
}

function renderBoard() {
  const stage = $('switchboard');
  stage.replaceChildren();
  const report = state.report;
  if (report.status === 'incomplete') {
    stage.classList.add('is-incomplete');
    const ghost = make('div', undefined, 'ghost-plug');
    ghost.append(make('span', '○', 'ghost-socket'), make('p', 'An open socket needs its saved source.'), make('p', report.reason, 'missing-path'));
    stage.append(ghost);
    return;
  }
  stage.classList.remove('is-incomplete');
  const inputs = inputItems();
  const findings = report.findings;
  const height = Math.max(300, 64 * Math.max(inputs.length, findings.length) + 44);
  stage.style.aspectRatio = '940 / ' + height;
  // Longer imported calls get a taller board. The core supports one call; the UI shows its full item set.
  if (height > 300) stage.style.minHeight = height + 'px';
  else stage.style.minHeight = '';
  const inputY = i => 54 + 64 * i;
  const returnY = i => findings.length === 1 ? height / 2 : 86 + (height - 172) * i / (findings.length - 1);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 720 ' + height);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('board-wires');
  const left = make('div', undefined, 'board-inputs');
  const right = make('div', undefined, 'board-returns');

  inputs.forEach((item, i) => {
    const pin = make('div', undefined, 'pin-input');
    pin.style.top = (100 * inputY(i) / height) + '%';
    pin.append(make('span', inputName(i), 'pin-label'), make('span', report.caller_input.node + ' / item ' + i, 'pin-address'), make('span', undefined, 'socket'));
    pin.lastChild.setAttribute('aria-hidden', 'true');
    left.append(pin);
  });
  findings.forEach((finding, i) => {
    const pin = make('button', undefined, 'pin-return' + (i === state.selected ? ' selected' : '') + (finding.status === 'mismatch' ? ' is-mismatch' : ''));
    pin.type = 'button';
    pin.style.top = (100 * returnY(i) / height) + '%';
    pin.setAttribute('aria-pressed', String(i === state.selected));
    pin.setAttribute('aria-label', 'Trace output ' + finding.output + ', returned item ' + finding.item + ', ' + finding.status);
    pin.append(make('span', undefined, 'socket'), make('span', 'Item ' + finding.item, 'pin-label'), make('span', 'Output ' + finding.output + ' / ' + finding.status, 'pin-address'));
    pin.firstChild.setAttribute('aria-hidden', 'true');
    pin.onclick = () => selectItem(i);
    right.append(pin);
    for (const role of ['observed', 'expected']) {
      for (const pair of finding[role]) {
        if (pair.input !== 0 || !inputs[pair.item]) continue;
        const wire = document.createElementNS(ns, 'path');
        const start = inputY(pair.item), end = returnY(i);
        const bend = role === 'expected' ? 18 : -18;
        wire.setAttribute('d', 'M70 ' + start + ' C270 ' + (start + bend) + ' 440 ' + (end - bend) + ' 650 ' + end);
        wire.setAttribute('fill', 'none');
        wire.classList.add('wire-' + role);
        if (i === state.selected) wire.classList.add('is-selected');
        if (finding.status === 'consistent') wire.classList.add('is-consistent');
        wire.onclick = () => selectItem(i);
        svg.append(wire);
      }
    }
  });
  stage.append(svg, left, right);
  const legend = make('div', undefined, 'board-legend');
  for (const [role, label] of [['observed', 'Parent recorded'], ['expected', 'Child resolves']]) {
    const item = make('span');
    item.append(make('span', undefined, 'legend-line ' + role), document.createTextNode(label));
    legend.append(item);
  }
  stage.append(legend);
}

function renderSelection() {
  const target = $('selection-summary');
  target.replaceChildren();
  const finding = selectedFinding();
  if (!finding) {
    target.append(make('p', state.report.reason || 'Load both saved execution responses.'));
    return;
  }
  const p = make('p');
  p.append(make('strong', 'Child resolves to ' + finding.expected.map(originName).join(' + ')), document.createTextNode('. Parent records ' + finding.observed.map(originName).join(' + ') + '.'));
  target.append(p, make('p', 'Returned output ' + finding.output + ', item ' + finding.item + ' · ' + state.report.node + ', run ' + state.report.run, 'selection-address'));
}

function renderEvidence() {
  const target = $('evidence-steps');
  target.replaceChildren();
  const finding = selectedFinding();
  if (!finding?.path?.length) {
    target.append(make('p', 'This report has no captured traversal edges. Load a complete saved response and rerun the check.'));
    return;
  }
  const recorded = make('div', undefined, 'parent-evidence');
  recorded.append(make('h3', 'What the parent recorded'),
    make('p', 'Parent execution ' + state.report.parent_execution + ' pairs this returned item with the input below.'),
    make('code', finding.parent_paired_item_path, 'raw-path'),
    make('pre', JSON.stringify(finding.parent_paired_item, null, 2)));
  target.append(recorded);
  const relation = make('p', 'From the child’s actual terminal item to its recorded input boundary. Each address below resolves in your child execution JSON.', 'evidence-intro');
  target.append(relation);
  finding.path.forEach((step, index) => {
    const details = make('details', undefined, 'evidence-step');
    details.open = index === 0;
    const from = step.from;
    const summary = make('summary');
    summary.append(make('span', String(index + 1), 'step-index'), make('span', from.node, 'step-node'), make('span', 'run ' + from.run + ' / output ' + from.output + ' / item ' + from.item, 'step-coordinate'));
    details.append(summary);
    const body = make('div', undefined, 'raw-evidence');
    body.append(make('p', 'Recorded paired item'), make('code', step.paired_item_path, 'raw-path'), make('pre', JSON.stringify(step.paired_item, null, 2)));
    if (step.source_path) {
      body.append(make('p', step.boundary ? 'Recorded input boundary (no upstream source)' : 'Selected recorded source'),
        make('code', step.source_path, 'raw-path'), make('pre', JSON.stringify(step.source, null, 2)));
    }
    if (step.to) {
      body.append(make('p', 'Continue to ' + step.to.node + ', run ' + step.to.run + ', output ' + step.to.output + ', item ' + step.to.item));
    } else if (step.boundary) {
      body.append(make('p', 'This child input corresponds to caller input item ' + step.boundary.item + '.'));
    }
    details.append(body);
    target.append(details);
  });
  if (state.report.evidence) {
    const context = make('details', undefined, 'evidence-step');
    context.append(make('summary', 'The matching parent–child call'));
    const body = make('div', undefined, 'raw-evidence');
    for (const [key, value] of Object.entries(state.report.evidence)) {
      body.append(make('p', key.replaceAll('_', ' ')), make('code', typeof value === 'string' ? value : JSON.stringify(value), 'raw-path'));
    }
    context.append(body);
    target.append(context);
  }
}

function renderHttp() {
  const target = $('http-observations');
  target.hidden = !state.demo || state.report.status === 'incomplete';
  target.replaceChildren();
  if (target.hidden) return;
  const observations = httpRecord[state.mode];
  target.append(make('h2', 'Separately recorded HTTP delivery'), make('p', 'Synthetic native run, n8n 2.41.7. This is the recorded request log, separate from the ancestry check.'));
  const list = make('div', undefined, 'http-rows');
  observations.requests.forEach((request, i) => {
    const row = make('p', undefined, 'http-row');
    row.append(make('span', 'Slot ' + request.slot), make('span', 'Expected ' + observations.expected_recipients[i].replace('customer-', 'Customer ')),
      make('strong', 'Sent to ' + request.recipient.replace('customer-', 'Customer ')));
    list.append(row);
  });
  target.append(list, make('p', 'Original and repaired business-node JSON snapshots are identical. These saved records include the changed pairing metadata.', 'http-note'));
}

function showImport() {
  const dialog = $('import-dialog');
  if (!dialog.open) dialog.showModal();
  updateImportHelp();
}
function executionCommand(id, filename) {
  return 'curl -H "X-N8N-API-KEY: $N8N_API_KEY" \\\n  "$N8N_URL/api/v1/executions/' + id + '?includeData=true" > ' + filename;
}
function updateImportHelp() {
  const target = $('child-help');
  target.hidden = false;
  target.replaceChildren();
  const parent = imports.parent;
  if (parent) {
    let edges;
    try { edges = calls(parent); } catch (error) {
      target.append(make('p', error.message));
      $('import-audit').disabled = true;
      return;
    }
    if (!edges.length) {
      target.append(make('p', 'No /data/resultData/runData/<caller>/<run>/metadata/subExecution/executionId is saved in this response. Add the parent execution that recorded the waited child call.'));
    } else {
      target.append(make('p', 'This parent recorded ' + edges.length + ' child call' + (edges.length === 1 ? '' : 's') + '. Download the matching full child response:'));
      for (const edge of edges) {
        target.append(make('p', edge.node + ', run ' + edge.run + ' → child execution ' + edge.id), make('pre', executionCommand(encodeURIComponent(edge.id), 'child.json'), 'download-command'));
      }
    }
  } else if (imports.child) {
    const id = reverseParent(imports.child);
    target.append(make('p', id ? 'This child recorded parent execution ' + id + '. Add that full parent response:' : 'Add the matching full parent response.'));
    if (id) target.append(make('pre', executionCommand(encodeURIComponent(id), 'parent.json'), 'download-command'));
  } else {
    target.append(make('p', 'Start with the parent’s full API execution response. Its saved call metadata gives the real child execution ID. Set N8N_URL and N8N_API_KEY in your own shell; this page collects neither.'));
    target.append(make('pre', executionCommand('<parent-id>', 'parent.json'), 'download-command'));
  }
  $('import-audit').disabled = !(imports.parent && imports.child);
}

async function readFile(file) {
  try {
    const value = JSON.parse(await file.text());
    if (!value?.id || !value?.data?.resultData?.runData) {
      throw new Error('Missing /id or /data/resultData/runData. This looks like a workflow definition or partial response. Use GET /api/v1/executions/<id>?includeData=true.');
    }
    return value;
  } catch (error) {
    throw new Error(file.name + ': ' + error.message);
  }
}
async function receiveFiles(files, slot) {
  // Replacing a file invalidates that slot while File.text() is still reading.
  if (slot) imports[slot] = null;
  $('import-audit').disabled = true;
  $('import-status').textContent = 'Reading the selected execution files…';
  try {
    if (!files.length || files.length > 2) throw new Error('Choose one parent response and one child response.');
    const values = await Promise.all([...files].map(readFile));
    if (slot) imports[slot] = values[0];
    else if (values.length === 2) {
      const [a, b] = values;
      if (calls(a).some(call => call.id === String(b.id))) Object.assign(imports, { parent: a, child: b });
      else if (calls(b).some(call => call.id === String(a.id))) Object.assign(imports, { parent: b, child: a });
      else throw new Error('These execution IDs have no matching recorded parent call edge. Add the child ID from the parent metadata.');
    } else {
      const value = values[0];
      if (reverseParent(value)) imports.child = value;
      else imports.parent = value;
    }
    $('import-status').textContent = 'Loaded ' + (imports.parent ? 'parent ' + imports.parent.id : 'no parent yet') + ' and ' + (imports.child ? 'child ' + imports.child.id : 'no child yet') + '. Files remain local.';
    $('import-status').dataset.state = 'ready';
    updateImportHelp();
  } catch (error) {
    // A failed replacement must not leave an older file eligible for this audit.
    if (slot) imports[slot] = null;
    else Object.assign(imports, { parent: null, child: null });
    updateImportHelp();
    $('import-status').textContent = error.message;
    $('import-status').dataset.state = 'error';
  }
}

$('open-import').onclick = showImport;
$('close-import').onclick = () => $('import-dialog').close();
$('parent-file').onchange = event => receiveFiles(event.target.files, 'parent');
$('child-file').onchange = event => receiveFiles(event.target.files, 'child');
$('import-drop').ondragover = event => { event.preventDefault(); event.currentTarget.classList.add('is-dragging'); };
$('import-drop').ondragleave = event => event.currentTarget.classList.remove('is-dragging');
$('import-drop').ondrop = event => {
  event.preventDefault();
  event.currentTarget.classList.remove('is-dragging');
  receiveFiles(event.dataTransfer.files);
};
$('import-audit').onclick = () => {
  if (!(imports.parent && imports.child)) return;
  audit(imports.parent, imports.child, false);
  if (state.report.status === 'incomplete') {
    $('import-status').textContent = state.report.reason;
    $('import-status').dataset.state = 'error';
  }
  else $('import-dialog').close();
};
$('return-demo').onclick = () => {
  Object.assign(imports, { parent: null, child: null });
  $('parent-file').value = '';
  $('child-file').value = '';
  $('import-status').textContent = 'Choose a parent execution to begin.';
  $('import-status').dataset.state = '';
  $('import-dialog').close();
  loadMode('original');
};
function loadMode(mode) {
  state.mode = mode;
  audit(recordings[mode].parent, recordings[mode].child, true);
}
for (const mode of ['original', 'repaired']) $('mode-' + mode).onclick = () => loadMode(mode);
$('trace-item').onclick = () => {
  $('evidence-panel').hidden = false;
  renderEvidence();
  $('evidence-panel').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
};
$('download-report').onclick = () => {
  if (!state.report || state.report.status === 'incomplete') return;
  const blob = new Blob([JSON.stringify({ tool: 'Threadbare', ...state.report }, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = make('a');
  link.href = url;
  link.download = 'threadbare-ancestry-report.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

try {
  const names = ['original-parent', 'original-child', 'repaired-parent', 'repaired-child', 'recorded-http'];
  const values = await Promise.all(names.map(async name => {
    const response = await fetch('./samples/' + name + '.json');
    if (!response.ok) throw new Error('Saved sample response ' + name + ' is unavailable (HTTP ' + response.status + ').');
    return response.json();
  }));
  recordings = { original: { parent: values[0], child: values[1] }, repaired: { parent: values[2], child: values[3] } };
  httpRecord = values[4];
  loadMode('original');
} catch (error) {
  state.report = { status: 'incomplete', reason: error.message };
  render();
}
