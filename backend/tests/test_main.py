import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

# Use SQLite for tests
TEST_DB = "sqlite:///./test_examit.db"
engine  = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_register():
    r = client.post("/api/auth/register", json={
        "email": "test@examit.com",
        "username": "testuser",
        "password": "password123",
        "target_exam": "JEE"
    })
    assert r.status_code == 201
    assert "access_token" in r.json()

def test_register_duplicate_email():
    payload = {"email": "dup@examit.com", "username": "user1", "password": "pass123"}
    client.post("/api/auth/register", json=payload)
    r = client.post("/api/auth/register", json={**payload, "username": "user2"})
    assert r.status_code == 400

def test_login():
    client.post("/api/auth/register", json={
        "email": "login@examit.com", "username": "loginuser", "password": "pass123"
    })
    r = client.post("/api/auth/login", json={"email": "login@examit.com", "password": "pass123"})
    assert r.status_code == 200
    assert "access_token" in r.json()

def test_login_wrong_password():
    client.post("/api/auth/register", json={
        "email": "wp@examit.com", "username": "wpuser", "password": "correct"
    })
    r = client.post("/api/auth/login", json={"email": "wp@examit.com", "password": "wrong"})
    assert r.status_code == 401

def test_me_protected():
    r = client.get("/api/auth/me")
    assert r.status_code == 403

def test_me_with_token():
    reg = client.post("/api/auth/register", json={
        "email": "me@examit.com", "username": "meuser", "password": "pass123"
    })
    token = reg.json()["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "me@examit.com"

def test_list_exams():
    r = client.get("/api/syllabus/exams")
    assert r.status_code == 200
    exams = r.json()
    assert len(exams) == 7
    names = [e["exam_type"] for e in exams]
    assert "JEE" in names
    assert "NEET" in names
    assert "UPSC" in names

def test_get_syllabus():
    r = client.get("/api/syllabus/JEE")
    assert r.status_code == 200
    data = r.json()
    assert "subjects" in data
    assert "Physics" in data["subjects"]

def test_get_subjects():
    r = client.get("/api/syllabus/NEET/subjects")
    assert r.status_code == 200
    assert "Biology" in r.json()["subjects"]

def test_get_chapters():
    r = client.get("/api/syllabus/JEE/Physics/chapters")
    assert r.status_code == 200
    assert len(r.json()["chapters"]) > 0

def test_start_test_unauthenticated():
    r = client.post("/api/tests/start", json={
        "exam_type": "JEE", "num_questions": 5, "duration_mins": 10
    })
    assert r.status_code == 403

def test_dashboard_unauthenticated():
    r = client.get("/api/dashboard/stats")
    assert r.status_code == 403

def test_leaderboard_unauthenticated():
    r = client.get("/api/leaderboard/JEE")
    assert r.status_code == 403
