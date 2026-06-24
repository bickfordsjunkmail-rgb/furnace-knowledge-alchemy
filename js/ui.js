/* ============================================
   ui.js — 界面渲染与交互
   ============================================ */

const UI = {
  currentCategory: '全部',
  currentCards: [],

  // 分类图标映射
  CATEGORY_ICONS: {
    '人性洞察': '🧠', '情感关系': '💗', 'AI与技术': '🤖',
    '认知与思维': '🧩', '做事方法论': '⚒️', '人生道理': '📖',
    '其他': '📦'
  },

  // --- 动态渲染分类筛选栏 ---
  async renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    const categories = await getDistinctDocumentCategories();

    container.innerHTML = `
      <button class="cat-tag ${this.currentCategory === '全部' ? 'active' : ''}" data-cat="全部">全部</button>
      ${categories.map(cat => {
        const icon = this.CATEGORY_ICONS[cat] || '📦';
        return `<button class="cat-tag ${this.currentCategory === cat ? 'active' : ''}" data-cat="${this.escape(cat)}">${icon} ${this.escape(cat)}</button>`;
      }).join('')}
    `;
  },

  // --- 渲染魔药架 ---
  async renderShelf(category = '全部') {
    this.currentCategory = category;
    const grid = document.getElementById('cardGrid');
    if (!grid) return;

    await this.renderCategoryFilters();

    let docs;
    if (category === '全部') {
      docs = await getAllDocuments();
    } else {
      docs = await getDocumentsByCategory(category);
    }
    this.currentCards = docs;

    if (docs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="icon">🧴</div>
          <p>药瓶架还是空的</p>
          <p style="font-size:0.75rem;margin-top:4px;">去「投料」放入第一份文件吧</p>
        </div>`;
      return;
    }

    grid.innerHTML = docs.map(d => this.documentHTML(d)).join('');
  },

  // 动态分类颜色
  categoryColor(cat) {
    let hash = 0;
    for (const ch of cat) hash = ((hash << 5) - hash) + ch.charCodeAt(0);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 45%, 50%)`;
  },

  documentHTML(doc) {
    const color = this.categoryColor(doc.category);
    const icon = this.CATEGORY_ICONS[doc.category] || '📄';
    const created = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('zh-CN') : '';
    const sectionCount = Array.isArray(doc.sections) ? doc.sections.length : 0;
    const title = this.cleanReadingText(doc.title);
    const summary = this.cleanReadingText(doc.summary || doc.content?.substring(0, 90) || '');
    return `
      <article class="document-card" style="--cat-color:${color}" onclick="UI.openDocument('${doc.id}')">
        <div class="document-icon">${icon}</div>
        <div class="document-main">
          <div class="document-title">${this.escape(title)}</div>
          <div class="document-summary">${this.escape(summary)}</div>
          <div class="document-meta">
            <span>${this.escape(doc.category)}</span>
            <span>${sectionCount} 个小节</span>
            <span>${doc.wordCount || 0} 字</span>
            ${created ? `<span>${created}</span>` : ''}
          </div>
        </div>
      </article>`;
  },

  // --- 搜索 ---
  async search(query) {
    if (!query.trim()) {
      await this.renderShelf(this.currentCategory);
      return;
    }

    const docs = await searchDocuments(query);
    this.currentCards = docs;
    const grid = document.getElementById('cardGrid');
    if (!grid) return;

    if (docs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="icon">🔍</div>
          <p>没有找到匹配的文件药瓶</p>
        </div>`;
      return;
    }

    grid.innerHTML = docs.map(d => this.documentHTML(d)).join('');
  },

  // --- 文档详情弹窗 ---
  async openDocument(id) {
    const docs = await getAllDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;

    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    const displayTitle = this.cleanReadingText(doc.title);
    const displaySummary = this.cleanReadingText(doc.summary || '已收录为一份完整文件药瓶');

    content.innerHTML = `
      <header class="reading-header">
        <div class="reading-source">${this.escape(doc.fileName || doc.source || '手动投料')}</div>
        <h1 class="modal-title">${this.escape(displayTitle)}</h1>
        <div class="modal-essence">💡 ${this.escape(displaySummary)}</div>
      </header>

      <div class="modal-meta-row document-meta-row">
        <select id="modalCategory" class="category-select" onchange="UI.changeDocumentCategory('${doc.id}', this.value)">
          <option value="人性洞察" ${doc.category==='人性洞察'?'selected':''}>🧠 人性洞察</option>
          <option value="情感关系" ${doc.category==='情感关系'?'selected':''}>💗 情感关系</option>
          <option value="AI与技术" ${doc.category==='AI与技术'?'selected':''}>🤖 AI与技术</option>
          <option value="认知与思维" ${doc.category==='认知与思维'?'selected':''}>🧩 认知与思维</option>
          <option value="做事方法论" ${doc.category==='做事方法论'?'selected':''}>⚒️ 做事方法论</option>
          <option value="人生道理" ${doc.category==='人生道理'?'selected':''}>📖 人生道理</option>
          <option value="其他" ${doc.category==='其他'?'selected':''}>📦 其他</option>
        </select>
        <span class="card-confidence ${doc.confidence}">置信度：${doc.confidence}</span>
        <span class="card-tag">来源：${this.escape(doc.source || '手动投料')}</span>
      </div>

      ${doc.sections && doc.sections.length > 0 ? `
        <div class="reading-content">
          ${doc.sections.map((section, idx) => `
            <section class="document-section">
              <details>
                <summary>
                  <span>${this.escape(this.displayHeading(section.heading || `小节 ${idx + 1}`))}</span>
                  ${section.summary ? `<small>${this.escape(this.displaySummary(section.summary))}</small>` : ''}
                  <em class="section-toggle-hint">点开看正文</em>
                </summary>
                ${section.keyPoints && section.keyPoints.length ? `
                  <div class="key-points">
                    ${section.keyPoints.map(point => `<div class="key-point">${this.escape(this.cleanReadingText(point))}</div>`).join('')}
                  </div>
                ` : ''}
                <div class="section-body">${this.renderMarkdownLite(section.content || '')}</div>
              </details>
            </section>
          `).join('')}
        </div>
      ` : `
        <div class="reading-content">${this.renderMarkdownLite(doc.content || '')}</div>
      `}

      ${doc.originalQuotes && doc.originalQuotes.length > 0 ? `
        <div class="modal-quotes">
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">📜 原文引用</div>
          ${doc.originalQuotes.map(q => `<blockquote>${this.escape(q)}</blockquote>`).join('')}
        </div>
      ` : ''}

      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">
        🎯 触发场景：${this.escape(doc.triggers || '待标注')}
      </div>
      <div class="tag-row">
        ${(doc.tags || []).map(t => `<span class="card-tag">#${this.escape(t)}</span>`).join('')}
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="UI.deleteDocument('${doc.id}')" class="btn-danger">
          🗑 丢弃
        </button>
      </div>
    `;

    modal.style.display = 'flex';
  },

  closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  },

  async changeDocumentCategory(id, newCategory) {
    await updateDocument(id, { category: newCategory });
    await this.renderShelf(this.currentCategory);
  },

  async deleteDocument(id) {
    if (!confirm('确定要丢弃这瓶魔药吗？')) return;
    await deleteDocument(id);
    this.closeModal();
    await this.renderShelf(this.currentCategory);
  },

  // --- 工具函数 ---
  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  displayHeading(text) {
    const cleaned = this.cleanReadingText(text);
    return cleaned || '未命名小节';
  },

  displaySummary(text) {
    const cleaned = this.cleanReadingText(text);
    return cleaned.length > 96 ? cleaned.substring(0, 96) + '...' : cleaned;
  },

  cleanReadingText(text) {
    if (!text) return '';
    return String(text)
      .replace(/【文件：[^】]+】/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/`{1,3}/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/^\s*>\s*/gm, '')
      .replace(/\s+>\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[。；;、\s]+/, '')
      .trim();
  },

  normalizeReadingText(text) {
    if (!text) return '';
    return String(text)
      .replace(/\r\n/g, '\n')
      .replace(/【文件：[^】]+】/g, '\n')
      .replace(/\s+(#{1,4})\s*/g, '\n$1 ')
      .replace(/\s+>\s*/g, '\n> ')
      .replace(/([。！？])\s+(规则\s*\d+[：:])/g, '$1\n## $2')
      .replace(/([。！？])\s+(\d+[.、]\s*)/g, '$1\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  renderMarkdownLite(text) {
    if (!text) return '';
    const normalized = this.normalizeReadingText(text);
    const lines = normalized
      .split('\n')
      .filter(l => l.trim())
      .map(l => l.trim());

    return lines.map(line => {
      if (/^#{1,4}\s+/.test(line)) {
        const level = Math.min((line.match(/^#+/) || [''])[0].length, 3);
        const label = this.cleanReadingText(line.replace(/^#{1,4}\s+/, ''));
        return `<h${level + 2}>${this.escape(label)}</h${level + 2}>`;
      }
      if (/^>\s?/.test(line)) {
        return `<blockquote>${this.escape(this.cleanReadingText(line.replace(/^>\s?/, '')))}</blockquote>`;
      }
      if (/^[-*]\s+/.test(line)) {
        return `<p class="list-line">• ${this.escape(this.cleanReadingText(line.replace(/^[-*]\s+/, '')))}</p>`;
      }
      if (/^\d+[.、]\s+/.test(line)) {
        return `<p class="list-line">${this.escape(this.cleanReadingText(line))}</p>`;
      }
      return `<p>${this.escape(this.cleanReadingText(line))}</p>`;
    }).join('');
  },

  formatContent(text) {
    return this.renderMarkdownLite(text);
  }
};
