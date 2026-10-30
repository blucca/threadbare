# UI hooks (main thread owns src/app.js)

Main JavaScript will update these hooks; frontend owns index.html/style.css only.

- `#case-title`, `#case-subtitle`: demo/custom title and explanation.
- `#overall-status`, `#status-detail`, `#case-provenance`: report state, item counts and provenance.
- `#mode-original`, `#mode-repaired`: buttons for real demo pairs; `#trace-item`: opens selected finding's evidence.
- `#switchboard`: responsive main stage. Main JS renders dynamic SVG with expected/observed curves and a legend, then left/right HTML buttons/items. The main render gives `.board-inputs`, `.board-returns`, `.pin-input`, `.pin-return`, `.selected`, `.is-mismatch`, `.board-wires` classes. Board desktop row positions use a 720x300 SVG viewBox, inputs x=70/y=54+64*i, returns x=650/y=86+128*i. Stage should preserve that aspect ratio and visible labels, with keyboard accessible return buttons.
- `#selection-summary`, `#evidence-panel`, `#evidence-steps`: exact selected mismatch summary and raw-step accordions. `#evidence-panel` is initially hidden.
- `#http-observations`: demo-only separate recorded HTTP observations; hidden for custom data.
- `#download-report`: local download; `#open-import`, `#close-import`: show/close the import dialog.
- `#import-dialog` native `<dialog>`; `#parent-file`, `#child-file` file inputs (accept JSON); `#import-drop` drag/drop region for one or two files; `#import-status`, `#child-help`, `#import-audit` for action/status; `#return-demo` button.
- `#scope-note`: footer contract. A normal link to GitHub source (https://github.com/blucca/threadbare) and a mailto repair link (mailto:belgialucca@gmail.com?subject=n8n%20repair%20scope) may be present, copied from the existing public n8n-check work order.

UI language is sentence case. Status names mismatch / consistent / incomplete are source states; explain them in human language. The main SVG wires have classes `.wire-observed`, `.wire-expected`, `.is-selected`, and `.is-consistent`. Use magenta solid for the parent recorded wrong origin, copper dashed for the child-resolved expected origin; both become clearly labeled consistent in repaired mode. Hover is restrained; animate only action-triggered changes with reduced-motion support.
