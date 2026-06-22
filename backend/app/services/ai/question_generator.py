import httpx
import json
import re
from typing import Optional
from app.core.config import settings
from app.services.exam.syllabus import get_exam_config, get_all_topics

HEADERS = {
    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": settings.FRONTEND_URL,
    "X-Title": "ExamIt"
}

def build_question_prompt(
    exam_type: str,
    subject: Optional[str],
    chapter: Optional[str],
    difficulty: str,
    num_questions: int,
    config: dict
) -> str:
    neg = config.get("negative_marking", 0)
    marks = config.get("marks_per_correct", 1)

    scope = ""
    if chapter:
        scope = f"Topic: {chapter} (Subject: {subject})"
    elif subject:
        scope = f"Subject: {subject} — cover a variety of chapters from this subject"
    else:
        scope = f"Cover diverse topics across all subjects for {exam_type}"

    difficulty_guide = {
        "easy":   "straightforward recall and basic application, suitable for beginners",
        "medium": "moderate application and analysis, requires conceptual clarity",
        "hard":   "advanced problem solving, multi-step reasoning, tricky edge cases",
        "mixed":  "mix of easy (30%), medium (50%), and hard (20%) questions"
    }.get(difficulty, "mixed difficulty")

    return f"""You are an expert question paper setter for {config.get('full_name', exam_type)}.

Generate exactly {num_questions} high-quality multiple choice questions.

Exam: {exam_type}
{scope}
Difficulty: {difficulty_guide}
Marks per correct answer: {marks}
Negative marking: {neg} per wrong answer

STRICT RULES:
1. Each question must have exactly 4 options (A, B, C, D)
2. Only ONE option is correct
3. Questions must be factually accurate and exam-relevant
4. No repeated or similar questions
5. Include questions from different chapters if no specific chapter given
6. Questions should match real {exam_type} exam style and standard

Return ONLY a valid JSON array. No explanation, no markdown, no extra text.

JSON format:
[
  {{
    "question": "Full question text here?",
    "options": {{
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    }},
    "correct_answer": "A",
    "subject": "Subject name",
    "chapter": "Chapter/topic name",
    "difficulty": "easy|medium|hard",
    "explanation": "Brief explanation of why the answer is correct"
  }}
]"""

async def generate_questions(
    exam_type: str,
    num_questions: int,
    difficulty: str = "mixed",
    subject: Optional[str] = None,
    chapter: Optional[str] = None,
    model: Optional[str] = None,
    retry_count: int = 0
) -> list[dict]:
    config = get_exam_config(exam_type)
    if not config:
        raise ValueError(f"Unknown exam type: {exam_type}")

    prompt = build_question_prompt(
        exam_type, subject, chapter, difficulty, num_questions, config
    )

    payload = {
        "model": model or settings.OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a competitive exam question setter. You ONLY output valid JSON arrays. Never output anything other than the JSON array."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 4000
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=HEADERS,
                json=payload
            )
            response.raise_for_status()
            data = response.json()

            choice = data.get("choices", [{}])[0]
            message = choice.get("message", {})
            content = message.get("content") or message.get("reasoning") or ""

            if not content:
                # Model returned no usable content (empty, refused, or non-standard shape)
                if retry_count < 1:
                    return await generate_questions(
                        exam_type, num_questions, difficulty,
                        subject, chapter, settings.OPENROUTER_FALLBACK_MODEL,
                        retry_count=retry_count + 1
                    )
                raise ValueError(
                    f"Model returned empty content. Finish reason: {choice.get('finish_reason', 'unknown')}"
                )

            questions = parse_questions(content)

            if not questions and retry_count < 1:
                return await generate_questions(
                    exam_type, num_questions, difficulty,
                    subject, chapter, settings.OPENROUTER_FALLBACK_MODEL,
                    retry_count=retry_count + 1
                )

            return questions[:num_questions]

        except httpx.HTTPStatusError as e:
            try:
                err_body = e.response.json()
                err_msg = err_body.get("error", {}).get("message", e.response.text)
            except Exception:
                err_msg = e.response.text
            if e.response.status_code == 429 and retry_count < 1:
                return await generate_questions(
                    exam_type, num_questions, difficulty,
                    subject, chapter, settings.OPENROUTER_FALLBACK_MODEL,
                    retry_count=retry_count + 1
                )
            raise ValueError(f"OpenRouter error ({e.response.status_code}): {err_msg}")

def parse_questions(content: Optional[str]) -> list[dict]:
    if not content:
        return []
    try:
        # Try direct parse first
        parsed = json.loads(content)
        if isinstance(parsed, list):
            return validate_questions(parsed)
        # Sometimes model wraps in {"questions": [...]}
        for key in ["questions", "data", "items", "mcqs"]:
            if key in parsed and isinstance(parsed[key], list):
                return validate_questions(parsed[key])
    except json.JSONDecodeError:
        pass

    # Fallback: extract JSON array from text
    match = re.search(r'\[.*\]', content, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            return validate_questions(parsed)
        except json.JSONDecodeError:
            pass

    return []

def validate_questions(questions: list) -> list[dict]:
    valid = []
    required = {"question", "options", "correct_answer"}
    for q in questions:
        if not isinstance(q, dict):
            continue
        if not required.issubset(q.keys()):
            continue
        if not isinstance(q.get("options"), dict):
            continue
        if len(q["options"]) != 4:
            continue
        if q.get("correct_answer") not in q["options"]:
            continue
        # Ensure all required fields with defaults
        q.setdefault("subject", "General")
        q.setdefault("chapter", "Mixed")
        q.setdefault("difficulty", "medium")
        q.setdefault("explanation", "")
        valid.append(q)
    return valid