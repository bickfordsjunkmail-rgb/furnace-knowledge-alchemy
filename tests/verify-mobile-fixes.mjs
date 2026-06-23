import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'css', 'style.css'), 'utf8');
const app = readFileSync(join(root, 'js', 'app.js'), 'utf8');

const checks = [
  {
    name: 'mobile file picker exists',
    pass: /<input(?=[^>]+id="fileInput")(?=[^>]+type="file")[^>]*>/.test(html),
  },
  {
    name: 'file picker accepts text documents, PDF, and Word',
    pass: /accept="[^"]*\.pdf[^"]*\.docx[^"]*\.md[^"]*\.txt/.test(html),
  },
  {
    name: 'PDF text extraction path exists',
    pass: /readPdf\(/.test(app) && /pdfjsLib/.test(app),
  },
  {
    name: 'settings inputs use light surfaces',
    pass: /\.settings-input/.test(css) && !/id="apiKeyInput"[\s\S]{0,240}background:var\(--bg\)/.test(html),
  },
  {
    name: 'character assets are packaged',
    pass: [
      'assets/characters/dwarf-alchemist-main.png',
      'assets/characters/dwarf-alchemist-stirring.png',
      'assets/characters/dwarf-alchemist-reviewing.png',
      'assets/backgrounds/furnace-workshop-bg.png',
    ].every((file) => existsSync(join(root, file))),
  },
  {
    name: 'character image loading is prioritized',
    pass: /fetchpriority="high"/.test(html) && /loading="eager"/.test(html),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
