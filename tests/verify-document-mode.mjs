import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const storage = readFileSync(join(root, 'js', 'storage.js'), 'utf8');
const pipeline = readFileSync(join(root, 'js', 'pipeline.js'), 'utf8');
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');

const checks = [
  {
    name: 'stores knowledge documents separately from legacy cards',
    pass: /knowledge_documents/.test(storage) &&
      /function saveDocument\(/.test(storage) &&
      /function getAllDocuments\(/.test(storage),
  },
  {
    name: 'pipeline saves one document per source instead of many cards',
    pass: /generateDocument\(/.test(pipeline) &&
      /saveDocument\(/.test(pipeline) &&
      !/for\s*\(const card of cards\)\s*{[\s\S]{0,120}saveCard/.test(pipeline),
  },
  {
    name: 'AI cards are wrapped into one document',
    pass: /documentFromCards\(/.test(pipeline),
  },
  {
    name: 'shelf renders documents as file rows',
    pass: /documentHTML\(/.test(ui) &&
      /openDocument\(/.test(ui) &&
      /getAllDocuments\(/.test(ui),
  },
  {
    name: 'detail view renders sections into clean reading cards',
    pass: /renderSectionBody\(/.test(ui) &&
      /renderKeySentence\(/.test(ui) &&
      /document-section/.test(ui) &&
      !/formatContent\(card\.content\)/.test(ui),
  },
  {
    name: 'shelf and modal use light reading surfaces',
    pass: /\.document-card/.test(css) &&
      /\.reading-content/.test(css) &&
      /\.modal-close[\s\S]{0,180}background:\s*linear-gradient/.test(css) &&
      !/\.modal-close[\s\S]{0,160}background:\s*#0/.test(css),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
