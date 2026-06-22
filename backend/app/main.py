from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, tests, dashboard, leaderboard, syllabus
from app.models import models  # noqa: ensure models are registered

# Schema is managed via Alembic migrations (see /alembic/versions).
# Run `alembic upgrade head` before starting the app in production.

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered mock test platform for Indian competitive exams"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix=settings.API_PREFIX)
app.include_router(tests.router,       prefix=settings.API_PREFIX)
app.include_router(dashboard.router,   prefix=settings.API_PREFIX)
app.include_router(leaderboard.router, prefix=settings.API_PREFIX)
app.include_router(syllabus.router,    prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {"app": settings.PROJECT_NAME, "version": settings.VERSION, "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}
