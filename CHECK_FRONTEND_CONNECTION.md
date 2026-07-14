# Frontend Connection Check

## Backend is Running ✅

Your terminal shows:
```
INFO:     127.0.0.1:56472 - "GET /health HTTP/1.1" 200 OK
```

This means backend is working and responding!

---

## But Frontend Can't Connect ❌

"Cannot connect to backend server" means the frontend is NOT reaching the backend.

### Possible Causes:

1. **Frontend hasn't restarted** with new configuration
2. **Browser cache** has old configuration
3. **CORS preflight** is failing
4. **Frontend is using cached API client**

---

## FIX IT NOW:

### Step 1: COMPLETELY Stop Frontend
```bash
# In frontend terminal:
Press Ctrl+C
Press Ctrl+C again (make sure it's fully stopped)
```

### Step 2: Clear Browser Cache
1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files"
3. Clear

Or just press `Ctrl+F5` to hard reload

### Step 3: Restart Frontend
```bash
cd c:\Hackthons\PYQBase\pyqbase\frontend
npm run dev
```

### Step 4: Check Browser Console
1. Go to http://localhost:3000/admin/ingestion
2. Press `F12` (Open Developer Tools)
3. Go to Console tab
4. Try upload
5. Look for errors

You should see:
```
API Request: {
  method: "POST",
  url: "http://127.0.0.1:8000/api/v1/admin/ingestion/upload",
  ...
}
```

If you DON'T see this, frontend hasn't loaded new code.

---

## Debug in Browser Console

Open Console (F12) and type:

```javascript
// Check API URL
console.log(process.env.NEXT_PUBLIC_API_URL)

// Try fetch manually
fetch('http://127.0.0.1:8000/health')
  .then(r => r.json())
  .then(d => console.log('SUCCESS:', d))
  .catch(e => console.log('ERROR:', e))
```

---

## If Still Failing:

### Check Network Tab:
1. Press `F12`
2. Go to "Network" tab
3. Try upload
4. Look for request to `/api/v1/admin/ingestion/upload`

**If you see it:**
- Click on it
- Check Status
- Check Response
- Share screenshot

**If you DON'T see it:**
- Frontend code hasn't reloaded
- Kill frontend process completely
- Restart: `npm run dev`

---

## Quick Test:

Open in browser WHILE BACKEND IS RUNNING:

1. **http://127.0.0.1:8000/health** 
   - Should work ✅

2. **http://localhost:3000/upload-test.html**
   - Run all tests
   - All should be ✅

If Test 3 on upload-test.html shows "✅ CONNECTION WORKS", then the issue is in your app's authentication or API client initialization.

---

## Nuclear Option (If Nothing Works):

1. Stop both servers
2. Delete frontend `.next` folder:
   ```bash
   cd c:\Hackthons\PYQBase\pyqbase\frontend
   rmdir /s /q .next
   ```
3. Restart frontend:
   ```bash
   npm run dev
   ```
4. Hard reload browser: `Ctrl+Shift+R`

This clears all Next.js cache.

---

## Most Likely Issue:

**Frontend hasn't restarted** with the new `127.0.0.1` configuration.

Do this:
1. Stop frontend (Ctrl+C)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Start frontend (`npm run dev`)
4. Hard reload page (Ctrl+F5)
5. Try upload

Should work! 🚀
