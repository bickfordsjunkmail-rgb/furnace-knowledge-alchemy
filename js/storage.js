/* ============================================
   storage.js — IndexedDB 存储层
   ============================================ */

const DB_NAME = 'AlchemyFurnace';
const DB_VERSION = 3;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('raw_materials')) {
        db.createObjectStore('raw_materials', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('knowledge_cards')) {
        const store = db.createObjectStore('knowledge_cards', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('knowledge_documents')) {
        const store = db.createObjectStore('knowledge_documents', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('source', 'source', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// --- raw_materials ---

function saveRawMaterial({ content, title, type = 'paste', fileType = null }) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('raw_materials', 'readwrite');
    const store = tx.objectStore('raw_materials');
    const item = {
      id: uuid(),
      content,
      title: title || '未命名原料',
      type,
      fileType,
      status: 'raw',
      createdAt: Date.now()
    };
    store.add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

function updateRawMaterialStatus(id, status) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('raw_materials', 'readwrite');
    const store = tx.objectStore('raw_materials');
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if (!item) return reject(new Error('Not found'));
      item.status = status;
      store.put(item);
      tx.oncomplete = () => resolve(item);
    };
    req.onerror = () => reject(req.error);
  });
}

// --- knowledge_cards ---

function saveCard(card) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_cards', 'readwrite');
    const store = tx.objectStore('knowledge_cards');
    const item = {
      id: uuid(),
      title: card.title,
      essence: card.essence,
      content: card.content,
      category: card.category || '其他',
      tags: card.tags || [],
      source: card.source || '',
      confidence: card.confidence || '推测',
      triggers: card.triggers || '',
      originalQuotes: card.originalQuotes || [],
      status: card.status || 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    store.add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

function getAllCards() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_cards', 'readonly');
    const store = tx.objectStore('knowledge_cards');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

function getCardsByCategory(category) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_cards', 'readonly');
    const store = tx.objectStore('knowledge_cards');
    const index = store.index('category');
    const req = index.getAll(category);
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

function searchCards(query) {
  return getAllCards().then(cards => {
    const q = query.toLowerCase();
    return cards.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.essence.toLowerCase().includes(q) ||
      c.content.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  });
}

function deleteCard(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_cards', 'readwrite');
    const store = tx.objectStore('knowledge_cards');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getDistinctCategories() {
  const cards = await getAllCards();
  const cats = new Set(cards.map(c => c.category));
  return Array.from(cats).sort();
}

function updateCard(id, updates) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_cards', 'readwrite');
    const store = tx.objectStore('knowledge_cards');
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if (!item) return reject(new Error('Not found'));
      Object.assign(item, updates, { updatedAt: Date.now() });
      store.put(item);
      tx.oncomplete = () => resolve(item);
    };
    req.onerror = () => reject(req.error);
  });
}

// --- knowledge_documents ---

function saveDocument(doc) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_documents', 'readwrite');
    const store = tx.objectStore('knowledge_documents');
    const item = {
      id: uuid(),
      title: doc.title || '未命名药瓶',
      summary: doc.summary || '',
      content: doc.content || '',
      sections: doc.sections || [],
      category: doc.category || '其他',
      tags: doc.tags || [],
      source: doc.source || '',
      fileName: doc.fileName || doc.source || '',
      confidence: doc.confidence || '推测',
      triggers: doc.triggers || '',
      originalQuotes: doc.originalQuotes || [],
      wordCount: doc.wordCount || (doc.content ? doc.content.length : 0),
      status: doc.status || 'inbox',
      favorite: doc.favorite || false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    store.add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

function getAllDocuments() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_documents', 'readonly');
    const store = tx.objectStore('knowledge_documents');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

function getDocumentsByCategory(category) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_documents', 'readonly');
    const store = tx.objectStore('knowledge_documents');
    const index = store.index('category');
    const req = index.getAll(category);
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

function searchDocuments(query) {
  return getAllDocuments().then(docs => {
    const q = query.toLowerCase();
    return docs.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      d.tags.some(t => t.toLowerCase().includes(q)) ||
      (d.fileName || '').toLowerCase().includes(q)
    );
  });
}

function deleteDocument(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_documents', 'readwrite');
    const store = tx.objectStore('knowledge_documents');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function updateDocument(id, updates) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('knowledge_documents', 'readwrite');
    const store = tx.objectStore('knowledge_documents');
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if (!item) return reject(new Error('Not found'));
      Object.assign(item, updates, { updatedAt: Date.now() });
      store.put(item);
      tx.oncomplete = () => resolve(item);
    };
    req.onerror = () => reject(req.error);
  });
}

async function toggleDocumentFavorite(id) {
  const docs = await getAllDocuments();
  const doc = docs.find(d => d.id === id);
  if (!doc) throw new Error('Not found');
  return updateDocument(id, { favorite: !doc.favorite });
}

function archiveDocument(id) {
  return updateDocument(id, { status: 'archived' });
}

async function getDocumentsByView(view = 'all', category = '全部') {
  let docs;
  if (category && category !== '全部') {
    docs = await getDocumentsByCategory(category);
  } else {
    docs = await getAllDocuments();
  }

  if (view === 'inbox') {
    return docs.filter(d => (d.status || 'archived') === 'inbox');
  }
  if (view === 'favorites') {
    return docs.filter(d => !!d.favorite);
  }
  return docs;
}

async function getRecentDocuments(limit = 3) {
  const docs = await getAllDocuments();
  return docs
    .filter(d => d.lastOpenedAt || d.favorite)
    .sort((a, b) => (b.lastOpenedAt || b.updatedAt || b.createdAt || 0) - (a.lastOpenedAt || a.updatedAt || a.createdAt || 0))
    .slice(0, limit);
}

async function getDailyReviewDocument(skipId = '') {
  const docs = await getAllDocuments();
  if (!docs.length) return null;

  const ranked = docs
    .filter(d => d.id !== skipId)
    .sort((a, b) => {
      const favoriteScore = Number(!!b.favorite) - Number(!!a.favorite);
      if (favoriteScore !== 0) return favoriteScore;
      const reviewedScore = (a.reviewedAt || 0) - (b.reviewedAt || 0);
      if (reviewedScore !== 0) return reviewedScore;
      return (b.lastOpenedAt || b.createdAt || 0) - (a.lastOpenedAt || a.createdAt || 0);
    });

  return ranked[0] || docs[0];
}

function getAllFromStore(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function exportAllData() {
  const [documents, cards, rawMaterials] = await Promise.all([
    getAllFromStore('knowledge_documents'),
    getAllFromStore('knowledge_cards'),
    getAllFromStore('raw_materials')
  ]);
  return {
    app: '熔炉-知识炼金',
    version: 1,
    exportedAt: new Date().toISOString(),
    documents,
    cards,
    rawMaterials
  };
}

function putMany(storeName, items) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items || []) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function importAllData(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('备份文件格式不正确');
  }

  const documents = (payload.documents || []).map(doc => ({
    ...doc,
    id: doc.id || uuid(),
    status: doc.status || 'archived',
    favorite: !!doc.favorite,
    updatedAt: Date.now()
  }));

  await putMany('knowledge_documents', documents);
  if (Array.isArray(payload.cards)) await putMany('knowledge_cards', payload.cards);
  if (Array.isArray(payload.rawMaterials)) await putMany('raw_materials', payload.rawMaterials);

  return {
    documents: documents.length,
    cards: Array.isArray(payload.cards) ? payload.cards.length : 0,
    rawMaterials: Array.isArray(payload.rawMaterials) ? payload.rawMaterials.length : 0
  };
}

async function getDistinctDocumentCategories() {
  const docs = await getAllDocuments();
  const cats = new Set(docs.map(d => d.category));
  return Array.from(cats).sort();
}

async function migrateLegacyCardsToDocuments() {
  const docs = await getAllDocuments();
  if (docs.length > 0) return;

  const cards = await getAllCards();
  if (cards.length === 0) return;

  const groups = new Map();
  for (const card of cards) {
    const key = card.source || '历史药瓶';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  }

  for (const [source, group] of groups) {
    const sorted = group.sort((a, b) => a.createdAt - b.createdAt);
    const first = sorted[0];
    await saveDocument({
      title: source && source !== '手动投料' ? source.replace(/\.[^.]+$/, '') : first.title,
      summary: first.essence || first.content?.substring(0, 120) || '',
      content: sorted.map(card => `## ${card.title}\n${card.content || card.essence || ''}`).join('\n\n'),
      sections: sorted.map(card => ({
        heading: card.title,
        summary: card.essence,
        content: card.content || card.essence || '',
        keyPoints: [card.essence].filter(Boolean)
      })),
      category: first.category || '其他',
      tags: Array.from(new Set(sorted.flatMap(card => card.tags || []))).slice(0, 8),
      source,
      fileName: source,
      confidence: first.confidence || '推测',
      triggers: first.triggers || '待标注',
      originalQuotes: sorted.flatMap(card => card.originalQuotes || []).slice(0, 8),
      wordCount: sorted.reduce((sum, card) => sum + ((card.content || '').length), 0),
      status: 'migrated'
    });
  }
}
