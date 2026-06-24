import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const source = readFileSync(join(root, 'js', 'ui.js'), 'utf8');

const context = {
  document: {
    createElement() {
      return {
        textContent: '',
        get innerHTML() {
          return this.textContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        },
      };
    },
  },
};

vm.createContext(context);
vm.runInContext(`${source}\nglobalThis.__UI = UI;`, context);

const dirty = `【文件：做人操作系统_精简操作版.md】 。 # 做人操作系统：精简操作版。 > 做人，就是让人放心。 ## 1. 七条核心规则。 ### 规则 1：别人投入你，要回应；接了事情，要闭环。 > 我试了，结果是这样。 > 我卡在这里。 ### 规则 2：不会可以，不要装会。`;
const rendered = context.__UI.renderMarkdownLite(dirty);

const textOnly = rendered.replace(/<[^>]+>/g, '');
const forbidden = ['【文件：', '##', '###', '&gt;', '>'];
let ok = true;
for (const token of forbidden) {
  if (textOnly.includes(token)) {
    console.log(`FAIL rendered output still contains ${token}`);
    ok = false;
  }
}

if (!textOnly.includes('做人，就是让人放心') || !textOnly.includes('别人投入你，要回应')) {
  console.log('FAIL rendered output lost expected content');
  ok = false;
}

if (ok) {
  console.log('PASS rendered output is clean');
} else {
  console.log(rendered);
  process.exitCode = 1;
}
