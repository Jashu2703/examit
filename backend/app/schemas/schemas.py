from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, List, Any
from datetime import datetime
from app.models.models import ExamType, Difficulty, TestMode

# ── Auth ──────────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    target_exam: Optional[ExamType] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserOut(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str]
    target_exam: Optional[ExamType]
    streak_count: int
    created_at: datetime
    class Config:
        from_attributes = True

# ── Test Session ──────────────────────────────────────────────────────────────
class StartTestRequest(BaseModel):
    exam_type: ExamType
    mode: TestMode = TestMode.SUBJECT_TEST
    subject: Optional[str] = None
    chapter: Optional[str] = None
    difficulty: Difficulty = Difficulty.MIXED
    num_questions: int = 20
    duration_mins: int = 30

class SubmitTestRequest(BaseModel):
    session_id: str
    answers: Dict[str, str]       # {"0": "A", "1": "C", ...}
    time_per_q: Dict[str, float]  # {"0": 45.2, "1": 30.1, ...} seconds

class SessionOut(BaseModel):
    id: str
    exam_type: ExamType
    mode: TestMode
    subject: Optional[str]
    chapter: Optional[str]
    difficulty: Difficulty
    num_questions: int
    duration_mins: int
    status: str
    questions: Optional[List[dict]]
    started_at: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True

# ── Results ───────────────────────────────────────────────────────────────────
class ResultOut(BaseModel):
    id: str
    session_id: str
    exam_type: ExamType
    raw_score: float
    max_score: float
    percentage: float
    correct: int
    incorrect: int
    unattempted: int
    time_taken_mins: float
    topic_accuracy: Optional[dict]
    weak_topics: Optional[list]
    time_analysis: Optional[dict]
    percentile: Optional[float]
    predicted_rank: Optional[int]
    ai_coach_report: Optional[str]
    solutions: Optional[dict]
    created_at: datetime
    class Config:
        from_attributes = True

# ── Dashboard ─────────────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_tests: int
    avg_score: float
    best_score: float
    total_questions_attempted: int
    streak: int
    exam_breakdown: Dict[str, dict]
    recent_scores: List[dict]
    weak_topics_overall: List[dict]

# ── Leaderboard ───────────────────────────────────────────────────────────────
class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    score: float
    percentage: float
    exam_type: str
    created_at: datetime

# ── Syllabus ──────────────────────────────────────────────────────────────────
class SyllabusResponse(BaseModel):
    exam_type: str
    full_name: str
    subjects: Dict[str, List[str]]
    duration_mins: int
    total_questions: int
    negative_marking: float
    marks_per_correct: float
