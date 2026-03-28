# ConnectDot - Fix Frontend JS Error

## Current Issue
```
Uncaught TypeError: Cannot read properties of undefined (reading 'split')
```
**Cause**: `item.filePath` undefined in files list → `undefined.split('/')` crash.

## Steps
- [x] **1. Fix App.jsx filter** → validate `filePath` exists + string
- [x] **2. Rebuild frontend** → `cd frontend && npm run build`
- [ ] **3. Test** → `docker-compose up --build`
- [ ] **4. Verify** → Empty files list renders (no crash)

## Quick Fix
```diff
// frontend/src/App.jsx
{files
- .filter(item => item.id && item.filePath)
+ .filter(item => item.id && item.filePath && typeof item.filePath === 'string')
  .map((item) => (
```

**Expected**: Empty list → "No files available" (no crash). Upload works → files render.
