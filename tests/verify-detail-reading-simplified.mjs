import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const checks = [
  {
    name: 'essence mode renders an edited note instead of dumping all section cards',
    pass: /renderEssenceNote\(doc\)/.test(ui) &&
      /note-section/.test(ui) &&
      /核心结论/.test(ui) &&
      /适用场景/.test(ui) &&
      /行动建议/.test(ui),
  },
  {
    name: 'detailed decomposition is hidden behind an expand-more section',
    pass: /renderMoreBreakdown\(doc\)/.test(ui) &&
      /more-breakdown/.test(ui) &&
      /展开更多拆解/.test(ui) &&
      !/doc\.sections\.map\(\(section, idx\)[\s\S]{0,900}<section class="document-section">/.test(ui),
  },
  {
    name: 'detail header weakens raw source metadata',
    pass: /reading-source compact/.test(ui) &&
      /\.reading-source\.compact/.test(css) &&
      /\.modal-title[\s\S]{0,160}font-size:\s*1rem/.test(css),
  },
  {
    name: 'mode tabs are compact on mobile',
    pass: /\.reading-mode-tabs[\s\S]{0,220}margin:\s*8px 16px 4px/.test(css) &&
      /\.reading-mode-tabs button[\s\S]{0,220}padding:\s*6px 8px/.test(css),
  },
  {
    name: 'cache version is bumped for simplified detail reading',
    pass: /20260625-v8-detailfix/.test(html),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
