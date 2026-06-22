from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, LeaderboardEntry, ExamType
from datetime import datetime

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

@router.get("/{exam_type}")
def get_leaderboard(
    exam_type: ExamType,
    period: str = Query("all", enum=["all", "weekly"]),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(
        LeaderboardEntry.user_id,
        User.username,
        func.max(LeaderboardEntry.percentage).label("best_pct"),
        func.max(LeaderboardEntry.score).label("best_score"),
        func.count(LeaderboardEntry.id).label("tests_taken")
    ).join(User, User.id == LeaderboardEntry.user_id).filter(
        LeaderboardEntry.exam_type == exam_type
    )

    if period == "weekly":
        now = datetime.utcnow()
        query = query.filter(
            LeaderboardEntry.week_number == now.isocalendar()[1],
            LeaderboardEntry.year == now.year
        )

    rows = query.group_by(
        LeaderboardEntry.user_id, User.username
    ).order_by(desc("best_pct")).limit(limit).all()

    board = []
    user_rank = None
    for i, row in enumerate(rows, 1):
        entry = {
            "rank":        i,
            "username":    row.username,
            "best_score":  round(row.best_pct, 1),
            "tests_taken": row.tests_taken,
            "is_you":      row.user_id == current_user.id
        }
        board.append(entry)
        if row.user_id == current_user.id:
            user_rank = i

    return {"leaderboard": board, "your_rank": user_rank, "exam": exam_type.value, "period": period}
