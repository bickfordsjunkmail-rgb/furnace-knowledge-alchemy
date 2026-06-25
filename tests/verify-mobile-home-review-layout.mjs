import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const checks = [
  {
    name: 'home review uses a readable title helper instead of raw hash-like titles',
    pass: /homeDisplayTitle\(/.test(ui) &&
      /looksLikeHashTitle\(/.test(ui) &&
      !/daily\.title\)\)<\/strong>/.test(ui),
  },
  {
    name: 'recent review list is compact and horizontally scrollable on mobile',
    pass: /\.home-review-list[\s\S]*?grid-auto-flow:\s*column/.test(css) &&
      /\.home-review-list[\s\S]*?overflow-x:\s*auto/.test(css) &&
      /\.home-review-item[\s\S]*?min-width:\s*0/.test(css),
  },
  {
    name: 'daily card is visually compact on mobile',
    pass: /\.daily-review-card[\s\S]{0,220}margin-bottom:\s*8px/.test(css) &&
      /\.daily-review-main[\s\S]{0,260}padding:\s*9px 10px/.test(css) &&
      /\.daily-review-main strong[\s\S]{0,180}font-size:\s*0\.86rem/.test(css),
  },
  {
    name: 'cache version is at least v8 generation',
    pass: /20260625-v8(?:-[a-z]+)?/.test(html),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
