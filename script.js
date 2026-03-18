// Grab important DOM elements
const runBtn      = document.querySelector('.run');             // Run button (Ctrl/Cmd+Enter also triggers)
const htmlBtn     = document.querySelector('.html-btn');        // "HTML" tab button (shows generated markup)
const previewBtn  = document.querySelector('.preview-btn');     // "Preview" tab button (shows live iframe)
const editor      = document.querySelector('.editor');          // <textarea> where user writes JS code
const previewIFR  = document.querySelector('.preview-frame');   // <iframe> where code is executed
const htmlOut     = document.querySelector('.html-output');     // <pre> or <code> node that shows pretty printed HTML
const consoleBox  = document.querySelector('.console');         // Console area that mirrors logs/errors

// Simple message channel & auth token so parent <-> iframe talk is scoped to this instance
const CHANNEL = 'dom-sketchbook:v1';
const TOKEN   = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));

// Enumerations for message types
const TO_IFRAME   = { RUN: 'RUN', RESET: 'RESET' };             // Messages parent sends to iframe
const FROM_IFRAME = { DONE: 'DONE', ERROR: 'ERROR', LOG: 'LOG', HTML: 'HTML' }; // Messages iframe sends back


// ---- Console helpers (in the parent page) ----
function clearConsole() { consoleBox.innerHTML = ''; }

function logLine(text, kind = 'log') {
  const line = document.createElement('div');
  line.textContent = (kind === 'error' ? '✖ ' : '› ') + text;   // Prefix errors with ✖, logs with ›
  line.style.color = kind === 'error' ? '#ff6b6b' : '#e7e9ee';  // Simple coloring
  consoleBox.appendChild(line);
  consoleBox.scrollTop = consoleBox.scrollHeight;               // Auto-scroll to bottom
}

// Pretty print HTML: remove whitespace between tags, split into tokens, indent by depth
function prettyHTML(s) {
  if (!s) return '';
  const tokens = s.replace(/>\s+</g, '><').split(/(?=<)/g);     // Normalize spacing, split on '<' boundaries
  let depth = 0;
  const out = [];
  for (const t of tokens) {
    const isClose = /^<\//.test(t);                             // Closing tag?
    const isSelf  = /\/>$/.test(t) ||                           // Self-closing tag?
                    /^<[^>]+>[^<]*<\/[^>]+>$/.test(t);          // or single-line open+close pair
    if (isClose) depth = Math.max(0, depth - 1);                // Dedent before printing closing tag
    out.push('  '.repeat(depth) + t);                           // Indent current token
    if (!isClose && !isSelf && /^<[^/!][^>]*>$/.test(t)) depth++; // Increase depth after pure opening tag
  }
  return out.join('\n');
}


// ---- Create and initialize the sandboxed iframe that runs user code ----
function mountSandbox() {
  // Security: only allow scripts; no top navigation, same-origin, etc.
  previewIFR.setAttribute('sandbox', 'allow-scripts');
  previewIFR.style.border = '0';

  // The iframe document is authored via srcdoc
  previewIFR.srcdoc = `
<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;font:14px/1.4 ui-monospace,monospace;color:#e7e9ee;background:#0b0d12}
  #app{padding:12px}
</style></head>
<body>
  <div id="app"></div>
  <script>
    // Constants injected from parent (frozen as literal JSON strings here)
    const CHANNEL = ${JSON.stringify(CHANNEL)};
    const TOKEN   = ${JSON.stringify(TOKEN)};
    const TO_IFRAME   = ${JSON.stringify(TO_IFRAME)};
    const FROM_IFRAME = ${JSON.stringify(FROM_IFRAME)};

    // Helper: send a structured, scoped postMessage to the parent
    const send = (type, payload) => parent.postMessage(
      { channel: CHANNEL, token: TOKEN, type, payload }, '*'
    );

    // Mirror console.log out to parent (also keep native behavior)
    const _log = console.log.bind(console);
    console.log = (...args) => {
      _log(...args);
      try { send(FROM_IFRAME.LOG, { text: args.map(a => String(a)).join(' ') }); } catch {}
    };

    // Global runtime error -> forward to parent as FROM_IFRAME.ERROR
    window.addEventListener('error', (e) => {
      send(FROM_IFRAME.ERROR, { message: e.message || String(e.error || 'Error') });
    });

    // Receive commands from parent
    window.addEventListener('message', (e) => {
      const data = e.data || {};
      if (data.channel !== CHANNEL || data.token !== TOKEN) return; // Ignore foreign traffic

      const root = document.getElementById('app');

      // RESET: clear the output area and report empty HTML
      if (data.type === TO_IFRAME.RESET) {
        root.innerHTML = '';
        send(FROM_IFRAME.HTML, { html: root.innerHTML });
        return send(FROM_IFRAME.DONE);
      }

      // RUN: execute user code in a new Function with 'root' as parameter
      if (data.type === TO_IFRAME.RUN) {
        try {
          root.innerHTML = '';
          new Function('root', data.code)(root);             // Run user code with root in scope
          send(FROM_IFRAME.HTML, { html: root.innerHTML });  // Send resulting DOM HTML back
          send(FROM_IFRAME.DONE);                            // Signal completion
        } catch (err) {
          send(FROM_IFRAME.ERROR, { message: (err && err.message) || String(err) });
        }
      }
    });
  </script>
</body></html>`;
}


// ---- Parent: listen for messages from the iframe and update UI accordingly ----
window.addEventListener('message', (e) => {
  if (e.source !== previewIFR.contentWindow) return;            // Only accept from our iframe

  const { channel, token, type, payload } = e.data || {};
  if (channel !== CHANNEL || token !== TOKEN) return;           // Scope by channel + token

  switch (type) {
    case FROM_IFRAME.LOG:                                       // Console.log mirror
      logLine(payload?.text ?? '');
      break;
    case FROM_IFRAME.ERROR:                                     // Runtime error mirror
      logLine(payload?.message ?? 'Unknown error', 'error');
      break;
    case FROM_IFRAME.HTML:                                      // Update HTML tab with pretty markup
      htmlOut.textContent = prettyHTML(payload?.html ?? '');
      break;
    case FROM_IFRAME.DONE:                                      // No-op; could show status if desired
      break;
  }
});


// ---- Parent -> Iframe message helpers ----
function resetPreview() {
  previewIFR.contentWindow.postMessage(
    { channel: CHANNEL, token: TOKEN, type: TO_IFRAME.RESET }, '*'
  );
}

function runCode() {
  clearConsole();
  const code = editor.value;                                    // User-authored JS code (expects 'root')
  localStorage.setItem('dsb:code', code);                       // Persist for next visit/session

  previewIFR.contentWindow.postMessage(
    { channel: CHANNEL, token: TOKEN, type: TO_IFRAME.RUN, code },
    '*'
  );
}

// ---- Tab switching (Preview vs HTML) ----
function showPreview() {
  previewIFR.style.display = 'block';
  htmlOut.parentElement.style.display = 'none';
}

function showHTML() {
  previewIFR.style.display = 'none';
  htmlOut.parentElement.style.display = 'block';
}


// ---- UI bindings ----
runBtn.addEventListener('click', runCode);
previewBtn.addEventListener('click', showPreview);
htmlBtn.addEventListener('click', showHTML);

// Keyboard shortcut: Ctrl/Cmd + Enter runs code
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runCode();
});


// ---- Bootstrapping on page load ----
(function boot() {
  // Default visible tab: preview
  previewIFR.style.display = 'block';
  htmlOut.parentElement.style.display = 'none';

  // Restore previous code from localStorage (if any)
  const saved = localStorage.getItem('dsb:code');
  if (saved) editor.value = saved;

  // Create and initialize the sandbox iframe
  mountSandbox();

  // Put caret in the editor
  editor.focus();
})();