import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const storage = readFileSync(join(root, 'js', 'storage.js'), 'utf8');
const ui = readFileSync(join(root, 'js', 'ui.js'), 'utf8');
const app = readFileSync(join(root, 'js', 'app.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');

const checks = [
  {
    name: 'storage supports inbox, favorites, archive, and backups',
    pass: /status:\s*doc\.status\s*\|\|\s*'inbox'/.test(storage) &&
      /favorite:\s*doc\.favorite\s*\|\|\s*false/.test(storage) &&
      /function toggleDocumentFavorite\(/.test(storage) &&
      /function archiveDocument\(/.test(storage) &&
      /function getDocumentsByView\(/.test(storage) &&
      /function exportAllData\(/.test(storage) &&
      /function importAllData\(/.test(storage),
  },
  {
    name: 'shelf exposes all, inbox, and favorite views',
    pass: /currentView:\s*'all'/.test(ui) &&
      /\['inbox',\s*'收件箱'\]/.test(ui) &&
      /\['favorites',\s*'收藏'\]/.test(ui) &&
      /data-view="\$\{view\}"/.test(ui) &&
      /renderShelf\(category\s*=\s*'全部',\s*view\s*=\s*this\.currentView/.test(ui),
  },
  {
    name: 'document cards and detail actions expose favorite and archive controls',
    pass: /favorite-toggle/.test(ui) &&
      /toggleFavorite/.test(ui) &&
      /archiveCurrentDocument/.test(ui) &&
      /入库/.test(ui),
  },
  {
    name: 'settings screen exposes backup export and import controls',
    pass: /btnExportBackup/.test(html) &&
      /backupImportInput/.test(html) &&
      /btnImportBackup/.test(html) &&
      /backup-card/.test(css),
  },
  {
    name: 'app wires backup controls to storage import and export',
    pass: /btnExportBackup/.test(app) &&
      /exportAllData\(/.test(app) &&
      /importAllData\(/.test(app) &&
      /application\/json/.test(app),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) process.exitCode = 1;
