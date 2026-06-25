# Mobile Knowledge Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the smallest useful long-term knowledge workflow: inbox, favorites, stronger search filters, and backup import/export.

**Architecture:** Keep existing IndexedDB stores. Extend `knowledge_documents` with `status` and `favorite` metadata, then add UI controls on the shelf and settings screens. Avoid changing the alchemy animation or document extraction pipeline beyond setting new default metadata.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, IndexedDB, local file download/upload.

---

### Task 1: Lock Behavior With Verification Scripts

**Files:**
- Create: `tests/verify-knowledge-vault-workflow.mjs`

- [ ] Write checks that storage exposes inbox/favorite/backup APIs.
- [ ] Write checks that shelf UI exposes inbox/favorite filters and backup controls.
- [ ] Run the test and confirm it fails before implementation.

### Task 2: Storage Workflow

**Files:**
- Modify: `js/storage.js`

- [ ] Bump `DB_VERSION` to allow future metadata migration.
- [ ] Default new documents to `status: 'inbox'` and `favorite: false`.
- [ ] Add `toggleDocumentFavorite(id)`.
- [ ] Add `archiveDocument(id)` for moving items from inbox into the shelf.
- [ ] Add `getDocumentsByView(view)` supporting `all`, `inbox`, and `favorites`.
- [ ] Add `exportAllData()` and `importAllData(payload)`.

### Task 3: Shelf UI

**Files:**
- Modify: `index.html`
- Modify: `js/ui.js`
- Modify: `css/style.css`

- [ ] Add compact shelf view filters: all, inbox, favorites.
- [ ] Add document-card favorite affordance.
- [ ] Show inbox/favorite metadata on cards.
- [ ] Add detail actions: archive, favorite, delete.
- [ ] Keep mobile layout dense and readable.

### Task 4: Backup UI

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`
- Modify: `css/style.css`

- [ ] Add export backup button in settings.
- [ ] Add import backup file input and button in settings.
- [ ] Wire export to a JSON download.
- [ ] Wire import to load JSON, insert/update documents, and refresh the shelf.

### Task 5: Verification and Packaging

**Files:**
- Modify: `index.html`
- Update: `C:\Users\w\Desktop\熔炉-知识炼金-v6.zip`

- [ ] Update cache version to `20260625-vault`.
- [ ] Run all verification scripts and JS syntax checks.
- [ ] Repackage desktop `v6` zip.
