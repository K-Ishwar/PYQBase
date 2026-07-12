import os
import re
import traceback
from typing import Optional, Dict, List, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
import pdfplumber
try:
    from pdf2image import convert_from_path
    import pytesseract
except ImportError:
    # Will fail at runtime if needed but allows import to succeed
    pass

from app.core.database import async_session_maker
from app.models.ingestion import IngestionStatus, StagedQuestionDb
from app.repositories import ingestion_repo
from app.services.ai_content_service import enrich_batch

# Regex for markdown question extraction
# Looks for "1. Question stem..." or "Q1. Question stem..."
QUESTION_START_REGEX = re.compile(r'^(?:Q)?(\d+)\.\s*(.+)', re.MULTILINE)
# Looks for A., B., A), (A), etc.
OPTION_REGEX = re.compile(r'^[A-D][\.\)]\s*(.+)', re.MULTILINE)
# Looks for "Answer: X" or "Correct: X"
ANSWER_REGEX = re.compile(r'^(?:Answer|Correct(?: Option)?):\s*([A-D])', re.IGNORECASE | re.MULTILINE)

async def process_ingestion_batch(batch_id: UUID, paper_path: str, answer_key_path: Optional[str] = None):
    """
    Background job to process the uploaded files and populate staged_questions.
    """
    async with async_session_maker() as db:
        try:
            batch = await ingestion_repo.get_batch(db, batch_id)
            if not batch:
                return

            ext = os.path.splitext(paper_path)[1].lower()
            
            # 1. Parse Paper
            if ext == '.md':
                staged_questions = parse_markdown_paper(batch_id, paper_path)
            elif ext == '.pdf':
                staged_questions = parse_pdf_paper(batch_id, paper_path)
            else:
                raise ValueError(f"Unsupported paper file type: {ext}")
            
            # 2. Match Answer Key (if provided or inline)
            if answer_key_path:
                answer_key_ext = os.path.splitext(answer_key_path)[1].lower()
                answer_map = parse_answer_key(answer_key_path, answer_key_ext)
                staged_questions = match_answer_key(staged_questions, answer_map)
            else:
                # Attempt to extract inline answers (handled inside parse_markdown_paper)
                staged_questions = match_inline_answers(staged_questions)

            # 3. Save to database
            await ingestion_repo.add_staged_questions(db, staged_questions)
            
            # 4. Update batch status
            batch.total_questions = len(staged_questions)
            batch.status = IngestionStatus.parsed
            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.parsed)
            
            # 5. Trigger AI Enrichment asynchronously
            asyncio.create_task(enrich_batch(batch_id))
            
        except Exception as e:
            error_msg = f"Failed to parse paper: {str(e)}\n{traceback.format_exc()}"
            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.failed, error_log=error_msg)


def parse_markdown_paper(batch_id: UUID, paper_path: str) -> List[StagedQuestionDb]:
    with open(paper_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    return extract_questions_from_text(batch_id, content)

def parse_pdf_paper(batch_id: UUID, paper_path: str) -> List[StagedQuestionDb]:
    text_content = ""
    is_scanned = False
    
    # Try pdfplumber first
    with pdfplumber.open(paper_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_content += page_text + "\n"
                
    # If text is suspiciously short, it might be a scanned PDF
    if len(text_content.strip()) < 100 * len(pdfplumber.open(paper_path).pages):
        is_scanned = True
        text_content = ""
        try:
            pages = convert_from_path(paper_path)
            for page in pages:
                text_content += pytesseract.image_to_string(page) + "\n"
        except Exception as e:
            raise RuntimeError(f"OCR failed. Please ensure Poppler and Tesseract are installed. Error: {e}")

    questions = extract_questions_from_text(batch_id, text_content)
    
    # Adjust confidence based on whether we had to OCR
    for q in questions:
        if is_scanned:
            # Drop confidence for OCR
            q.parse_confidence = q.parse_confidence * 0.85
            if q.parse_confidence < 0.90:
                q.review_status = "needs_edit"
                
    return questions

def extract_questions_from_text(batch_id: UUID, text: str) -> List[StagedQuestionDb]:
    """
    Splits raw text into question objects using regex heuristics.
    """
    questions = []
    
    # Split text by "1. " or "Q1. "
    parts = re.split(r'^(?:Q)?(\d+)\.\s*', text, flags=re.MULTILINE)
    
    # parts[0] is preamble, then [num, content, num, content...]
    if len(parts) > 1:
        for i in range(1, len(parts), 2):
            q_num_str = parts[i]
            q_content = parts[i+1]
            
            try:
                q_num = int(q_num_str)
            except ValueError:
                continue
                
            # Extract options A, B, C, D
            option_matches = list(re.finditer(r'^[A-D][\.\)]\s*', q_content, flags=re.MULTILINE))
            
            options_dict = {}
            stem = q_content
            
            if len(option_matches) > 0:
                stem = q_content[:option_matches[0].start()].strip()
                
                for j, match in enumerate(option_matches):
                    opt_letter = match.group().strip()[0].upper() # 'A', 'B', etc.
                    
                    start_idx = match.end()
                    if j + 1 < len(option_matches):
                        end_idx = option_matches[j+1].start()
                        opt_text = q_content[start_idx:end_idx].strip()
                    else:
                        # For the last option, check if there's an Answer section after
                        ans_match = ANSWER_REGEX.search(q_content[start_idx:])
                        if ans_match:
                            end_idx = start_idx + ans_match.start()
                            opt_text = q_content[start_idx:end_idx].strip()
                        else:
                            opt_text = q_content[start_idx:].strip()
                            
                    options_dict[opt_letter] = opt_text

            # Inline answer check
            inline_ans = None
            ans_match = ANSWER_REGEX.search(q_content)
            if ans_match:
                inline_ans = ans_match.group(1).upper()
            
            # Confidence heuristics
            confidence = 1.0
            if len(options_dict) != 4:
                confidence -= 0.2
            if not stem:
                confidence -= 0.5
            
            review_status = "pending"
            if confidence < 0.90:
                review_status = "needs_edit"
                
            questions.append(StagedQuestionDb(
                batch_id=batch_id,
                question_number=q_num,
                raw_question_stem=stem,
                raw_options=options_dict,
                correct_option=inline_ans, # Temporary holding, might be overwritten by answer key
                matched_from_answer_key=True if inline_ans else False, # Count inline as matched for now
                parse_confidence=confidence,
                review_status=review_status
            ))
            
    return questions

def parse_answer_key(file_path: str, ext: str) -> Dict[int, str]:
    """
    Parses a standalone answer key into a mapping of {question_number: correct_option}.
    """
    answer_map = {}
    
    text_content = ""
    if ext == '.md' or ext == '.txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            text_content = f.read()
    elif ext == '.pdf':
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t: text_content += t + "\n"
                
    # Look for "1-A", "1. A", "1 A", etc.
    matches = re.finditer(r'(\d+)\s*[-.]*\s*([A-D])', text_content, flags=re.IGNORECASE)
    for match in matches:
        q_num = int(match.group(1))
        opt = match.group(2).upper()
        answer_map[q_num] = opt
        
    return answer_map

def match_answer_key(questions: List[StagedQuestionDb], answer_map: Dict[int, str]) -> List[StagedQuestionDb]:
    for q in questions:
        if q.question_number in answer_map:
            q.correct_option = answer_map[q.question_number]
            q.matched_from_answer_key = True
        else:
            q.correct_option = None
            q.matched_from_answer_key = False
            q.review_status = "needs_edit"
            q.reviewer_notes = "Missing from answer key"
            
    return questions

def match_inline_answers(questions: List[StagedQuestionDb]) -> List[StagedQuestionDb]:
    for q in questions:
        if not q.correct_option:
            q.matched_from_answer_key = False
            q.review_status = "needs_edit"
            q.reviewer_notes = "No inline answer found"
    return questions
