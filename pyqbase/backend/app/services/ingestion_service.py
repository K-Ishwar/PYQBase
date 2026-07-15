import asyncio
import os
import re
import traceback
import logging
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
from app.models.ingestion import IngestionStatus, StagedQuestionDb, ReviewStatus
from app.repositories import ingestion_repo
from app.services.ai_content_service import enrich_batch

# Setup logger
logger = logging.getLogger(__name__)

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
            logger.info(f"Starting ingestion batch processing for batch_id={batch_id}")
            batch = await ingestion_repo.get_batch(db, batch_id)
            if not batch:
                logger.error(f"Batch {batch_id} not found in database")
                return

            # Validate file exists
            if not os.path.exists(paper_path):
                raise FileNotFoundError(f"Paper file not found: {paper_path}")
            
            ext = os.path.splitext(paper_path)[1].lower()
            logger.info(f"Processing file with extension: {ext}")
            
            # 1. Parse Paper
            if ext == '.md':
                staged_questions = parse_markdown_paper(batch_id, paper_path)
            elif ext == '.pdf':
                staged_questions = parse_pdf_paper(batch_id, paper_path)
            else:
                raise ValueError(f"Unsupported paper file type: {ext}")
            
            logger.info(f"Parsed {len(staged_questions)} questions from paper")
            
            # 2. Match Answer Key (if provided or inline)
            if answer_key_path:
                if not os.path.exists(answer_key_path):
                    logger.warning(f"Answer key file not found: {answer_key_path}")
                else:
                    answer_key_ext = os.path.splitext(answer_key_path)[1].lower()
                    answer_map = parse_answer_key(answer_key_path, answer_key_ext)
                    logger.info(f"Parsed {len(answer_map)} answers from answer key")
                    staged_questions = match_answer_key(staged_questions, answer_map)
            else:
                # Attempt to extract inline answers (handled inside parse_markdown_paper)
                staged_questions = match_inline_answers(staged_questions)
                
            # Renumber questions sequentially based on chronological order (oldest to newest)
            # We do this AFTER answer key matching so the original parsed question numbers 
            # successfully match the answer key document first.
            staged_questions.sort(key=lambda q: q.year or batch.year or 9999)
            for idx, q in enumerate(staged_questions, start=1):
                q.question_number = idx

            # 3. Save to database
            if not staged_questions:
                raise ValueError("No questions were extracted from the paper. Please check the file format.")
                
            await ingestion_repo.add_staged_questions(db, staged_questions)
            logger.info(f"Saved {len(staged_questions)} staged questions to database")
            
            # 4. Update batch status
            batch.total_questions = len(staged_questions)
            batch.status = IngestionStatus.parsed
            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.parsed)
            
        except Exception as e:
            error_msg = f"Failed to parse paper: {str(e)}\n{traceback.format_exc()}"
            logger.error(f"Batch processing failed: {error_msg}")
            await ingestion_repo.update_batch_status(db, batch_id, IngestionStatus.failed, error_log=error_msg)
            return

    # AI Enrichment is no longer triggered automatically.
    # It must be triggered manually via the POST /batches/{batch_id}/run-ai API endpoint.
    logger.info(f"Batch {batch_id} parsing complete. Waiting for manual AI enrichment trigger.")


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
                # Ensure the OCR result is treated as a string to satisfy type checkers
                text_content += str(pytesseract.image_to_string(page)) + "\n"
        except Exception as e:
            raise RuntimeError(f"OCR failed. Please ensure Poppler and Tesseract are installed. Error: {e}")

    questions = extract_questions_from_text(batch_id, text_content)
    
    # Adjust confidence based on whether we had to OCR
    for q in questions:
        if is_scanned:
            # Drop confidence for OCR
            q.parse_confidence = q.parse_confidence * 0.85
            if q.parse_confidence < 0.90:
                q.review_status = ReviewStatus.needs_edit
                
    return questions

def extract_questions_from_text(batch_id: UUID, text: str) -> List[StagedQuestionDb]:
    """
    Splits raw text into question objects using regex heuristics.
    """
    questions = []
    
    # Strictly match headers OR 'Question 1', 'Q1.', '1.', etc.
    # Group 3 captures digits after 'Question'/'Q' with optional punctuation.
    # Group 4 captures standalone digits with mandatory punctuation.
    pattern = r'^(?:(#{1,6})\s+([^\n]+)|(?:Question\s+|Q)(\d+)(?:[\.\:\]\)]|\s*\\\.)?\s*\n*|(\d+)(?:[\.\:\]\)]|\s*\\\.)\s+)'
    matches = list(re.finditer(pattern, text, flags=re.MULTILINE | re.IGNORECASE))
    
    active_headers = {}
    
    for i in range(len(matches)):
        match = matches[i]
        
        if match.group(1):
            # It's a header!
            level = len(match.group(1))
            header_text = match.group(2).strip()
            
            # Extract year if present
            year_match = re.search(r'\b(20\d{2}|19\d{2})\b', header_text)
            year = int(year_match.group(1)) if year_match else None
            
            # Remove deeper headers and add this one
            active_headers = {k: v for k, v in active_headers.items() if k < level}
            active_headers[level] = (header_text, year)
            continue
            
        # If we reach here, it's a question
        q_num_str = match.group(3) or match.group(4)
        
        start_idx = match.end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
        q_content = text[start_idx:end_idx]
            
        try:
            q_num = int(q_num_str)
        except ValueError:
            continue
            
        # Extract options A, B, C, D or (a), (b), (c), (d)
        # Group 1 captures A. or A), Group 2 captures (a) or (A)
        option_matches = list(re.finditer(r'(?:(?:^|\s)([A-Da-d])[\.\)]\s*|\(([A-Da-d])\)\s*)', q_content, flags=re.MULTILINE))
        
        options_dict = {}
        stem = q_content
        
        if len(option_matches) > 0:
            stem = q_content[:option_matches[0].start()].strip()
            
            for j, match in enumerate(option_matches):
                opt_letter = (match.group(1) or match.group(2)).upper() # 'A', 'B', etc.
                
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
        
        review_status = ReviewStatus.pending
        if confidence < 0.90:
            review_status = ReviewStatus.needs_edit
            
        # Resolve Context and Year
        context_str = ' > '.join([v[0] for k, v in sorted(active_headers.items())])
        years = [v[1] for k, v in sorted(active_headers.items()) if v[1] is not None]
        q_year = years[-1] if years else None
            
        questions.append(StagedQuestionDb(
            batch_id=batch_id,
            question_number=q_num,
            year=q_year,
            header_context=context_str if context_str else None,
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
            q.review_status = ReviewStatus.needs_edit
            q.reviewer_notes = "Missing from answer key"
            
    return questions

def match_inline_answers(questions: List[StagedQuestionDb]) -> List[StagedQuestionDb]:
    for q in questions:
        if not q.correct_option:
            q.matched_from_answer_key = False
            q.review_status = ReviewStatus.needs_edit
            q.reviewer_notes = "No inline answer found"
    return questions
