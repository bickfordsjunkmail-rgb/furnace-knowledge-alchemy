import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const storage = readFileSync(join(root, 'js', 'storage.js'), 'utf8');
const app = readFileSync(join(root, 'js', 'app.js'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');

const checks = [
  {
    name: 'detail page exposes essence and original reading modes',
    pass: /reading-mode-tabs/.test(ui) &&
      /data-mode="essence"/.test(ui) &&
      /data-mode="original"/.test(ui) &&
      /class="essence-mode/.test(ui) &&
      /class="original-mode/.test(ui),
  },
  {
    name: 'original mode renders full document content and copy action',
    pass: /renderOriginalContent\(doc\.content/.test(ui) &&
      /copyOriginalText/.test(ui) &&
      /复制原文/.test(ui),
  },
  {
    name: 'opening a document records lastOpenedAt for review history',
    pass: /lastOpenedAt:\s*Date\.now\(\)/.test(ui) &&
      /getRecentDocuments\(/.test(storage),
  },
  {
    name: 'home screen exposes recent review entry',
    pass: /homeReviewEntry/.test(html) &&
      /renderHomeReview/.test(ui) &&
      /home-review-card/.test(css) &&
      /UI\.renderHomeReview\(\)/.test(app),
  },
  {
    name: 'cache version is at least v7 generation',
    pass: /20260625-v[78]/.test(html) &&
      !/20260625-vault/.test(html),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
