import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');

const checks = [
  {
    name: 'document sections render as direct reading cards, not hidden detail drawers',
    pass: !/<details/.test(ui) &&
      !/section-toggle-hint/.test(ui),
  },
  {
    name: 'section body is rendered through clean reading blocks',
    pass: /renderReadingBlocks\(section\.content/.test(ui) &&
      /reading-block/.test(ui),
  },
  {
    name: 'mobile reading layout keeps desktop-like stacked cards',
    pass: /\.section-card-header/.test(css) &&
      /\.reading-block/.test(css) &&
      /@media \(max-width: 420px\)[\s\S]*\.reading-block/.test(css),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
