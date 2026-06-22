from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid

def gen_uuid():
    return str(uuid.uuid4())

# ── Enums ─────────────────────────────────────────────────────────────────────

class ExamType(str, enum.Enum):
    JEE        = "JEE"
    NEET       = "NEET"
    CAT        = "CAT"
    GATE       = "GATE"
    SSC        = "SSC"
    UPSC       = "UPSC"
    IBPS       = "IBPS"

class Difficulty(str, enum.Enum):
    EASY   = "easy"
    MEDIUM = "medium"
    HARD   = "hard"
    MIXED  = "mixed"

class TestMode(str, enum.Enum):
    FULL_TEST    = "full_test"
    SUBJECT_TEST = "subject_test"
    CHAPTER_TEST = "chapter_test"
    QUICK        = "quick"

class SessionStatus(str, enum.Enum):
    PENDING   = "pending"
    ACTIVE    = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"

# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(String, primary_key=True, default=gen_uuid)
    email           = Column(String, unique=True, nullable=False, index=True)
    username        = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name       = Column(String, nullable=True)
    target_exam     = Column(SAEnum(ExamType), nullable=True)
    is_active       = Column(Boolean, default=True)
    streak_count    = Column(Integer, default=0)
    last_active     = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    sessions        = relationship("TestSession", back_populates="user")
    results         = relationship("TestResult", back_populates="user")

# ── Test Session ──────────────────────────────────────────────────────────────

class TestSession(Base):
    __tablename__ = "test_sessions"

    id              = Column(String, primary_key=True, default=gen_uuid)
    user_id         = Column(String, ForeignKey("users.id"), nullable=False)
    exam_type       = Column(SAEnum(ExamType), nullable=False)
    mode            = Column(SAEnum(TestMode), nullable=False)
    subject         = Column(String, nullable=True)
    chapter         = Column(String, nullable=True)
    difficulty      = Column(SAEnum(Difficulty), nullable=False, default=Difficulty.MIXED)
    num_questions   = Column(Integer, nullable=False)
    duration_mins   = Column(Integer, nullable=False)
    status          = Column(SAEnum(SessionStatus), default=SessionStatus.PENDING)
    questions       = Column(JSON, nullable=True)   # generated questions stored here
    answers         = Column(JSON, nullable=True)   # user answers {q_index: option}
    time_per_q      = Column(JSON, nullable=True)   # seconds spent per question
    started_at      = Column(DateTime(timezone=True), nullable=True)
    submitted_at    = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    user            = relationship("User", back_populates="sessions")
    result          = relationship("TestResult", back_populates="session", uselist=False)

# ── Test Result ───────────────────────────────────────────────────────────────

class TestResult(Base):
    __tablename__ = "test_results"

    id                  = Column(String, primary_key=True, default=gen_uuid)
    session_id          = Column(String, ForeignKey("test_sessions.id"), nullable=False, unique=True)
    user_id             = Column(String, ForeignKey("users.id"), nullable=False)
    exam_type           = Column(SAEnum(ExamType), nullable=False)

    raw_score           = Column(Float, nullable=False)
    max_score           = Column(Float, nullable=False)
    percentage          = Column(Float, nullable=False)
    correct             = Column(Integer, nullable=False)
    incorrect           = Column(Integer, nullable=False)
    unattempted         = Column(Integer, nullable=False)
    time_taken_mins     = Column(Float, nullable=False)

    topic_accuracy      = Column(JSON, nullable=True)   # {topic: {correct, total, pct}}
    weak_topics         = Column(JSON, nullable=True)   # [{"topic":..,"score":..,"priority":..}]
    time_analysis       = Column(JSON, nullable=True)   # {avg_time, slow_questions, fast_questions}
    percentile          = Column(Float, nullable=True)
    predicted_rank      = Column(Integer, nullable=True)

    ai_coach_report     = Column(Text, nullable=True)   # full AI coach markdown
    solutions           = Column(JSON, nullable=True)   # {q_index: {explanation, trick}}

    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    session             = relationship("TestSession", back_populates="result")
    user                = relationship("User", back_populates="results")

# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"

    id          = Column(String, primary_key=True, default=gen_uuid)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    exam_type   = Column(SAEnum(ExamType), nullable=False)
    score       = Column(Float, nullable=False)
    percentage  = Column(Float, nullable=False)
    week_number = Column(Integer, nullable=True)   # NULL = all-time
    year        = Column(Integer, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    user        = relationship("User")
