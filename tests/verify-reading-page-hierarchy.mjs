import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');

const checks = [
  {
    name: 'document section is the rule card instead of wrapping many inner reading cards',
    pass: /renderSectionBody\(section/.test(ui) &&
      !/renderReadingBlocks\(section\.content/.test(ui),
  },
  {
    name: 'key points are collapsed into one key sentence area',
    pass: /renderKeySentence\(section/.test(ui) &&
      !/class="key-points"/.test(ui),
  },
  {
    name: 'first screen exposes compact keywords near the summary',
    pass: /reading-keywords/.test(ui) &&
      /\.reading-keywords/.test(css),
  },
  {
    name: 'mobile detail page uses requested spacing and readable body size',
    pass: /padding:\s*0 16px/.test(css) &&
      /font-size:\s*15px/.test(css) &&
      /line-height:\s*1\.75/.test(css) &&
      /gap:\s*12px/.test(css),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
