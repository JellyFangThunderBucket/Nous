const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Nous_Source.js'), 'utf8');
const bookmarklet = fs.readFileSync(path.join(root, 'Nous_Bookmarklet.txt'), 'utf8').trim();
const preview = fs.readFileSync(path.join(root, 'Nous_Preview.html'), 'utf8');

new vm.Script(source, { filename: 'Nous_Source.js' });
const rebuilt = 'javascript:' + source.split('\n').map(line => line.trim()).join(' ').trim();
assert.equal(bookmarklet, rebuilt, 'bookmarklet must match source');
assert.match(source, /id="basecamp"/, 'Base Camp must be present in toolbar');
assert.match(source, /id="setting-visible-basecamp"/, 'handoff visibility setting must exist');
assert.match(source, /navigator\.canShare\(\{files:\[file\]\}\)/, 'guard file-sharing support');
assert.match(source, /entries:records,transfer:/, 'handoff must include all resources');
assert.match(source, /entries:filtered/, 'original filtered export must remain');
assert.match(source, /protocol:'nous-basecamp-v1'/, 'handoff protocol must be versioned');
assert.match(source, /downloadExport\(data,filename\)/, 'download fallback must exist');
assert.match(source, /overflow-x:auto;scrollbar-width:none/, 'toolbar must scroll on narrow phones');
assert.ok(preview.includes('nous-basecamp-v1'), 'preview payload must be regenerated');
console.log('Nous Base Camp static regression tests passed.');
