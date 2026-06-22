import httpx
import json
from app.core.config import settings

HEADERS = {
    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": settings.FRONTEND_URL,
    "X-Title": "ExamIt"
}

async def generate_ai_coach_report(
    exam_type: str,
    score: float,
    max_score: float,
    percentage: float,
    correct: int,
    incorrect: int,
    unattempted: int,
    topic_accuracy: dict,
    time_analysis: dict,
    weak_topics: list
) -> str:
    weak_list = "\n".join([
        f"- {t['topic']} ({t['subject']}): {t['score']}% accuracy"
        for t in weak_topics[:8]
    ])

    topic_summary = "\n".join([
        f"- {topic}: {data['correct']}/{data['total']} correct ({data['pct']:.0f}%)"
        for topic, data in list(topic_accuracy.items())[:10]
    ])

    prompt = f"""You are an expert AI coach for Indian competitive exams.

A student just completed a {exam_type} mock test. Analyse their performance and give personalised coaching.

PERFORMANCE DATA:
- Score: {score}/{max_score} ({percentage:.1f}%)
- Correct: {correct} | Incorrect: {incorrect} | Unattempted: {unattempted}
- Avg time per question: {time_analysis.get('avg_time_secs', 0):.0f} seconds

TOPIC-WISE ACCURACY:
{topic_summary}

WEAKEST TOPICS:
{weak_list}

Write a personalised coaching report in this EXACT structure:

## Overall Assessment
2-3 sentences on overall performance. Be honest but encouraging.

## 🔴 Critical Weak Areas (Fix These First)
List top 3 weakest topics with specific advice on what to study.

## 🟡 Topics Needing Improvement
List 2-3 topics with moderate weakness and how to improve.

## ✅ Strong Areas
Mention 1-2 topics where student performed well.

## ⏱ Time Management
Specific feedback on time spent. Flag if too slow or too fast.

## 📅 Study Plan for Next 7 Days
Day-wise specific study plan targeting weak areas.

## 🎯 Next Test Recommendation
What type of test to take next and why.

Keep it concise, specific, and actionable. No generic advice."""

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": "You are an expert exam coach. Give specific, actionable advice."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.6,
        "max_tokens": 1500
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=HEADERS,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception:
            return generate_fallback_report(percentage, weak_topics)

async def generate_solutions(questions: list, user_answers: dict) -> dict:
    solutions = {}
    wrong_qs = [
        (i, q) for i, q in enumerate(questions)
        if str(i) not in user_answers or user_answers[str(i)] != q["correct_answer"]
    ][:10]  # explain top 10 wrong answers

    if not wrong_qs:
        return solutions

    qs_text = "\n\n".join([
        f"Q{i+1}: {q['question']}\nCorrect Answer: {q['correct_answer']}) {q['options'][q['correct_answer']]}\nUser answered: {user_answers.get(str(idx), 'Not attempted')}"
        for i, (idx, q) in enumerate(wrong_qs)
    ])

    prompt = f"""Explain the correct answers for these exam questions briefly.

{qs_text}

Return ONLY a JSON object mapping question index to explanation:
{{"0": {{"explanation": "...", "trick": "..."}}, "1": {{...}}}}

Keep each explanation under 60 words. Include a shortcut trick where applicable."""

    payload = {
        "model": settings.OPENROUTER_FALLBACK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 2000
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=HEADERS,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            # Re-map back to original indices
            for list_idx, (orig_idx, q) in enumerate(wrong_qs):
                if str(list_idx) in parsed:
                    solutions[str(orig_idx)] = parsed[str(list_idx)]
                    solutions[str(orig_idx)]["correct_answer"] = q["correct_answer"]
                    solutions[str(orig_idx)]["correct_text"] = q["options"][q["correct_answer"]]
        except Exception:
            for orig_idx, q in wrong_qs:
                solutions[str(orig_idx)] = {
                    "explanation": q.get("explanation", "Refer to study material."),
                    "trick": "",
                    "correct_answer": q["correct_answer"],
                    "correct_text": q["options"][q["correct_answer"]]
                }

    return solutions

def generate_fallback_report(percentage: float, weak_topics: list) -> str:
    level = "good" if percentage >= 70 else "average" if percentage >= 50 else "needs improvement"
    weak = ", ".join([t["topic"] for t in weak_topics[:3]]) if weak_topics else "multiple areas"
    return f"""## Overall Assessment
Your performance is {level} at {percentage:.1f}%. Focus on consistency and targeted practice.

## 🔴 Critical Weak Areas
Focus immediately on: {weak}. Revise fundamentals before attempting more questions.

## 📅 Study Plan
Spend 2 hours daily on weak topics. Take a chapter test every 2 days to track progress.

## 🎯 Next Test Recommendation
Take a subject-specific test focusing on your weakest subject first."""
