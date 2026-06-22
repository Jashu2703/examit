from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, TestSession, TestResult, LeaderboardEntry, SessionStatus
from app.schemas.schemas import StartTestRequest, SubmitTestRequest, SessionOut, ResultOut
from app.services.ai.question_generator import generate_questions
from app.services.ai.coach import generate_ai_coach_report, generate_solutions
from app.services.exam.scoring import calculate_score, calculate_percentile
from app.services.exam.syllabus import get_exam_config
import datetime as dt

router = APIRouter(prefix="/tests", tags=["Tests"])

@router.post("/start", response_model=SessionOut)
async def start_test(
    payload: StartTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = get_exam_config(payload.exam_type.value)
    if not config:
        raise HTTPException(status_code=400, detail="Invalid exam type")

    # Validate subject/chapter
    subjects = config.get("subjects", {})
    if payload.subject and payload.subject not in subjects:
        raise HTTPException(status_code=400, detail=f"Invalid subject for {payload.exam_type}")
    if payload.chapter and payload.subject:
        chapters = subjects.get(payload.subject, [])
        if payload.chapter not in chapters:
            raise HTTPException(status_code=400, detail="Invalid chapter for this subject")

    # Cap questions to reasonable limits
    num_q = min(max(payload.num_questions, 5), 50)

    # Generate questions via AI
    try:
        questions = await generate_questions(
            exam_type=payload.exam_type.value,
            num_questions=num_q,
            difficulty=payload.difficulty.value,
            subject=payload.subject,
            chapter=payload.chapter
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Question generation failed: {str(e)}")

    if not questions:
        raise HTTPException(status_code=503, detail="Could not generate questions. Try again.")

    session = TestSession(
        user_id=current_user.id,
        exam_type=payload.exam_type,
        mode=payload.mode,
        subject=payload.subject,
        chapter=payload.chapter,
        difficulty=payload.difficulty,
        num_questions=len(questions),
        duration_mins=payload.duration_mins,
        status=SessionStatus.ACTIVE,
        questions=questions,
        started_at=datetime.now(timezone.utc)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/submit", response_model=ResultOut)
async def submit_test(
    payload: SubmitTestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(TestSession).filter(
        TestSession.id == payload.session_id,
        TestSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Test already submitted or not active")

    now = datetime.now(timezone.utc)
    time_taken = (now - session.started_at).total_seconds() / 60

    # Calculate score
    score_data = calculate_score(
        exam_type=session.exam_type.value,
        questions=session.questions,
        answers=payload.answers,
        time_per_q=payload.time_per_q
    )

    # Percentile vs all users for this exam
    all_scores = [
        r.percentage for r in
        db.query(TestResult).filter(TestResult.exam_type == session.exam_type).all()
    ]
    percentile = calculate_percentile(score_data["percentage"], all_scores)

    # Update session
    session.status = SessionStatus.COMPLETED
    session.answers = payload.answers
    session.time_per_q = payload.time_per_q
    session.submitted_at = now

    # Create result
    result = TestResult(
        session_id=session.id,
        user_id=current_user.id,
        exam_type=session.exam_type,
        raw_score=score_data["raw_score"],
        max_score=score_data["max_score"],
        percentage=score_data["percentage"],
        correct=score_data["correct"],
        incorrect=score_data["incorrect"],
        unattempted=score_data["unattempted"],
        time_taken_mins=round(time_taken, 2),
        topic_accuracy=score_data["topic_accuracy"],
        weak_topics=score_data["weak_topics"],
        time_analysis=score_data["time_analysis"],
        percentile=percentile
    )
    db.add(result)

    # Leaderboard entry
    lb = LeaderboardEntry(
        user_id=current_user.id,
        exam_type=session.exam_type,
        score=score_data["raw_score"],
        percentage=score_data["percentage"],
        week_number=now.isocalendar()[1],
        year=now.year
    )
    db.add(lb)
    db.commit()
    db.refresh(result)

    # AI coach + solutions in background
    background_tasks.add_task(
        run_ai_analysis, result.id, session.questions,
        payload.answers, score_data, db
    )

    # Update streak
    background_tasks.add_task(update_streak, current_user.id, db)

    return result

async def run_ai_analysis(result_id: str, questions: list, answers: dict, score_data: dict, db: Session):
    try:
        coach_report = await generate_ai_coach_report(
            exam_type=score_data.get("exam_type", ""),
            score=score_data["raw_score"],
            max_score=score_data["max_score"],
            percentage=score_data["percentage"],
            correct=score_data["correct"],
            incorrect=score_data["incorrect"],
            unattempted=score_data["unattempted"],
            topic_accuracy=score_data["topic_accuracy"],
            time_analysis=score_data["time_analysis"],
            weak_topics=score_data["weak_topics"]
        )
        solutions = await generate_solutions(questions, answers)

        result = db.query(TestResult).filter(TestResult.id == result_id).first()
        if result:
            result.ai_coach_report = coach_report
            result.solutions = solutions
            db.commit()
    except Exception:
        pass

def update_streak(user_id: str, db: Session):
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        today = dt.date.today()
        last = user.last_active.date() if user.last_active else None
        if last == today:
            pass
        elif last == today - dt.timedelta(days=1):
            user.streak_count += 1
        else:
            user.streak_count = 1
        user.last_active = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        pass

@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(TestSession).filter(
        TestSession.id == session_id,
        TestSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/{session_id}/result", response_model=ResultOut)
def get_result(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = db.query(TestResult).filter(
        TestResult.session_id == session_id,
        TestResult.user_id == current_user.id
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
