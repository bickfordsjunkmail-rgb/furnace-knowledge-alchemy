/* ============================================
   ui.js — 界面渲染与交互
   ============================================ */

const UI = {
  currentCategory: '全部',
  currentView: 'all',
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

  renderShelfViewFilters() {
    const container = document.getElementById('shelfViewFilters');
    if (!container) return;
    const views = [
      ['all', '全部'],
      ['inbox', '收件箱'],
      ['favorites', '收藏']
    ];
    container.innerHTML = views.map(([view, label]) => `
      <button class="view-chip ${this.currentView === view ? 'active' : ''}" data-view="${view}">${label}</button>
    `).join('');
  },

  async renderHomeReview() {
    const container = document.getElementById('homeReviewEntry');
    if (!container) return;
    const daily = await getDailyReviewDocument();
    const docs = await getRecentDocuments(3);
    if (!daily && !docs.length) {
      container.innerHTML = `
        <div class="home-review-title">今日回看</div>
        <div class="home-review-empty">收藏或打开过的精华，会出现在这里。</div>
      `;
      return;
    }

    container.innerHTML = `
      ${daily ? `
        <div class="daily-review-card">
          <div class="daily-review-kicker">今日回看</div>
          <button class="daily-review-main" onclick="UI.openDailyReview('${daily.id}')">
            <strong>${this.escape(this.cleanReadingText(daily.title))}</strong>
            <span>${this.escape(this.displaySummary(daily.summary || daily.content || ''))}</span>
          </button>
          <button class="daily-review-shuffle" onclick="UI.shuffleDailyReview('${daily.id}')">换一条</button>
        </div>
      ` : ''}
      ${docs.length ? `
        <div class="home-review-title">最近回看</div>
        <div class="home-review-list">
          ${docs.map(doc => `
            <button class="home-review-item" onclick="UI.openDocument('${doc.id}')">
              <span>${doc.favorite ? '★' : '↺'}</span>
              <strong>${this.escape(this.cleanReadingText(doc.title))}</strong>
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;
  },

  // --- 渲染魔药架 ---
  async renderShelf(category = '全部', view = this.currentView) {
    this.currentCategory = category;
    this.currentView = view;
    const grid = document.getElementById('cardGrid');
    if (!grid) return;

    this.renderShelfViewFilters();
    await this.renderCategoryFilters();

    const docs = await getDocumentsByView(view, category);
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
    const statusLabel = (doc.status || 'archived') === 'inbox' ? '收件箱' : '已入库';
    const favoriteLabel = doc.favorite ? '已收藏' : '收藏';
    return `
      <article class="document-card" style="--cat-color:${color}" onclick="UI.openDocument('${doc.id}')">
        <div class="document-icon">${icon}</div>
        <div class="document-main">
          <div class="document-card-top">
            <span class="status-pill ${doc.status === 'inbox' ? 'inbox' : ''}">${statusLabel}</span>
            <button class="favorite-toggle ${doc.favorite ? 'active' : ''}" onclick="event.stopPropagation(); UI.toggleFavorite('${doc.id}')" aria-label="${favoriteLabel}">${doc.favorite ? '★' : '☆'}</button>
          </div>
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

    const q = query.toLowerCase();
    const docs = (await getDocumentsByView(this.currentView, this.currentCategory)).filter(d =>
      (d.title || '').toLowerCase().includes(q) ||
      (d.summary || '').toLowerCase().includes(q) ||
      (d.content || '').toLowerCase().includes(q) ||
      (d.fileName || '').toLowerCase().includes(q) ||
      (d.tags || []).some(t => String(t).toLowerCase().includes(q))
    );
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
    await updateDocument(id, { lastOpenedAt: Date.now() });

    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    const displayTitle = this.cleanReadingText(doc.title);
    const displaySummary = this.cleanReadingText(doc.summary || '已收录为一份完整文件药瓶');
    const readingKeywords = this.getReadingKeywords(doc);

    content.innerHTML = `
      <header class="reading-header">
        <div class="reading-source">${this.escape(doc.fileName || doc.source || '手动投料')}</div>
        <h1 class="modal-title">${this.escape(displayTitle)}</h1>
        <div class="modal-essence">💡 ${this.escape(displaySummary)}</div>
        ${readingKeywords.length ? `
          <div class="reading-keywords">
            ${readingKeywords.map(tag => `<span>${this.escape(tag)}</span>`).join('')}
          </div>
        ` : ''}
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

      <div class="reading-mode-tabs">
        <button class="active" data-mode="essence" onclick="UI.switchReadingMode('essence')">精华</button>
        <button data-mode="original" onclick="UI.switchReadingMode('original')">原文</button>
      </div>

      <div class="essence-mode reading-mode-panel active">
        ${doc.sections && doc.sections.length > 0 ? `
          <div class="reading-content">
            ${doc.sections.map((section, idx) => `
              <section class="document-section">
                <div class="section-card-header">
                  <h2>${this.escape(this.displayHeading(section.heading || `小节 ${idx + 1}`))}</h2>
                  ${section.summary ? `<p>${this.escape(this.displaySummary(section.summary))}</p>` : ''}
                </div>
                <div class="section-body">${this.renderSectionBody(section)}</div>
                ${this.renderKeySentence(section)}
              </section>
            `).join('')}
          </div>
        ` : `
          <div class="reading-content">${this.renderReadingBlocks(doc.content || '')}</div>
        `}
      </div>

      <div class="original-mode reading-mode-panel">
        <div class="original-toolbar">
          <span>完整原文</span>
          <button class="btn-soft btn-mini" onclick="UI.copyOriginalText('${doc.id}')">复制原文</button>
        </div>
        <div class="original-content">${this.renderOriginalContent(doc.content || '')}</div>
      </div>

      ${doc.originalQuotes && doc.originalQuotes.length > 0 ? `
        <div class="modal-quotes">
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">📜 原文引用</div>
          ${doc.originalQuotes.map(q => `<blockquote>${this.escape(q)}</blockquote>`).join('')}
        </div>
      ` : ''}

      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">
        🎯 触发场景：${this.escape(doc.triggers || '待标注')}
      </div>
      ${doc.tags && doc.tags.length ? `
        <div class="tag-row">
          ${doc.tags.map(t => `<span class="card-tag">#${this.escape(t)}</span>`).join('')}
        </div>
      ` : ''}
      <div style="display:flex;gap:8px;">
        ${(doc.status || 'archived') === 'inbox' ? `
          <button onclick="UI.archiveCurrentDocument('${doc.id}')" class="btn-soft">
            入库
          </button>
        ` : ''}
        <button onclick="UI.toggleFavorite('${doc.id}')" class="btn-soft">
          ${doc.favorite ? '取消收藏' : '收藏'}
        </button>
        <button onclick="UI.deleteDocument('${doc.id}')" class="btn-danger">
          🗑 丢弃
        </button>
      </div>
    `;

    modal.style.display = 'flex';
    await this.renderHomeReview();
  },

  closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  },

  switchReadingMode(mode) {
    document.querySelectorAll('.reading-mode-tabs button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.querySelectorAll('.reading-mode-panel').forEach(panel => {
      panel.classList.toggle('active', panel.classList.contains(`${mode}-mode`));
    });
  },

  async copyOriginalText(id) {
    const docs = await getAllDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    const text = doc.content || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      alert('原文已复制');
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    alert('原文已复制');
  },

  async openDailyReview(id) {
    await updateDocument(id, { reviewedAt: Date.now() });
    await this.openDocument(id);
  },

  async shuffleDailyReview(currentId) {
    const container = document.getElementById('homeReviewEntry');
    if (!container) return;
    const daily = await getDailyReviewDocument(currentId);
    if (!daily) return;
    const card = container.querySelector('.daily-review-card');
    if (!card) {
      await this.renderHomeReview();
      return;
    }
    card.outerHTML = `
      <div class="daily-review-card">
        <div class="daily-review-kicker">今日回看</div>
        <button class="daily-review-main" onclick="UI.openDailyReview('${daily.id}')">
          <strong>${this.escape(this.cleanReadingText(daily.title))}</strong>
          <span>${this.escape(this.displaySummary(daily.summary || daily.content || ''))}</span>
        </button>
        <button class="daily-review-shuffle" onclick="UI.shuffleDailyReview('${daily.id}')">换一条</button>
      </div>
    `;
  },

  async changeDocumentCategory(id, newCategory) {
    await updateDocument(id, { category: newCategory });
    await this.renderShelf(this.currentCategory, this.currentView);
  },

  async toggleFavorite(id) {
    await toggleDocumentFavorite(id);
    await this.renderShelf(this.currentCategory, this.currentView);
    await this.renderHomeReview();
    const modal = document.getElementById('modalOverlay');
    if (modal && modal.style.display === 'flex') {
      await this.openDocument(id);
    }
  },

  async archiveCurrentDocument(id) {
    await archiveDocument(id);
    await this.renderShelf(this.currentCategory, this.currentView);
    await this.openDocument(id);
  },

  async deleteDocument(id) {
    if (!confirm('确定要丢弃这瓶魔药吗？')) return;
    await deleteDocument(id);
    this.closeModal();
    await this.renderShelf(this.currentCategory, this.currentView);
    await this.renderHomeReview();
  },

  // --- 工具函数 ---
  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  getReadingKeywords(doc) {
    const tags = Array.isArray(doc.tags) ? doc.tags : [];
    const base = [doc.category, ...tags]
      .map(tag => this.cleanReadingText(tag))
      .filter(Boolean);
    return [...new Set(base)].slice(0, 4);
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
      .replace(/[>＞]+/g, ' ')
      .replace(/^\s*[-*]\s*/gm, '')
      .replace(/^\s*\d+[.、]\s*/gm, '')
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
      .replace(/\s+[>＞]\s*/g, '\n')
      .replace(/([。！？])\s+(规则\s*\d+[：:])/g, '$1\n## $2')
      .replace(/([。！？])\s+(\d+[.、]\s*)/g, '$1\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  readingParagraphs(text) {
    return this.normalizeReadingText(text)
      .split('\n')
      .map(line => this.cleanReadingText(line))
      .filter(line => line && !/^[-*#>`]+$/.test(line))
      .filter((line, index, arr) => arr.indexOf(line) === index);
  },

  isReadingHeading(line) {
    return line.length <= 42 &&
      /^(总纲|规则\s*\d+|第\s*\d+|理解|什么|说错|每日|一句话|判断|框架|原则|\d+[.、]\s*)/.test(line);
  },

  renderSectionBody(section) {
    const heading = this.displayHeading(section.heading || '');
    const summary = this.displaySummary(section.summary || '');
    const keySentence = this.extractKeySentence(section);
    const repeated = new Set([heading, summary, keySentence].filter(Boolean));
    const source = section.content || section.summary || '';
    let paragraphs = this.readingParagraphs(source)
      .filter(line => !repeated.has(line))
      .filter(line => !this.isReadingHeading(line));

    if (!paragraphs.length && summary) paragraphs = [summary];

    return paragraphs
      .map(line => `<p>${this.escape(line)}</p>`)
      .join('');
  },

  extractKeySentence(section) {
    const points = Array.isArray(section.keyPoints) ? section.keyPoints : [];
    const candidates = [
      ...points,
      ...(section.content ? this.readingParagraphs(section.content).filter(line => /一句话|关键句|公式|→/.test(line)) : []),
      section.summary,
    ];
    const cleaned = candidates
      .map(item => this.cleanReadingText(item))
      .filter(Boolean)
      .filter(line => line.length <= 90);
    return cleaned[0] || '';
  },

  renderKeySentence(section) {
    const keySentence = this.extractKeySentence(section);
    if (!keySentence) return '';
    return `
      <div class="key-sentence">
        <span>关键句</span>
        <strong>${this.escape(keySentence)}</strong>
      </div>
    `;
  },

  renderReadingBlocks(text) {
    const paragraphs = this.readingParagraphs(text);
    if (!paragraphs.length) return '';

    const blocks = [];
    let current = null;

    for (const line of paragraphs) {
      if (this.isReadingHeading(line)) {
        if (current) blocks.push(current);
        current = { title: line, body: [] };
      } else if (current) {
        current.body.push(line);
      } else {
        blocks.push({ title: '', body: [line] });
      }
    }
    if (current) blocks.push(current);

    return blocks.map(block => `
      <div class="reading-block">
        ${block.title ? `<h3>${this.escape(block.title)}</h3>` : ''}
        ${block.body.map(line => `<p>${this.escape(line)}</p>`).join('')}
      </div>
    `).join('');
  },

  renderOriginalContent(text) {
    if (!text) return '<p>暂无原文</p>';
    return String(text)
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => `<p>${this.escape(part)}</p>`)
      .join('');
  },

  renderMarkdownLite(text) {
    if (!text) return '';
    return this.readingParagraphs(text)
      .map(line => `<p>${this.escape(line)}</p>`)
      .join('');
  },

  formatContent(text) {
    return this.renderMarkdownLite(text);
  }
};
