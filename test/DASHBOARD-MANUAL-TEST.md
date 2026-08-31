# Dashboard Manual Browser Test Checklist

**Version:** v0.54.7  
**Date:** 2026-08-30  
**Automated Tests:** 10/10 passing  
**Unit Tests:** 240/240 passing  

## Prerequisites
- ✅ Server running: `npm start` on `http://localhost:3000`
- ✅ Credentials: `KILO_SHARED_SECRET=otario2021` (from .env)
- ✅ Browser: Chrome/Firefox/Safari (open DevTools: F12)

---

## Test Cases

### 1. Dashboard Load
**Expected:** Dashboard appears with no console errors
- [ ] Navigate to `http://localhost:3000/dashboard.html`
- [ ] Page loads completely
- [ ] Open DevTools (F12) → Console tab
- [ ] No red errors in console

### 2. Tab Switching — Redacción (IN_PROGRESS)
**Expected:** Drafts in IN_PROGRESS status load and display
- [ ] Click "Redacción" tab
- [ ] List populates with draft articles
- [ ] Each row shows: slug, title, date, section, status badge
- [ ] Scroll works (31 drafts exist)
- [ ] No JavaScript errors

### 3. Tab Switching — Borradores (Awaiting Approval)
**Expected:** READY drafts that need approval appear
- [ ] Click "Borradores" tab
- [ ] List populates (fewer items than Redacción)
- [ ] Approve button visible for each draft
- [ ] No JavaScript errors

### 4. Tab Switching — Publicados (Published)
**Expected:** Published articles show (may be empty)
- [ ] Click "Publicados" tab
- [ ] List displays (could be empty depending on state)
- [ ] No JavaScript errors

### 5. Draft Creation Flow
**Expected:** Create a new draft successfully
- [ ] Click "Redacción" tab
- [ ] Scroll to bottom, find create form (or look for "New Draft" button)
- [ ] Fill in: title, slug, section, at least one topic
- [ ] Click "Create"
- [ ] Success notification appears (green banner)
- [ ] New draft appears in list
- [ ] No JavaScript errors

### 6. Draft Save/Update Flow
**Expected:** Modify a draft and save changes
- [ ] Click on any draft (from Redacción tab)
- [ ] Draft detail view opens
- [ ] Edit content (title or text)
- [ ] Click "Save" or equivalent
- [ ] Success notification appears
- [ ] Changes persist after page reload
- [ ] No JavaScript errors

### 7. Error Handling — Invalid Input
**Expected:** Form rejects bad input gracefully
- [ ] Try creating a draft without a required field (e.g., no topics)
- [ ] Red error banner appears with specific error message
- [ ] Error does not crash the page
- [ ] Can recover by filling in the field
- [ ] No JavaScript errors

### 8. Audit Log Display
**Expected:** Operations are logged and visible
- [ ] Scroll to bottom of page (or find "Auditoría" section)
- [ ] Audit log displays recent operations
- [ ] Each entry shows: timestamp, operation, article slug
- [ ] List updates when new operations occur
- [ ] No JavaScript errors

### 9. Network Requests (DevTools)
**Expected:** Correct endpoints called with proper auth
- [ ] Open DevTools → Network tab
- [ ] Perform any action (switch tab, create draft, save)
- [ ] Check network requests:
  - [ ] `GET /api/drafts` — called with `x-kilo-secret` header
  - [ ] `GET /api/ready-drafts` — called with auth
  - [ ] `GET /api/audit-log` — called with auth
  - [ ] All return 200 status
  - [ ] No 401 (auth failures) or 404 (missing endpoints)

### 10. Console Cleanliness
**Expected:** No warnings or errors in console
- [ ] Open DevTools → Console tab
- [ ] Filter for **Errors** only (not warnings)
- [ ] Should be empty (no red X icons)
- [ ] No uncaught exceptions

---

## Failure Scenarios (Edge Cases)

### A. Network Down
- [ ] Disconnect internet or disable network in DevTools
- [ ] Refresh dashboard
- [ ] Attempt action (create draft)
- [ ] Error message appears (not blank page or hang)
- [ ] Reconnect → retry → works

### B. Invalid Secret
- [ ] Open DevTools → Network tab
- [ ] Edit an in-flight request's `x-kilo-secret` header to wrong value
- [ ] Observe 401 Unauthorized response
- [ ] Error displayed to user
- [ ] No crash

### C. Rapid Clicks
- [ ] Click "Create" or "Save" button rapidly (5+ times)
- [ ] System handles gracefully (debounce or lock)
- [ ] No duplicate drafts created
- [ ] No 500 errors
- [ ] No console errors

---

## Sign-Off

| Item | Status | Notes |
|------|--------|-------|
| All 10 test cases passed | [ ] | |
| Edge cases handled | [ ] | |
| Console clean (no errors) | [ ] | |
| Network requests correct | [ ] | |
| Tester Name | | |
| Date | | |

---

## Notes

- **Automated tests cover:** Health check, auth protection, endpoint responses, response formatting
- **Manual tests cover:** UI interaction, tab switching, form validation, error display, network behavior
- **Not covered:** Browser-specific bugs (Safari CSS), accessibility (screen readers), performance under load
- **Next steps:** Deploy to YunoHost, monitor production logs
