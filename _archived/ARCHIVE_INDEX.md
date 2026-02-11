# Archive Index

**Purpose:** This directory contains superseded, legacy, or historical documentation and code that is no longer used in active development but preserved for reference.

**Last Updated:** February 11, 2026

---

## Why Files Are Archived

- **Superseded by newer versions** - Documentation consolidated into primary docs
- **Historical reference** - Keep for project history/context
- **Legacy code** - Old implementations kept for reference

---

## What's Archived

### 📚 Docs Subfolder (`_archived/docs/`)

Superseded documentation files:

| File | Reason | Replacement |
|------|--------|------------|
| `MVP_ROADMAP.md` | Superseded by UPDATED_ROADMAP.md with Phase 3A | [UPDATED_ROADMAP.md](../../UPDATED_ROADMAP.md) |
| `CLEANUP_SUMMARY.md` | Consolidated into CHANGELOG.md | [CHANGELOG.md](../../CHANGELOG.md) |
| `PHASE1_COMPLETE.md` | Merged into PHASE1.md | [PHASE1.md](../../PHASE1.md) |
| `PHASE1_SUMMARY.md` | Details in PHASE1.md | [PHASE1.md](../../PHASE1.md) |
| `PHASE1_TESTING.md` | See TESTING.md for current testing guide | [TESTING.md](../../TESTING.md) |
| `PHASE2_IMPLEMENTATION.md` | Consolidated into UPDATED_ROADMAP.md | [UPDATED_ROADMAP.md](../../UPDATED_ROADMAP.md) |
| `IMPLEMENTATION_SUMMARY.md` | Replaced by CHANGELOG.md | [CHANGELOG.md](../../CHANGELOG.md) |
| `REPO_ANALYSIS.md` | Replaced by repository analysis in docs | [Repository docs](../../) |
| `CODING_AGENT_ROADMAP.md` | Old agent instructions | [UPDATED_ROADMAP.md](../../UPDATED_ROADMAP.md) |
| `COPILOT_MVP_COMPARISON.md` | Historical comparison (no longer needed) | N/A |

### 🔧 Legacy Code Subfolder (`_archived/legacy-code/`)

Old implementations preserved for reference:

| File | Purpose | Notes |
|------|---------|-------|
| `app.html` | Original single-user bridge | Legacy entry point (see room.html for current) |
| `app.js` | Original bridge logic (40KB) | Replaced by multi-room system (room.js) |
| `phase1-auth.js` | Phase 1 auth implementation | Replaced by api/auth/* endpoints |
| `phase1-dashboard.js` | Phase 1 dashboard | Replaced by modern dashboard.html |

---

## Active Documentation (Do Not Archive)

These are the primary, current documents:

### 🟢 Configuration & Setup
- `package.json` - Dependencies
- `vercel.json` - Deployment config
- `.env.example` - Environment template

### 🟢 Core Documentation
- `README.md` - Project overview (recommended starting point)
- `CHANGELOG.md` - Version history and changes
- `UPDATED_ROADMAP.md` - Current roadmap (RECOMMENDED - Phase 3A and beyond)
- `PHASE1.md` - Phase 1 specification (reference)
- `ARCHITECTURE.md` - System architecture

### 🟢 Setup & Deployment
- `AUTH_SETUP.md` - Authentication configuration
- `DEPLOYMENT.md` - Deployment instructions
- `CONTRIBUTING.md` - Contribution guidelines

### 🟢 Reference
- `TESTING.md` - Testing strategy
- `ROOM_TYPES_GUIDE.md` - Room configuration options

### 🟢 New Documents (Feb 2026)
- `UPDATED_ROADMAP.md` - Complete roadmap with stabilization complete
- `CHANGELOG.md` - Full version history

---

## Using This Archive

### When to Look Here
- ✅ Historical context ("What was Phase 1 like?")
- ✅ Old implementation reference ("How did the original auth work?")
- ✅ Decision history ("Why did we deprecate this?")

### When NOT to Look Here
- ❌ Current setup instructions (use root README.md)
- ❌ API documentation (use PHASE1.md and api/ code)
- ❌ Roadmap (use UPDATED_ROADMAP.md)
- ❌ Current auth flow (use AUTH_SETUP.md)

---

## Cleanup Summary

### Removed from Root (Moved to _archived/)
- 10 superseded documentation files
- 4 legacy code files
- ~150KB of historical docs
- Build configs (if any existed)

### Root Directory After Cleanup
- **Cleaner structure** with only active files
- **Easier navigation** for new developers
- **Clear documentation hierarchy** with primary docs
- **Legacy code preserved** for reference

### File Size Impact
- **Before:** ~250KB of docs
- **After:** ~100KB in root + ~150KB in _archived
- **Benefit:** Reduced cognitive load, faster navigation

---

## How to Restore

If you need a file from _archived:
1. Copy it from `_archived/docs/` or `_archived/legacy-code/`
2. Review its contents (may be outdated)
3. Check the replacement document listed above
4. Use the replacement unless you need historical context

---

## Future Archiving

For future cleanup, consider archiving:
- Old test reports (test-results/ folder)
- Build artifacts (if any)
- Migration scripts (scripts/ after migrations complete)
- Implementation notes (IMPLEMENTATION_SUMMARY.md type files)

---

## Related Documents

- [CHANGELOG.md](../../CHANGELOG.md) - What changed recently
- [UPDATED_ROADMAP.md](../../UPDATED_ROADMAP.md) - Where we're going
- [README.md](../../README.md) - Project overview
