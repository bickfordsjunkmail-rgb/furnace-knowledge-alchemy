# V7 Review Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make saved knowledge easier to revisit by adding essence/original reading modes and a recent-review entry on the home screen.

**Architecture:** Keep the existing static app and IndexedDB store. Add lightweight document metadata (`lastOpenedAt`) when a document is opened, render a compact home review card from recent/favorite documents, and split the detail modal into two client-side modes.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, IndexedDB.

---

### Task 1: Verification

**Files:**
- Create: `tests/verify-v7-review-experience.mjs`

- [ ] Check that detail rendering includes `reading-mode-tabs`, `essence-mode`, and `original-mode`.
- [ ] Check that original mode renders `doc.content`.
- [ ] Check that opening a document records `lastOpenedAt`.
- [ ] Check that home screen has `homeReviewEntry` and UI renders recent review items.
- [ ] Check that cache version is `20260625-v7`.

### Task 2: Detail Reading Modes

**Files:**
- Modify: `js/ui.js`
- Modify: `css/style.css`

- [ ] Add a mode switch at the top of the detail modal.
- [ ] Keep current section card layout inside essence mode.
- [ ] Add original mode containing complete original content and a copy button.
- [ ] Add `UI.switchReadingMode(mode)` and `UI.copyOriginalText(id)`.

### Task 3: Home Recent Review

**Files:**
- Modify: `index.html`
- Modify: `js/storage.js`
- Modify: `js/ui.js`
- Modify: `js/app.js`
- Modify: `css/style.css`

- [ ] Add a `homeReviewEntry` container below the alchemy scene.
- [ ] Add `getRecentDocuments(limit)` in storage.
- [ ] Render recent/favorite documents into the home entry.
- [ ] Update `lastOpenedAt` when opening a document.

### Task 4: Package

**Files:**
- Modify: `index.html`
- Create: `C:\Users\w\Desktop\熔炉-知识炼金-v7.zip`

- [ ] Update cache version to `20260625-v7`.
- [ ] Run all tests and syntax checks.
- [ ] Package v7 without overwriting v6.
