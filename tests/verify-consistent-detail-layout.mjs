import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');

const checks = [
  {
    name: 'document sections are collapsed by default on all viewports',
    pass: !/<details\s+\$\{idx === 0 \? 'open' : ''\}>/.test(ui) &&
      !/<details\s+open/.test(ui),
  },
  {
    name: 'section summaries advertise tap-to-read instead of dumping content',
    pass: /section-toggle-hint/.test(ui) && /\.section-toggle-hint/.test(css),
  },
  {
    name: 'mobile reading layout keeps desktop-like card outline',
    pass: /@media \(max-width: 420px\)[\s\S]*\.document-section summary/.test(css),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
