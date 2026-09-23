// ヘッドレステスト実行: node test/run-tests.js
// index.html の <script> を取り出し、DOMシム + テストと連結して実行する
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('index.html に <script> が見つかりません'); process.exit(1); }

const shim  = fs.readFileSync(path.join(__dirname, 'shim.js'), 'utf8');
const tests = fs.readFileSync(path.join(__dirname, 'tests.js'), 'utf8');
const out = path.join(__dirname, '.bundle.js');
fs.writeFileSync(out, shim + '\n' + m[1] + '\n' + tests);

try {
  execFileSync(process.execPath, ['--check', out], { stdio: 'inherit' });
  execFileSync(process.execPath, [out], { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
} finally {
  fs.unlinkSync(out);
}
