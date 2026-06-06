import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hostinger metadata presents a plain Vite app', () => {
  const pkg = JSON.parse(readProjectFile('package.json'));

  assert.equal(pkg.name, 'minerva-travel-frontend');
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.engines.node, '22.x');
  assert.equal(pkg.scripts.build, 'vite build');
  assert.equal(pkg.scripts.start, 'vite preview --host 0.0.0.0 --port 3000');
  assert.equal(pkg.devDependencies.vite.startsWith('^'), true);
  assert.equal(pkg.devDependencies['@vitejs/plugin-react'].startsWith('^'), true);
});

test('Vite config stays simple for Hostinger framework detection', () => {
  const config = readProjectFile('vite.config.js');

  assert.match(config, /defineConfig/);
  assert.match(config, /@vitejs\/plugin-react/);
  assert.doesNotMatch(config, /visual-editor|selection-mode|pocketbase-auth|horizons|createLogger|optimizeDeps/);
});

test('Hostinger frontend does not hard-code Horizons backend paths', () => {
  const files = [
    'src/lib/pocketbaseClient.js',
    'src/lib/apiServerClient.js',
    'src/lib/integratedAiClient.js',
    'src/lib/authClient.js',
  ];

  const source = files.map((path) => readProjectFile(path)).join('\n');

  assert.doesNotMatch(source, /\/hcgi\/(?:platform|api)/);
});

test('Hostinger static files do not advertise Horizons or Vite defaults', () => {
  const source = [
    readProjectFile('index.html'),
    readProjectFile('public/.htaccess'),
  ].join('\n');

  assert.doesNotMatch(source, /Hostinger Horizons|vite\.svg/);
});

test('runtime config loads before the React entrypoint', () => {
  const index = readProjectFile('index.html');
  const head = index.match(/<head>([\s\S]*?)<\/head>/)?.[1] || '';

  assert.match(head, /<script src="\/config\.js\?v=[^"]+"><\/script>/);
  assert.equal(index.indexOf('/config.js') < index.indexOf('/src/main.jsx'), true);
});

test('runtime config and HTML are not cached by Hostinger CDN', () => {
  const htaccess = readProjectFile('public/.htaccess');

  assert.match(htaccess, /Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"/);
  assert.doesNotMatch(htaccess, /s-maxage=604800/);
  assert.match(htaccess, /REQUEST_URI.+\^\/assets\/\.\*/);
});

test('password recovery route is wired to real auth flow', () => {
  const app = readProjectFile('src/App.jsx');
  const loginPage = readProjectFile('src/pages/LoginPage.jsx');
  const resetPage = readProjectFile('src/pages/ResetPasswordPage.jsx');

  assert.match(app, /path="\/reset-password"/);
  assert.match(loginPage, /requestPasswordReset/);
  assert.doesNotMatch(loginPage, /Recupera..o de senha em breve/);
  assert.match(resetPage, /updatePassword/);
});
