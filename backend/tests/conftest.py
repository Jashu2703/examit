import os

# Must be set before app.core.config is imported by any test module
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_examit.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci-only-32-characters-long")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key-not-real")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
