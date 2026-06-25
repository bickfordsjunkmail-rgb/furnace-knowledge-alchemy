# V8 Daily Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily review card so the app proactively surfaces one saved essence each day.

**Architecture:** Keep the existing home review area. Add storage helpers to rank review candidates from favorites and opened documents, render one "today's review" item, and provide a lightweight "change one" action without changing the document schema beyond optional review metadata.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, IndexedDB.

---

### Task 1: Verification

**Files:**
- Create: `tests/verify-v8-daily-review.mjs`

- [ ] Check storage exposes `getDailyReviewDocument`.
- [ ] Check UI renders `daily-review-card`.
- [ ] Check UI exposes `shuffleDailyReview`.
- [ ] Check opening from daily review records `reviewedAt`.
- [ ] Check cache version is `20260625-v8`.

### Task 2: Storage Ranking

**Files:**
- Modify: `js/storage.js`

- [ ] Add `getDailyReviewDocument(skipId = '')`.
- [ ] Rank favorites first, then recently opened documents, then newest documents.
- [ ] Return `null` when no documents exist.

### Task 3: Home UI

**Files:**
- Modify: `js/ui.js`
- Modify: `css/style.css`

- [ ] Render daily review above recent review list.
- [ ] Add "换一条" action.
- [ ] Add `openDailyReview(id)` to record `reviewedAt` before opening.

### Task 4: Package

**Files:**
- Modify: `index.html`
- Create: `C:\Users\w\Desktop\熔炉-知识炼金-v8.zip`

- [ ] Update cache version to `20260625-v8`.
- [ ] Run all verification scripts and syntax checks.
- [ ] Package v8 without overwriting v7.
