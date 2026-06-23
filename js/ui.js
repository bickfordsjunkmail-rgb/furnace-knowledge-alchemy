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

    const categories = await getDistinctCategories();

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

    let cards;
    if (category === '全部') {
      cards = await getAllCards();
    } else {
      cards = await getCardsByCategory(category);
    }
    this.currentCards = cards;

    if (cards.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="icon">🧴</div>
          <p>药瓶架还是空的</p>
          <p style="font-size:0.75rem;margin-top:4px;">去「投料」放入第一批草药吧</p>
        </div>`;
      return;
    }

    grid.innerHTML = cards.map(c => this.cardHTML(c)).join('');
  },

  // 动态分类颜色
  categoryColor(cat) {
    let hash = 0;
    for (const ch of cat) hash = ((hash << 5) - hash) + ch.charCodeAt(0);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 45%, 50%)`;
  },

  cardHTML(card) {
    const color = this.categoryColor(card.category);
    return `
      <div class="knowledge-card" style="--cat-color:${color}" onclick="UI.openCard('${card.id}')">
        <div class="card-title">${this.escape(card.title)}</div>
        <div class="card-essence">${this.escape(card.essence)}</div>
        <div class="card-meta">
          <span class="card-tag">${this.escape(card.category)}</span>
          <span class="card-confidence ${card.confidence}">${card.confidence}</span>
          ${card.tags.slice(0, 2).map(t => `<span class="card-tag">#${this.escape(t)}</span>`).join('')}
        </div>
      </div>`;
  },

  // --- 搜索 ---
  async search(query) {
    if (!query.trim()) {
      await this.renderShelf(this.currentCategory);
      return;
    }

    const cards = await searchCards(query);
    this.currentCards = cards;
    const grid = document.getElementById('cardGrid');
    if (!grid) return;

    if (cards.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="icon">🔍</div>
          <p>没有找到匹配的药瓶</p>
        </div>`;
      return;
    }

    grid.innerHTML = cards.map(c => this.cardHTML(c)).join('');
  },

  // --- 卡片详情弹窗 ---
  async openCard(id) {
    const cards = await getAllCards();
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
      <div class="modal-title">${this.escape(card.title)}</div>
      <div class="modal-essence">💡 ${this.escape(card.essence)}</div>
      <div class="modal-content">${this.formatContent(card.content)}</div>
      <div class="modal-meta-row" style="align-items:center;">
        <select id="modalCategory" onchange="UI.changeCardCategory('${card.id}', this.value)"
          style="padding:5px 10px;border-radius:8px;border:1px solid var(--bg-wood);font-family:var(--font-body);font-size:0.78rem;background:var(--bg-card);color:var(--text);">
          <option value="人性洞察" ${card.category==='人性洞察'?'selected':''}>🧠 人性洞察</option>
          <option value="情感关系" ${card.category==='情感关系'?'selected':''}>💗 情感关系</option>
          <option value="AI与技术" ${card.category==='AI与技术'?'selected':''}>🤖 AI与技术</option>
          <option value="认知与思维" ${card.category==='认知与思维'?'selected':''}>🧩 认知与思维</option>
          <option value="做事方法论" ${card.category==='做事方法论'?'selected':''}>⚒️ 做事方法论</option>
          <option value="人生道理" ${card.category==='人生道理'?'selected':''}>📖 人生道理</option>
          <option value="其他" ${card.category==='其他'?'selected':''}>📦 其他</option>
        </select>
        <span class="card-confidence ${card.confidence}">置信度：${card.confidence}</span>
        <span class="card-tag" style="font-size:0.65rem">来源：${this.escape(card.source)}</span>
      </div>
      ${card.originalQuotes && card.originalQuotes.length > 0 ? `
        <div class="modal-quotes">
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">📜 原文引用</div>
          ${card.originalQuotes.map(q => `<blockquote>${this.escape(q)}</blockquote>`).join('')}
        </div>
      ` : ''}
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;">
        🎯 触发场景：${this.escape(card.triggers || '待标注')}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        ${card.tags.map(t => `<span class="card-tag">#${this.escape(t)}</span>`).join('')}
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="UI.deleteCard('${card.id}')"
          style="flex:1;padding:8px;background:#fce4ec;border:none;border-radius:8px;color:#c62828;cursor:pointer;font-family:var(--font-body);">
          🗑 丢弃
        </button>
      </div>
    `;

    modal.style.display = 'flex';
  },

  closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  },

  async changeCardCategory(id, newCategory) {
    await updateCard(id, { category: newCategory });
    await this.renderShelf(this.currentCategory);
  },

  async deleteCard(id) {
    if (!confirm('确定要丢弃这瓶魔药吗？')) return;
    await deleteCard(id);
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

  formatContent(text) {
    if (!text) return '';
    return text
      .split('\n')
      .filter(l => l.trim())
      .map(l => `<p>${this.escape(l)}</p>`)
      .join('');
  }
};
