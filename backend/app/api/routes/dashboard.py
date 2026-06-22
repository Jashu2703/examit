from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, TestResult, TestSession, LeaderboardEntry
from app.schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = db.query(TestResult).filter(TestResult.user_id == current_user.id).all()

    if not results:
        return DashboardStats(
            total_tests=0, avg_score=0, best_score=0,
            total_questions_attempted=0, streak=current_user.streak_count,
            exam_breakdown={}, recent_scores=[], weak_topics_overall=[]
        )

    total_tests = len(results)
    avg_score   = sum(r.percentage for r in results) / total_tests
    best_score  = max(r.percentage for r in results)
    total_qs    = sum(r.correct + r.incorrect + r.unattempted for r in results)

    # Exam breakdown
    exam_breakdown = {}
    for r in results:
        ex = r.exam_type.value
        if ex not in exam_breakdown:
            exam_breakdown[ex] = {"tests": 0, "avg": 0, "best": 0, "scores": []}
        exam_breakdown[ex]["tests"] += 1
        exam_breakdown[ex]["scores"].append(r.percentage)
    for ex, data in exam_breakdown.items():
        scores = data.pop("scores")
        data["avg"]  = round(sum(scores) / len(scores), 1)
        data["best"] = round(max(scores), 1)

    # Recent scores (last 10)
    recent = sorted(results, key=lambda r: r.created_at, reverse=True)[:10]
    recent_scores = [
        {
            "date":       r.created_at.strftime("%d %b"),
            "exam":       r.exam_type.value,
            "percentage": r.percentage,
            "correct":    r.correct,
            "incorrect":  r.incorrect
        }
        for r in reversed(recent)
    ]

    # Aggregate weak topics across all tests
    topic_stats = {}
    for r in results:
        if not r.weak_topics:
            continue
        for wt in r.weak_topics:
            t = wt.get("topic", "")
            if t not in topic_stats:
                topic_stats[t] = {"topic": t, "subject": wt.get("subject",""), "total_score": 0, "count": 0}
            topic_stats[t]["total_score"] += wt.get("score", 0)
            topic_stats[t]["count"] += 1

    weak_topics_overall = sorted(
        [{"topic": k, "subject": v["subject"], "avg_score": round(v["total_score"]/v["count"], 1)}
         for k, v in topic_stats.items()],
        key=lambda x: x["avg_score"]
    )[:10]

    return DashboardStats(
        total_tests=total_tests,
        avg_score=round(avg_score, 1),
        best_score=round(best_score, 1),
        total_questions_attempted=total_qs,
        streak=current_user.streak_count,
        exam_breakdown=exam_breakdown,
        recent_scores=recent_scores,
        weak_topics_overall=weak_topics_overall
    )

@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = db.query(TestResult).filter(
        TestResult.user_id == current_user.id
    ).order_by(TestResult.created_at.desc()).limit(20).all()

    return [
        {
            "result_id":   r.id,
            "session_id":  r.session_id,
            "exam_type":   r.exam_type.value,
            "percentage":  r.percentage,
            "correct":     r.correct,
            "incorrect":   r.incorrect,
            "unattempted": r.unattempted,
            "time_mins":   r.time_taken_mins,
            "percentile":  r.percentile,
            "date":        r.created_at.isoformat()
        }
        for r in results
    ]
