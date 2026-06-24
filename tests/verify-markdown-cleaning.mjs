import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');

const checks = [
  {
    name: 'renderer normalizes flattened markdown before rendering',
    pass: /normalizeReadingText\(/.test(ui) &&
      /renderMarkdownLite\(text\)[\s\S]{0,220}readingParagraphs\(text\)/.test(ui),
  },
  {
    name: 'renderer removes raw file header markers from reading text',
    pass: /cleanReadingText\(/.test(ui) && /【文件：/.test(ui),
  },
  {
    name: 'section title and summary are cleaned before display',
    pass: /displayHeading/.test(ui) && /displaySummary/.test(ui),
  },
  {
    name: 'raw quote and heading symbols are removed after normalization',
    pass: ui.includes("replace(/[>＞]+/g, ' ')") &&
      ui.includes("replace(/\\s+(#{1,4})\\s*/g, '\\n$1 ')"),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
