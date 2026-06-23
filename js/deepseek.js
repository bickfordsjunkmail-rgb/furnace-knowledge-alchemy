/* ============================================
   deepseek.js — DeepSeek API 客户端
   Agent A（提取）→ Agent B（审查）→ Agent C（合并）
   ============================================ */

const DeepSeek = {
  BASE_URL: 'https://api.deepseek.com/v1/chat/completions',
  MODEL: 'deepseek-v4-pro',

  // ---- 配置 ----
  getApiKey() {
    return localStorage.getItem('ds_api_key') || '';
  },

  setApiKey(key) {
    localStorage.setItem('ds_api_key', key.trim());
  },

  getModel() {
    return localStorage.getItem('ds_model') || 'deepseek-v4-pro';
  },

  isConfigured() {
    return this.getApiKey().length > 10;
  },

  // ---- API 调用 ----
  async chat(messages, { temperature = 0.3, maxTokens = 4096 } = {}) {
    const key = this.getApiKey();
    if (!key) throw new Error('请先设置 DeepSeek API Key');

    const resp = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: this.getModel(),
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API 错误 ${resp.status}`);
    }

    const data = await resp.json();
    return data.choices[0].message.content;
  },

  // =========== Agent A：拆解（元帅 + 学徒并行） ===========
  async agentExtract(text, segmentId, totalSegments) {
    const prompt = `你是一个严肃的小矮人药剂师——知识提取专家。请从以下文本片段（第${segmentId}/${totalSegments}段）中提取信息。

【规则】
1. 不遗漏：每一个独立信息点都要提取
2. 不评价：只提取原文实际说了什么，不添加自己的理解
3. 不跨段：只看当前片段
4. 每条附原文引用

【输出格式】严格按JSON输出（不要markdown包裹）：
{
  "核心观点": [
    {"观点": "一句话概括", "置信度": "高/中/低", "原文引用": "原文原句"}
  ],
  "关键论据": [
    {"论据": "具体事实或推理", "支撑哪个观点": "对应观点", "原文引用": "原文原句"}
  ],
  "术语定义": [
    {"术语": "术语名", "定义": "定义", "首次出现": true/false, "原文引用": "原文原句"}
  ],
  "案例类比": [
    {"内容": "案例描述", "说明什么": "说明的道理", "原文引用": "原文原句"}
  ]
}

【文本】
${text}`;

    const response = await this.chat([
      { role: 'system', content: '你是严谨的知识提取器。只输出JSON，不输出其他内容。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.1, maxTokens: 4096 });

    return this.parseJSON(response);
  },

  // =========== Agent B：审查（法官） ===========
  async agentReview(allExtractions, fullText) {
    const prompt = `你是严肃的矮人法官。请审查以下全部提取结果，找出问题。

【检查清单】
1. 段内遗漏：原文有但没提取的重要信息？
2. 跨段遗漏：段与段之间逻辑链断裂？
3. 矛盾：同一件事不同段说法不同？（注意区分：真实矛盾 vs 论证递进）
4. 低置信度：标了"中/低"的项合理吗？

【输出格式】严格JSON：
{
  "遗漏清单": [
    {"类型":"段内/跨段", "段号":1, "遗漏内容":"...", "原文位置":"...", "严重程度":"高/中/低"}
  ],
  "矛盾清单": [
    {"段A":1, "段B":3, "A说什么":"...", "B说什么":"...", "是否真矛盾":false, "解释":"..."}
  ],
  "低置信度": [
    {"段号":1, "观点":"...", "风险":"...", "建议":"..."}
  ],
  "跨段关联建议": [
    {"关联段号":[1,3], "关联":"...", "建议":"..."}
  ]
}

【全部提取结果】
${JSON.stringify(allExtractions, null, 2)}

【完整原文（供回溯验证）】
${fullText.substring(0, 8000)}`;

    const response = await this.chat([
      { role: 'system', content: '你是严谨的审查法官。只输出JSON。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, maxTokens: 4096 });

    return this.parseJSON(response);
  },

  // =========== Agent C：提取合并（工匠） ===========
  async agentMerge(allExtractions, issues) {
    const prompt = `你是严肃的矮人工匠。请将提取结果合并为结构化知识卡片。

【规则】
1. 按论证逻辑排列（非段号）
2. 去重合并同类观点
3. 逐条处理B的问题标注
4. 区分真实矛盾 vs 论证递进

【输出格式】严格JSON数组，每个元素是一张知识卡片：
[
  {
    "title": "论证主题",
    "essence": "一句话核心洞见",
    "content": "完整论证结构（用markdown，按逻辑递进排列）",
    "category": "人性洞察/情感关系/AI与技术/认知与思维/做事方法论/人生道理/其他",
    "tags": ["标签1","标签2"],
    "confidence": "确定/推测/存疑",
    "triggers": "什么场景下能用这段知识",
    "originalQuotes": ["原文引用1","原文引用2"]
  }
]

【A层提取结果】
${JSON.stringify(allExtractions, null, 2)}

【B层问题清单】
${JSON.stringify(issues, null, 2)}`;

    const response = await this.chat([
      { role: 'system', content: '你是严谨的知识工匠。只输出JSON数组。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 8192 });

    return this.parseJSON(response);
  },

  // =========== 自动分类（单独调用，更快） ===========
  async autoClassify(text) {
    const prompt = `请将以下文本归类到最合适的类别。可选类别：
- 人性洞察：关于人性本质、善恶、欲望、道德等
- 情感关系：关于情感、人际关系、爱情友情亲情等
- AI与技术：关于人工智能、技术、编程等
- 认知与思维：关于思维方式、认知框架、第一性原理等
- 做事方法论：关于效率、习惯、管理、学习方法等
- 人生道理：关于人生意义、成长、选择、处世智慧等
- 其他：以上都不匹配

只输出分类名称，不要解释。

文本：${text.substring(0, 2000)}`;

    const response = await this.chat([
      { role: 'system', content: '你只输出分类名称，一个词。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.1, maxTokens: 50 });

    return response.trim().replace(/["']/g, '');
  },

  // =========== 全流程（一键） ===========
  async runFullPipeline(text, sourceName, onProgress) {
    // 阶段一：Agent A 拆解
    onProgress?.('decompose', 10);

    // 分段
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 20);
    const segments = [];
    const segSize = Math.max(1, Math.ceil(paragraphs.length / 6)); // 最多6段
    for (let i = 0; i < paragraphs.length; i += segSize) {
      segments.push(paragraphs.slice(i, i + segSize).join('\n'));
    }

    // 并行提取（实际是顺序调用，避免API限流）
    const allExtractions = [];
    for (let i = 0; i < segments.length; i++) {
      onProgress?.('decompose', 10 + Math.floor((i / segments.length) * 30));
      const extracted = await this.agentExtract(segments[i], i + 1, segments.length);
      allExtractions.push({ segment_id: i + 1, text: segments[i], ...extracted });
    }

    // 阶段二：Agent B 审查
    onProgress?.('review', 45);
    const issues = await this.agentReview(allExtractions, text);
    onProgress?.('review', 65);

    // 阶段三：Agent C 合并
    onProgress?.('extract', 70);
    const cards = await this.agentMerge(allExtractions, issues);
    onProgress?.('extract', 90);

    // 自动分类矫正
    for (const card of cards) {
      if (!card.category || card.category === '其他') {
        card.category = await this.autoClassify(card.essence + card.content);
      }
    }

    onProgress?.('extract', 100);
    return cards;
  },

  // ---- 工具 ----
  parseJSON(str) {
    // 去掉可能的markdown包裹
    let cleaned = str.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    }
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // 尝试提取第一个 [ 或 {
      const jsonStart = cleaned.search(/[\[\{]/);
      if (jsonStart >= 0) {
        try {
          return JSON.parse(cleaned.substring(jsonStart));
        } catch (e2) {
          console.error('JSON解析失败:', cleaned.substring(0, 200));
          throw new Error('AI 返回格式异常，请重试');
        }
      }
      throw new Error('AI 返回格式异常，请重试');
    }
  }
};
