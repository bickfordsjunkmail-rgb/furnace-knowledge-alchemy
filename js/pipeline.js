/* ============================================
   pipeline.js — 三阶段处理流程
   前端模拟 Agent A→B→C 流水线
   自动分类：智能识别 + 动态大类
   ============================================ */

const Pipeline = {

  // ----- 自动分类体系 -----
  // 只定义 6 个总大类，每个大类有广泛的触发关键词
  // 当文本匹配不到任何大类时，归入「其他」
  CATEGORY_SYSTEM: {
    '人性洞察': {
      keywords: ['人性', '本能', '欲望', '善恶', '自私', '利他', '道德', '良知', '贪婪', '恐惧',
                 '虚荣', '嫉妒', '傲慢', '偏见', '弱点', '劣根', '人心', '人性论', '阴暗',
                 '善良', '宽容', '勇气', '诚信', '忠诚', '背叛', '欺骗'],
      icon: '🧠'
    },
    '情感关系': {
      keywords: ['情感', '情绪', '爱情', '友情', '亲情', '婚姻', '关系', '喜欢', '讨厌',
                 '恨', '悲伤', '喜悦', '愤怒', '焦虑', '孤独', '幸福', '痛苦', '思念',
                 '分手', '相处', '沟通', '理解', '包容', '共鸣', '感动', '冷漠'],
      icon: '💗'
    },
    'AI与技术': {
      keywords: ['AI', '人工智能', '模型', '算法', '机器学习', '智能体', 'Agent', 'LLM',
                 '提示词', '编程', '代码', '软件', '技术', '自动化', '数据', '训练',
                 '深度学习', '神经网络', 'GPU', 'token', 'API', '接口', '开源'],
      icon: '🤖'
    },
    '认知与思维': {
      keywords: ['认知', '思维', '思考', '逻辑', '推理', '判断', '决策', '方法论', '框架',
                 '心智模型', '第一性原理', '系统思考', '批判性思维', '元认知', '思维模型',
                 '反思', '复盘', '洞察', '视角', '维度', '层面', '底层', '本质'],
      icon: '🧩'
    },
    '做事方法论': {
      keywords: ['方法', '流程', '策略', '技巧', '效率', '习惯', '执行力', '目标', '规划',
                 '项目', '管理', '协作', '领导力', '沟通', '谈判', '演讲', '写作',
                 '学习', '读书', '笔记', '知识管理', '时间管理', '精力', '专注'],
      icon: '⚒️'
    },
    '人生道理': {
      keywords: ['人生', '命运', '意义', '价值', '成功', '失败', '成长', '改变', '选择',
                 '机会', '运气', '努力', '坚持', '放弃', '代价', '教训', '经验',
                 '智慧', '成熟', '格局', '眼界', '境界', '修行', '处世', '原则'],
      icon: '📖'
    }
  },

  // ----- 自动分类 -----
  autoClassify(text) {
    const scores = {};

    for (const [category, config] of Object.entries(this.CATEGORY_SYSTEM)) {
      scores[category] = 0;
      for (const kw of config.keywords) {
        // 分数加权：长关键词匹配权重更高
        const regex = new RegExp(kw, 'g');
        const matches = text.match(regex);
        if (matches) {
          scores[category] += matches.length * (kw.length >= 3 ? 2 : 1);
        }
      }
    }

    // 找最高分
    let bestCategory = '其他';
    let bestScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat;
      }
    }

    // 阈值：分数太低归入「其他」
    if (bestScore < 2) bestCategory = '其他';

    return {
      category: bestCategory,
      icon: this.CATEGORY_SYSTEM[bestCategory]?.icon || '📦',
      scores
    };
  },

  // 提取标签
  extractTags(text, category) {
    const config = this.CATEGORY_SYSTEM[category];
    if (!config) return [];

    const tags = [];
    const seen = new Set();
    for (const kw of config.keywords) {
      if (text.includes(kw) && !seen.has(kw)) {
        tags.push(kw);
        seen.add(kw);
      }
      if (tags.length >= 5) break;
    }
    return tags;
  },

  // ----- 主流程 -----
  async run(text, sourceName = '手动投料') {
    const btn = document.getElementById('btnBrew');
    btn.disabled = true;

    document.getElementById('progressSection').classList.add('visible');
    this.setProgress(0, null);

    let cards;

    if (DeepSeek.isConfigured()) {
      // 使用 DeepSeek 真实AI处理
      btn.textContent = '⚡ AI熬制中...';
      try {
        cards = await DeepSeek.runFullPipeline(text, sourceName, (phase, pct) => {
          this.setProgress(pct, phase);
          if (phase === 'decompose') Alchemist.setState('decomposing');
          if (phase === 'review') Alchemist.setState('reviewing');
          if (phase === 'extract') Alchemist.setState('extracting');
        });

        // 存入 IndexedDB
        for (const card of cards) {
          await saveCard({
            ...card,
            source: sourceName,
            status: 'final',
            originalQuotes: card.originalQuotes || []
          });
        }
      } catch (err) {
        console.error('AI处理失败，降级到本地处理:', err);
        btn.textContent = '⏳ 降级处理中...';
        cards = await this.runLocal(text, sourceName);
      }
    } else {
      // 本地模拟处理
      btn.textContent = '⏳ 熬制中...';
      cards = await this.runLocal(text, sourceName);
    }

    this.setProgress(100, 'extract');
    Alchemist.setState('complete');

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = DeepSeek.isConfigured() ? '⚡ 继续熬制' : '🍯 继续熬制';
      document.getElementById('progressSection').classList.remove('visible');
      document.getElementById('inputText').value = '';
      document.getElementById('charCount').textContent = '0 字';
      Alchemist.setState('idle');
    }, 2000);

    return cards;
  },

  // ----- 本地降级处理 -----
  async runLocal(text, sourceName) {
    await this.phaseDecompose(text);
    await this.phaseReview();
    return await this.phaseExtract(text, sourceName);
  },

  async phaseDecompose(text) {
    Alchemist.setState('decomposing');
    this.setProgress(10, 'decompose');
    await this.sleep(400);

    const paragraphs = text
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 5);

    if (paragraphs.length === 0) throw new Error('未检测到有效文本');

    const segments = [];
    for (let i = 0; i < Math.min(paragraphs.length, 8); i++) {
      this.setProgress(10 + (i / Math.min(paragraphs.length, 8)) * 30, 'decompose');
      await this.sleep(150 + Math.random() * 200);
      segments.push({ segment_id: i + 1, text: paragraphs[i] });
    }

    this.setProgress(40, 'decompose');
    return segments;
  },

  async phaseReview() {
    Alchemist.setState('reviewing');
    this.setProgress(45, 'review');
    await this.sleep(500);

    const steps = ['段内遗漏检查', '跨段遗漏检查', '矛盾检查', '低置信度审查'];
    for (let i = 0; i < steps.length; i++) {
      this.setProgress(45 + (i / steps.length) * 25, 'review');
      await this.sleep(250 + Math.random() * 300);
    }

    this.setProgress(70, 'review');
  },

  async phaseExtract(text, sourceName) {
    Alchemist.setState('extracting');
    this.setProgress(75, 'extract');
    await this.sleep(400);

    const cards = this.generateCards(text, sourceName);

    this.setProgress(90, 'extract');
    await this.sleep(300);

    for (const card of cards) {
      await saveCard(card);
    }

    this.setProgress(100, 'extract');
    return cards;
  },

  // ----- 生成卡片（自动分类版） -----
  generateCards(text, sourceName) {
    const { category, icon } = this.autoClassify(text);
    const tags = this.extractTags(text, category);

    const sentences = text.split(/[。！？\n]+/).map(s => s.trim()).filter(s => s.length > 8);

    if (sentences.length === 0) {
      return [{
        title: '原料已收录',
        essence: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        content: text,
        category,
        tags: [...tags, '待深度处理'],
        confidence: '推测',
        source: sourceName,
        triggers: '后续由CC深度分析',
        status: 'draft'
      }];
    }

    // 智能分段：按主题聚类
    const clusteredSentences = this.clusterByTheme(sentences);

    const cards = [];

    if (clusteredSentences.length <= 1 || category === '其他') {
      // 单一主题或未分类 → 生成一张综合卡片
      cards.push({
        title: this.generateTitle(text, category),
        essence: sentences[0].substring(0, 80),
        content: text,
        category,
        tags,
        confidence: category === '其他' ? '推测' : '推测',
        source: sourceName,
        triggers: '待标注',
        status: 'draft'
      });
    } else {
      // 多主题 → 每个主题一张卡片
      for (const cluster of clusteredSentences) {
        if (cluster.length < 2) continue;
        const clusterText = cluster.join('。');
        const subCategory = this.autoClassify(clusterText).category;
        cards.push({
          title: this.generateTitle(clusterText, subCategory),
          essence: cluster[0].substring(0, 80),
          content: clusterText,
          category: subCategory,
          tags: this.extractTags(clusterText, subCategory),
          confidence: '推测',
          source: sourceName,
          triggers: '待标注',
          status: 'draft'
        });
      }
    }

    if (cards.length === 0) {
      cards.push({
        title: '未分类原料',
        essence: sentences[0].substring(0, 80),
        content: text,
        category,
        tags,
        confidence: '推测',
        source: sourceName,
        triggers: '后续由CC处理',
        status: 'draft'
      });
    }

    return cards;
  },

  // ----- 智能标题生成 -----
  generateTitle(text, category) {
    const keyPhrases = [];
    const patterns = [
      /((?:关于|论|谈|说|浅谈|再谈|思考|反思|理解|认识|看法|观点).{2,15})(?:[，。！？\n]|$)/g,
      /((?:什么|为什么|如何|怎么|怎样).{2,20})(?:[，。！？\n]|$)/g,
      /((?:\*\*|【|「).{2,20}(?:\*\*|】|」))/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const phrase = match[1].replace(/[*【】「」#]/g, '').trim();
        if (phrase.length >= 3 && phrase.length <= 25) {
          keyPhrases.push(phrase);
        }
        if (keyPhrases.length >= 2) break;
      }
      if (keyPhrases.length >= 2) break;
    }

    if (keyPhrases.length > 0) {
      return keyPhrases[0];
    }

    // 提取开头核心句
    const firstSentence = text.split(/[。！？\n]/)[0].trim();
    if (firstSentence.length >= 5 && firstSentence.length <= 30) {
      return firstSentence.substring(0, 25);
    }

    return `${category} · 思考碎片`;
  },

  // ----- 主题聚类 -----
  clusterByTheme(sentences) {
    if (sentences.length <= 3) return [sentences];

    const clusters = [];
    let currentCluster = [sentences[0]];
    let currentTheme = this.autoClassify(sentences[0]).category;

    for (let i = 1; i < sentences.length; i++) {
      const theme = this.autoClassify(sentences[i]).category;
      if (theme === currentTheme || theme === '其他' || currentTheme === '其他') {
        currentCluster.push(sentences[i]);
        if (theme !== '其他') currentTheme = theme;
      } else {
        clusters.push(currentCluster);
        currentCluster = [sentences[i]];
        currentTheme = theme;
      }
    }
    clusters.push(currentCluster);

    return clusters;
  },

  // ----- 辅助 -----
  setProgress(pct, phase) {
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = pct + '%';

    if (phase) {
      const steps = document.querySelectorAll('.progress-step');
      const order = ['decompose', 'review', 'extract'];
      const idx = order.indexOf(phase);
      steps.forEach((s, i) => {
        s.classList.remove('current', 'done');
        if (i < idx) s.classList.add('done');
        if (i === idx) s.classList.add('current');
      });
    }
  },

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
};
