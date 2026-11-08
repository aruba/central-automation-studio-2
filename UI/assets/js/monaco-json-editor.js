/*
Central Automation v2.x
Monaco-based JSON editor. Wraps a textarea with a Monaco editor while keeping
the textarea's `.value` property working, so existing get/set code needs no changes.
Aaron Scott (WiFi Downunder) 2025-2026
*/

var monacoReadyPromise;
var monacoEditorInstances = {};

// Resolve the vendored Monaco path relative to this script's own location, since
// pages that include it live at different folder depths (deployment/, monitoring/, etc.).
var monacoScriptDir = (function() {
	var current = document.currentScript;
	return current.src.substring(0, current.src.lastIndexOf('/'));
})();
var monacoVsPath = monacoScriptDir + '/plugins/monaco-editor/vs';

// Loads Monaco's AMD loader dynamically (not as a static <script> tag) so it only
// defines the global `define`/`require` after other UMD scripts (e.g. papaparse,
// which registers itself as an AMD module if it sees a global `define`) have
// already parsed and run. Loading it statically causes
// "Can only have one anonymous define call per script file" errors.
function loadMonacoEditor() {
	if (monacoReadyPromise) return monacoReadyPromise;
	monacoReadyPromise = new Promise(function(resolve) {
		let script = document.createElement('script');
		script.src = monacoVsPath + '/loader.js';
		script.onload = function() {
			require.config({ paths: { 'vs': monacoVsPath } });
			require(['vs/editor/editor.main'], function() { resolve(); });
		};
		document.head.appendChild(script);
	});
	return monacoReadyPromise;
}

// Mounts a Monaco JSON editor next to the given textarea, hides the textarea, and
// proxies its `.value` property to the editor so existing callers are unaffected.
function initMonacoJSONEditor(textareaId) {
	if (monacoEditorInstances[textareaId]) return Promise.resolve(monacoEditorInstances[textareaId]);

	let textarea = document.getElementById(textareaId);
	if (!textarea) return Promise.reject(new Error('No textarea found for id: ' + textareaId));

	let container = document.createElement('div');
	container.id = textareaId + '-monaco';
	container.className = 'monaco-json-editor';
	textarea.insertAdjacentElement('afterend', container);
	textarea.style.display = 'none';

	return loadMonacoEditor().then(function() {
		let editor = monaco.editor.create(container, {
			value: textarea.value,
			language: 'json',
			automaticLayout: true,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			tabSize: 2,
		});

		// Keep `.value` working so unmodified code can still read/write the config.
		Object.defineProperty(textarea, 'value', {
			get: function() { return editor.getValue(); },
			set: function(newValue) { editor.setValue(newValue || ''); },
			configurable: true,
		});

		monacoEditorInstances[textareaId] = editor;
		return editor;
	});
}

// Monaco renders incorrectly if laid out while its container is hidden (e.g. inside
// a closed Bootstrap modal). Call this after the container becomes visible.
function layoutMonacoJSONEditor(textareaId) {
	let editor = monacoEditorInstances[textareaId];
	if (editor) editor.layout();
}

// Collapses all foldable regions at the given nesting level (default: 2, since level 1
// is the document's root object/array and level 2 is its top-level keys), so large JSON
// documents open in a scannable, collapsed state. Monaco only creates its folding
// controller after the editor's first real render, and computes folding ranges
// asynchronously after that, so this waits a couple of animation frames (to get past a
// hidden-modal render) plus a short delay before folding.
function foldMonacoJSONEditor(textareaId, level) {
	let editor = monacoEditorInstances[textareaId];
	if (!editor) return;
	requestAnimationFrame(function() {
		requestAnimationFrame(function() {
			setTimeout(function() {
				let action = editor.getAction('editor.foldLevel' + (level || 2));
				if (action) action.run();
			}, 50);
		});
	});
}

// Returns false if Monaco's JSON language service has flagged any syntax errors
// (e.g. trailing commas, unquoted keys) in the given editor's current content.
function isMonacoJSONValid(textareaId) {
	let editor = monacoEditorInstances[textareaId];
	if (!editor) return true;
	let markers = monaco.editor.getModelMarkers({ resource: editor.getModel().uri });
	return !markers.some(function(marker) { return marker.severity === monaco.MarkerSeverity.Error; });
}
