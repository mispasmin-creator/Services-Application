# 🔧 Troubleshooting Guide

## Issue 1: "No Results Found" on All Pages

### ❌ Symptoms:
- All pages show "No [services/offers/utilities] found"
- Loading spinner appears but no data loads
- Console shows errors

### ✅ Solutions:

**Step 1: Check Apps Script URL**
```bash
# .env should have correct deployed URL
cat .env
# Should look like:
# VITE_APPSCRIPT_URL=https://script.google.com/macros/s/AKfycbz.../exec
```

**Step 2: Verify Apps Script is Deployed**
1. Go to: https://script.google.com/home
2. Find your "Service fms" project
3. Click **Deployments**
4. Check for an active web app deployment
5. If none, create new deployment:
   - New Deployment → Type: Web app
   - Execute as: Your account
   - Access: Anyone
   - Copy the URL and update `.env`

**Step 3: Test the API Connection**
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Run this test:
```javascript
fetch('https://script.google.com/macros/s/YOUR_URL/exec?sheet=OFFER')
  .then(r => r.json())
  .then(d => console.log('✅ Connected:', d.data?.length, 'rows'))
  .catch(e => console.error('❌ Error:', e.message))
```

**Step 4: Check Network Requests**
1. Open DevTools → **Network** tab
2. Refresh page (Ctrl+R)
3. Look for requests to `script.google.com`
4. If they show **404** → Apps Script URL is wrong
5. If they show **500** → Google Sheets may have issues
6. If they **timeout** → Network is slow or blocked

**Step 5: Clear Cache and Hard Refresh**
```bash
# In browser:
Ctrl+Shift+Del  # Clear cache
Ctrl+Shift+R    # Hard refresh
```

---

## Issue 2: Slow Data Loading / Timeout

### ❌ Symptoms:
- Page takes 20+ seconds to load data
- "Loading..." spinner spins forever
- Console shows timeout errors

### ✅ Solutions:

**Step 1: Check Network Speed**
- Open DevTools → Network tab
- Watch request times for each sheet
- If any request >10 seconds → Network/server slow

**Step 2: Reduce Data Size** (in Google Sheets)
- Check how many rows each sheet has
- Archive old completed rows to separate sheets
- Fewer rows = faster loading

**Step 3: Increase Timeout**
Edit `src/store/useDataStore.js` line 73:
```javascript
// Change from 20000 to:
const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds
```

**Step 4: Disable Retries** (if still timing out)
Edit line 70:
```javascript
// Change retries from 1 to 0:
const fetchJsonWithRetry = async (url, options = {}, retries = 0, delay = 50) => {
```

**Step 5: Check Google Sheets Health**
1. Open your Google Sheet directly: https://docs.google.com/spreadsheets
2. Try opening the sheet
3. If slow there too → Google Sheets performance issue
4. Try archiving data or splitting into smaller sheets

---

## Issue 3: "Bulk Confirm" or Form Submit Still Slow

### ❌ Symptoms:
- Bulk confirm button takes 5-10 seconds
- Individual form submit slow
- Each cell update takes time

### ✅ Solutions:

**Step 1: Check Network Conditions**
- DevTools → Network → Throttling
- If you set "Slow 3G", disable it for testing

**Step 2: Verify Parallel Updates**
- Watch Network tab during form submit
- Should see 3-5 requests at same time (not one after another)
- If sequential → There's a code issue

**Step 3: Reduce Concurrent Updates**
Edit `src/store/useDataStore.js` line 933 (in updateService):
```javascript
// If still too slow, change from Promise.all to sequential:
for (const u of updatesToMake) {
  await get().saveCell('SERVICE', rowIndex, u.col, u.val);
}
```

**Step 4: Enable Caching**
- Second and subsequent loads should be instant
- First load is slow (expected)
- If all loads slow → Cache not working

---

## Issue 4: Seeing Old/Stale Data

### ❌ Symptoms:
- Data doesn't update after refresh
- Changes don't appear
- Showing old cached data

### ✅ Solutions:

**Step 1: Clear Browser Cache**
```bash
Ctrl+Shift+Del
# Clear: Cookies, Cached images and files
# Time range: All time
```

**Step 2: Clear localStorage**
In browser console (F12):
```javascript
localStorage.clear()
location.reload()
```

**Step 3: Force Fresh Data**
Click the **Refresh** button (🔄) on each page
- This bypasses cache and fetches from Google Sheets

**Step 4: Check Last Sync Time**
In console:
```javascript
console.log(new Date(localStorage.getItem('fms_cache_lastFetch')))
// Should show recent time
```

---

## Issue 5: "Upload Failed" or File Upload Errors

### ❌ Symptoms:
- File upload shows error
- "Invalid file URL" message
- Upload hangs or times out

### ✅ Solutions:

**Step 1: Check File Size**
- Max file size: 10 MB
- Images should be <5 MB
- Try smaller file

**Step 2: Check File Type**
- Allowed: image/*, PDF, DOC, XLS
- Try uploading JPEG (most reliable)

**Step 3: Verify Apps Script Has Drive Access**
1. Open Apps Script: https://script.google.com
2. Go to Project Settings
3. Check "Script ID"
4. Verify the script has Google Drive API enabled

**Step 4: Check FMS Uploads Folder**
- Google Drive → New Folder → Name: "FMS Uploads"
- This folder is where uploads go
- If it doesn't exist, app will create it

---

## Issue 6: Different Users See Different Data

### ❌ Symptoms:
- One user sees all data, another sees nothing
- Some pages blocked for certain users
- Error: "You don't have access"

### ✅ Solutions:

**Step 1: Check User Permissions**
- Go to **Users** page (if you have access)
- Verify user role and firm assignments
- Format: `role:Admin` or `role:User`
- Firm names separated by comma: `Pmmpl, Rkl`

**Step 2: Check Auth Store**
In console:
```javascript
import useAuthStore from './store/useAuthStore.js'
const user = useAuthStore.getState().user
console.log('Current user:', user)
```

**Step 3: Verify Page Access**
- Each page has role restrictions
- If user role doesn't match → Page blocked
- Contact admin to add user to page

---

## Debugging Checklist

- [ ] Apps Script deployed and URL in `.env`
- [ ] Can reach API (test fetch in console)
- [ ] Network requests completing (DevTools Network tab)
- [ ] No 404/500 errors in console
- [ ] Browser cache cleared
- [ ] Hard refresh done (Ctrl+Shift+R)
- [ ] localStorage cleared
- [ ] Google Sheets accessible directly
- [ ] File size <10 MB
- [ ] User role/permissions correct
- [ ] Network speed acceptable (<2 seconds per sheet)

---

## Getting Help

1. **Check Console** (F12 → Console)
   - Look for red error messages
   - Copy full error text

2. **Check Network Tab** (F12 → Network)
   - Look for failed requests (red)
   - Check response status
   - Note timings

3. **Use Console Test**
   - Test API connection (see Issue 1, Step 3)
   - Run cache diagnostics

4. **Provide Information**
   - Error message text
   - Network tab screenshot
   - Browser (Chrome/Firefox/etc)
   - Operating system
   - Steps to reproduce

---

## Quick Commands

**Test API:**
```javascript
fetch('YOUR_URL?sheet=OFFER').then(r=>r.json()).then(d=>console.log(d))
```

**Clear Cache:**
```javascript
localStorage.clear(); location.reload()
```

**Check User:**
```javascript
fetch('.../auth').then(r=>r.json()).then(console.log)
```

**Force Refresh:**
- Click 🔄 button on any page
- Or: `Ctrl+Shift+R` + clear cache

---

**Still stuck?** Check the logs in DevTools Console - they now show detailed [Fetch] messages to help diagnose the issue!
