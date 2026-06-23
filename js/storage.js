/* ============================================
   storage.js — IndexedDB 存储层
   ============================================ */

const DB_NAME = 'AlchemyFurnace';
const DB_VERSION = 1;

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
