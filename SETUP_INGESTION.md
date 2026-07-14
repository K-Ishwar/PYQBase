# Setup Guide - Bulk Content Ingestion

This guide will help you fix the bulk content ingestion feature that's currently showing "An error occurred during upload" error.

## Issues Fixed

✅ Missing repository import
✅ Poor error handling
✅ Missing logging
✅ Invalid API key validation
✅ File validation
✅ Database connection checks

## Prerequisites

Before starting, you need:

1. **GROQ API Key** - For AI content enrichment
2. **Database connection** - PostgreSQL with proper tables
3. **Python environment** - With all dependencies installed

---

## Step 1: Get GROQ API Key

The current API key in `.env` is a placeholder and will not work.

### How to get a real API key:

1. Visit: **https://console.groq.com/keys**
2. Create an account or log in
3. Click "Create API Key"
4. Copy the API key

### Update your `.env` file:

Open: `c:\Hackthons\PYQBase\pyqbase\backend\.env`

Replace:
```env
GROQ_API_KEY="placeholder_groq_key"
```

With:
```env
GROQ_API_KEY="gsk_your_actual_api_key_here"
```

**Note:** GROQ API keys typically start with `gsk_`

---

## Step 2: Run Database Migrations

The ingestion tables don't exist in your database yet.

### Run the migration script:

```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
python run_migrations.py
```

This will:
- Create `ingestion_batches` table
- Create `staged_questions` table  
- Create required ENUM types
- Set up all indexes

**Expected output:**
```
✅ All migrations completed successfully!
```

---

## Step 3: Verify Configuration

Run the diagnostic tool to check everything is working:

```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
python diagnose_ingestion.py
```

**Expected output:**
```
✅ Configuration looks good!
✓ Database connection successful
```

If you see any ❌ errors, fix them before proceeding.

---

## Step 4: Restart Backend Server

After updating configuration and running migrations, restart your FastAPI server:

```bash
cd c:\Hackthons\PYQBase\pyqbase\backend
uvicorn app.main:app --reload
```

Or however you normally start the server.

---

## Step 5: Test Upload

Now try uploading content through the admin panel.

### Supported File Formats:
- **Paper file:** `.md`, `.pdf`, `.txt`
- **Answer key:** `.md`, `.pdf`, `.txt` (optional)

### Question Format (for Markdown/Text files):

```markdown
1. What is the capital of France?
A. London
B. Paris
C. Berlin
D. Madrid
Answer: B

2. Which planet is closest to the Sun?
A. Venus
B. Mercury
C. Earth
D. Mars
Answer: B
```

### PDF Files:
- Native text PDFs work best
- Scanned PDFs require Tesseract OCR (may need installation)

---

## Monitoring Upload Progress

### Method 1: Check in Admin Panel
The admin panel should show batch status

### Method 2: Use Diagnostic Tool
```bash
python diagnose_ingestion.py
```

This shows:
- Recent uploads
- Current status (parsing/parsed/reviewing/completed/failed)
- Error logs if failed
- Question counts

### Method 3: API Endpoint
```bash
GET /api/v1/ingestion/batches/{batch_id}
```

---

## Upload Process Flow

1. **Upload** (Immediate)
   - Files saved to disk
   - Batch record created with status="parsing"
   - Background task triggered
   - Response: `{"batch_id": "...", "status": "parsing"}`

2. **Parsing** (Background - 5-30 seconds)
   - Extract questions from paper
   - Match with answer key
   - Save to staged_questions
   - Status changes to "parsed"

3. **AI Enrichment** (Background - 1-5 minutes)
   - Paraphrase questions (avoid copyright)
   - Generate explanations
   - Classify taxonomy
   - Status changes to "reviewing"

4. **Review** (Manual)
   - Admin reviews questions
   - Approve/reject/edit
   - Publish to production

---

## Common Errors and Solutions

### Error: "GROQ_API_KEY is not configured"
**Cause:** Missing or placeholder API key
**Solution:** Update `.env` with real API key from console.groq.com

### Error: "relation 'ingestion_batches' does not exist"
**Cause:** Database migrations not run
**Solution:** Run `python run_migrations.py`

### Error: "Invalid paper file format"
**Cause:** Uploaded unsupported file type
**Solution:** Use .md, .pdf, or .txt files

### Error: "No questions were extracted from the paper"
**Cause:** File format doesn't match expected structure
**Solution:** 
- Check questions are numbered: "1.", "2.", etc.
- Options are labeled: "A.", "B.", "C.", "D."
- For PDFs, ensure text is extractable (not just images)

### Error: "Failed Similarity Gate"
**Cause:** AI paraphrase too similar to original (copyright concern)
**Solution:** 
- This is automatic, questions marked "needs_edit"
- Admin can manually rephrase and approve

---

## File Locations

```
pyqbase/backend/
├── app/
│   ├── api/v1/ingestion_router.py     # Upload endpoint
│   ├── services/
│   │   ├── ingestion_service.py       # File parsing
│   │   └── ai_content_service.py      # AI enrichment
│   ├── repositories/ingestion_repo.py  # Database operations
│   └── models/ingestion.py            # Data models
├── uploads/                           # Uploaded files stored here
├── migrations/
│   └── 004_ingestion_pipeline.sql    # DB schema
├── diagnose_ingestion.py              # Diagnostic tool
└── run_migrations.py                  # Migration runner
```

---

## Testing Checklist

- [ ] GROQ API key updated in `.env`
- [ ] Database migrations run successfully
- [ ] Diagnostic tool shows ✅ Configuration looks good
- [ ] Backend server restarted
- [ ] Test upload with sample MD file
- [ ] Check batch status after upload
- [ ] Verify questions appear in staged_questions
- [ ] Test batch approval and publishing

---

## Sample Test File

Create `test_paper.md`:

```markdown
1. Python was created by?
A. James Gosling
B. Guido van Rossum
C. Dennis Ritchie
D. Bjarne Stroustrup
Answer: B

2. Which of these is NOT a Python data type?
A. List
B. Dictionary
C. Array
D. Tuple
Answer: C

3. What is the output of: print(type([]))
A. <class 'list'>
B. <class 'array'>
C. <class 'dict'>
D. <class 'tuple'>
Answer: A
```

Upload this through the admin panel to test.

---

## Need Help?

If you're still having issues:

1. Run the diagnostic tool: `python diagnose_ingestion.py`
2. Check the error log in the output
3. Check backend server logs
4. Check database batch records for error_log field

---

## What Changed?

### Files Modified:
1. `app/repositories/__init__.py` - Fixed import
2. `app/api/v1/ingestion_router.py` - Better error handling
3. `app/services/ingestion_service.py` - Added logging
4. `app/services/ai_content_service.py` - API key validation

### Files Created:
1. `diagnose_ingestion.py` - Diagnostic tool
2. `run_migrations.py` - Migration runner
3. `INGESTION_DEBUG_REPORT.md` - Detailed debug info
4. `SETUP_INGESTION.md` - This setup guide

---

## Next Steps After Setup

Once ingestion is working:

1. **Upload past papers** - Bulk upload historical exam papers
2. **Review questions** - Use admin panel to review and approve
3. **Publish** - Make approved questions available to users
4. **Monitor** - Use diagnostic tool to track progress

Good luck! 🚀
