import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const storage = readFileSync(join(root, 'js', 'storage.js'), 'utf8');
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');

const checks = [
  {
    name: 'storage exposes daily review candidate selection',
    pass: /function getDailyReviewDocument\(/.test(storage) &&
      /favorite/.test(storage) &&
      /lastOpenedAt/.test(storage),
  },
  {
    name: 'home review renders a dedicated daily review card',
    pass: /daily-review-card/.test(ui) &&
      /今日回看/.test(ui) &&
      /daily-review-card/.test(css),
  },
  {
    name: 'daily review can be shuffled without leaving home',
    pass: /shuffleDailyReview/.test(ui) &&
      /换一条/.test(ui),
  },
  {
    name: 'opening daily review records review metadata',
    pass: /openDailyReview/.test(ui) &&
      /reviewedAt:\s*Date\.now\(\)/.test(ui),
  },
  {
    name: 'cache version is bumped for v8',
    pass: /20260625-v8/.test(html) &&
      !/20260625-v7/.test(html),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
