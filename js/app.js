/* ============================================
   app.js — 应用入口
   支持多种文件格式：txt, md, json, csv, pdf, docx
   ============================================ */

// 支持的文件类型
const SUPPORTED_TYPES = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/pdf': 'pdf',
  'text/html': 'html',
  'text/xml': 'xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc'
};

// 文件扩展名映射
const EXT_MAP = {
  'txt': true, 'md': true, 'csv': true, 'json': true,
  'html': true, 'xml': true, 'log': true, 'pdf': true, 'docx': true, 'doc': true
};

let currentMaterialTitle = '';
let currentMaterialType = 'paste';

// ---- 读取文件 ----
async function readFileContent(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'pdf' || file.type === 'application/pdf') {
    return await readPdf(file);
  }

  // .docx 文件用 mammoth.js 提取文字
  if (ext === 'docx' || file.type.includes('wordprocessingml')) {
    return await readDocx(file);
  }

  // .doc 旧格式不支持，提示用户
  if (ext === 'doc' || file.type === 'application/msword') {
    throw new Error('暂不支持 .doc 旧格式，请另存为 .docx 后再试');
  }

  // 纯文本类直接读取
  return await readAsText(file);
}

async function readFilesContent(files) {
  const parts = [];
  const failed = [];

  for (const file of files) {
    try {
      const text = await readFileContent(file);
      if (text && text.trim()) {
        parts.push(`【文件：${file.name}】\n${text.trim()}`);
      } else {
        failed.push(`${file.name}：未提取到文字`);
      }
    } catch (err) {
      failed.push(`${file.name}：${err.message || '读取失败'}`);
    }
  }

  if (parts.length === 0) {
    throw new Error(failed.join('\n') || '没有可用的文字内容');
  }

  return {
    text: parts.join('\n\n---\n\n'),
    failed
  };
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'UTF-8');
  });
}

// 使用 mammoth.js 提取 docx 文字
function readDocx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      // 动态加载 mammoth
      loadMammoth().then(mammoth => {
        mammoth.extractRawText({ arrayBuffer })
          .then(result => resolve(result.value))
          .catch(() => reject(new Error('Word 文档解析失败，请尝试粘贴文字')));
      }).catch(() => {
        reject(new Error('Word 解析组件加载失败'));
      });
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

function readPdf(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        const pdf = await pdfjsLib.getDocument({ data: reader.result }).promise;
        const pages = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const text = content.items
            .map((item) => item.str)
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (text) pages.push(`第 ${pageNum} 页\n${text}`);
        }

        resolve(pages.join('\n\n'));
      } catch {
        reject(new Error('PDF 解析失败：如果是扫描件图片 PDF，需要先 OCR 或复制文字'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

let pdfJsLoaded = null;
function loadPdfJs() {
  if (pdfJsLoaded) return pdfJsLoaded;
  if (window.pdfjsLib) {
    pdfJsLoaded = Promise.resolve(window.pdfjsLib);
    return pdfJsLoaded;
  }

  pdfJsLoaded = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error('PDF 解析组件加载失败'));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('PDF 解析组件加载失败'));
    document.head.appendChild(script);
  });

  return pdfJsLoaded;
}

let mammothLoaded = null;
function loadMammoth() {
  if (mammothLoaded) return mammothLoaded;
  if (window.mammoth) {
    mammothLoaded = Promise.resolve(window.mammoth);
    return mammothLoaded;
  }
  mammothLoaded = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
    script.onload = () => resolve(window.mammoth);
    script.onerror = () => reject(new Error('CDN load failed'));
    document.head.appendChild(script);
  });
  return mammothLoaded;
}

document.addEventListener('DOMContentLoaded', async () => {
  await openDB();
  await migrateLegacyCardsToDocuments();
  Alchemist.init();

  // --- 标签切换 ---
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const panelName = tab.dataset.panel;
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${panelName}`).classList.add('active');

      if (panelName === 'shelf') {
        UI.renderShelf(UI.currentCategory);
      }
    });
  });

  // --- 投料输入监听 ---
  const inputText = document.getElementById('inputText');
  const charCount = document.getElementById('charCount');
  const btnBrew = document.getElementById('btnBrew');
  const fileInput = document.getElementById('fileInput');
  const btnChooseFile = document.getElementById('btnChooseFile');
  const fileHint = document.getElementById('fileHint');

  inputText.addEventListener('input', () => {
    const len = inputText.value.length;
    charCount.textContent = `${len} 字`;
    btnBrew.disabled = len < 5;
  });

  btnChooseFile.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    if (files.length === 0) return;
    await handleFilesInput(files);
    fileInput.value = '';
  });

  // --- 文件拖拽（支持多格式） ---
  const basket = document.getElementById('inputBasket');

  basket.addEventListener('dragover', (e) => {
    e.preventDefault();
    basket.classList.add('drag-over');
  });

  basket.addEventListener('dragleave', () => {
    basket.classList.remove('drag-over');
  });

  basket.addEventListener('drop', async (e) => {
    e.preventDefault();
    basket.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    await handleFilesInput(files);
  });

  // --- 粘贴文件也可触发 ---
  document.addEventListener('paste', async (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length > 0 && files.some(file => EXT_MAP[file.name.split('.').pop().toLowerCase()])) {
      e.preventDefault();
      await handleFilesInput(files);
    }
  });

  async function handleFilesInput(files) {
    const supportedFiles = files.filter(file => EXT_MAP[file.name.split('.').pop().toLowerCase()] || SUPPORTED_TYPES[file.type]);
    if (supportedFiles.length === 0) {
      alert('请选择包含文字的文件：PDF、Word(docx)、Markdown、TXT、JSON、CSV 等');
      return;
    }

    inputText.value = `⏳ 正在读取 ${supportedFiles.length} 个文件...`;
    inputText.disabled = true;
    btnBrew.disabled = true;
    fileHint.textContent = '正在提取文字，请稍候...';
    fileHint.classList.add('has-file');

    try {
      const { text, failed } = await readFilesContent(supportedFiles);
      if (text && text.trim().length > 0) {
        inputText.value = text;
        inputText.dispatchEvent(new Event('input'));
        currentMaterialTitle = supportedFiles.length === 1
          ? supportedFiles[0].name
          : `${supportedFiles[0].name} 等 ${supportedFiles.length} 个文件`;
        currentMaterialType = 'file';
        fileHint.textContent = failed.length
          ? `已读取 ${supportedFiles.length - failed.length}/${supportedFiles.length} 个文件，部分失败可继续熬制`
          : `已读取 ${supportedFiles.length} 个文件：${currentMaterialTitle}`;
      } else {
        inputText.value = '';
        alert('文件内容为空或无法识别文字，请尝试其他文件');
      }
    } catch (err) {
      inputText.value = '';
      alert(err.message || '文件读取失败，请尝试粘贴文字内容');
      fileHint.textContent = '读取失败，请换文件或直接粘贴文字';
    } finally {
      inputText.disabled = false;
    }
  }

  // --- 开始熬制 ---
  btnBrew.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (text.length < 5) return;

    try {
      await saveRawMaterial({
        content: text,
        title: currentMaterialTitle || text.substring(0, 30) + '...',
        type: currentMaterialType
      });

      Alchemist.setState('receiving');
      await Pipeline.sleep(600);

      await Pipeline.run(text, currentMaterialTitle || '手动投料');

      // 刷新魔药架和分类筛选栏
      await UI.renderShelf(UI.currentCategory);
      currentMaterialTitle = '';
      currentMaterialType = 'paste';
      fileHint.textContent = '支持 PDF、Word(docx)、Markdown、TXT、JSON、CSV，可多选';
      fileHint.classList.remove('has-file');
    } catch (err) {
      console.error('炼制失败:', err);
      alert('熬制过程中出了点问题，请重试');
      btnBrew.disabled = false;
      btnBrew.textContent = '🍯 开始熬制';
      Alchemist.setState('idle');
    }
  });

  // --- 分类筛选（动态渲染） ---
  document.getElementById('categoryFilters').addEventListener('click', (e) => {
    if (e.target.classList.contains('cat-tag')) {
      document.querySelectorAll('.cat-tag').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      UI.renderShelf(e.target.dataset.cat);
    }
  });

  // --- 搜索 ---
  const searchBox = document.getElementById('searchBox');
  let searchTimer;
  searchBox.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      UI.search(searchBox.value);
    }, 300);
  });

  // --- 设置面板 ---
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelInput = document.getElementById('modelInput');
  const apiStatus = document.getElementById('apiStatus');

  // 加载已保存的设置
  const savedKey = DeepSeek.getApiKey();
  const savedModel = DeepSeek.getModel();
  if (savedKey) {
    apiKeyInput.value = savedKey.substring(0, 8) + '****' + savedKey.substring(savedKey.length - 4);
    apiKeyInput.dataset.masked = 'true';
  }
  modelInput.value = savedModel;
  updateApiStatus();

  // 输入Key时取消遮罩
  apiKeyInput.addEventListener('focus', () => {
    if (apiKeyInput.dataset.masked === 'true') {
      apiKeyInput.value = '';
      apiKeyInput.dataset.masked = 'false';
    }
  });

  // 保存Key
  document.getElementById('btnSaveKey').addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key || key.length < 10) {
      alert('请输入有效的 API Key（以 sk- 开头）');
      return;
    }
    DeepSeek.setApiKey(key);
    apiKeyInput.value = key.substring(0, 8) + '****' + key.substring(key.length - 4);
    apiKeyInput.dataset.masked = 'true';
    const model = modelInput.value.trim() || 'deepseek-v4-pro';
    localStorage.setItem('ds_model', model);
    updateApiStatus();
    alert('✅ API Key 已保存！当前模型：' + model);
  });

  // 清除Key
  document.getElementById('btnClearKey').addEventListener('click', () => {
    if (confirm('确定清除 API Key？')) {
      DeepSeek.setApiKey('');
      apiKeyInput.value = '';
      apiKeyInput.dataset.masked = 'false';
      updateApiStatus();
    }
  });

  modelInput.addEventListener('change', () => {
    const model = modelInput.value.trim() || 'deepseek-v4-pro';
    localStorage.setItem('ds_model', model);
  });

  function updateApiStatus() {
    if (DeepSeek.isConfigured()) {
      apiStatus.innerHTML = '✅ DeepSeek AI 已就绪 — 熬制时自动启用真实AI分析';
      apiStatus.style.color = 'var(--herb-dark)';
      const btn = document.getElementById('btnBrew');
      if (btn) btn.textContent = '⚡ 开始熬制';
    } else {
      apiStatus.innerHTML = '⚠️ 未配置 API Key — 将使用本地模拟处理<br><a href="https://platform.deepseek.com/api_keys" target="_blank" style="color:var(--herb-dark);">去 DeepSeek 获取 Key →</a>';
      apiStatus.style.color = 'var(--text-muted)';
    }
  }

  // --- 弹窗关闭 ---
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) UI.closeModal();
  });
  document.getElementById('modalClose').addEventListener('click', () => {
    UI.closeModal();
  });
});
