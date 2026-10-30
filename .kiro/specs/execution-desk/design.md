# Design

Static HTML/CSS + bundled browser JavaScript. The vendored MIT auditor is the common deterministic core; extend its shared traversal with optional evidence capture and add JSON-compatible browser equality. Keep Node CLI working. A report finding has expected/observed input-item sets and optional ordered provenance edges. An edge records from/to coordinates, original pairedItem value/pointer, and original source value/pointer or an explicit input-boundary marker. The auditor supplies parent caller/caller-input/child-root paths when evidence is requested.

Use JSON Pointer (RFC 6901) with node-name escaping. Failure paths must refer to the original execution shape. Tests resolve every captured edge pointer against the actual original files. No rereading workflow graph connections to manufacture a path.

UI: nocturnal telephone dispatch board. Indigo #20233F, bakelite #4A3540, copper #B47B57, paper blue-gray #DDE3E9, crossed-line magenta #DB507F. Barlow Condensed titles, Atkinson Hyperlegible body; mono for raw execution addresses only. The switchboard is the single bold element; evidence expands after selecting an item. See docs/ui-contract.md for hooks. Reports and imports run locally; no server component.
