# ExamIt 🎯

> AI-powered mock test platform for all major Indian competitive exams. Questions generated in real-time by LLM — never the same test twice.

🔗 **Live:** [examit.vercel.app](https://examit.vercel.app)  
📡 **API:** [examit-api.onrender.com/docs](https://examit-api.onrender.com/docs)

---

## Exams Supported

JEE · NEET · CAT · GATE · SSC · UPSC · IBPS

---

## Features

- **Real-time AI question generation** — OpenRouter (Llama 3.1 70B) generates fresh MCQs from the actual syllabus every session
- **Real exam interface** — timer, question palette, mark for review, negative marking, section lock
- **AI Coach** — post-test analysis with weak topic detection, 7-day study plan, time management feedback
- **Solution explanations** — AI explains every wrong answer with shortcuts and tricks
- **Leaderboard** — weekly + all-time rankings per exam
- **Dashboard** — score trends, topic heatmap, streak tracker
- **Percentile calculator** — see where you stand vs other users

---

## Quick Start

### 1. Get a free OpenRouter API key
[openrouter.ai](https://openrouter.ai) → Sign up → Free models available (no card needed)

### 2. Clone and configure

```bash
git clone https://github.com/Jashu2703/examit.git
cd examit
```

**Backend:**
```bash
cd backend
cp .env.example .env
# Fill in: DATABASE_URL, SECRET_KEY, OPENROUTER_API_KEY, FRONTEND_URL
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000/api
npm install
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | JWT signing secret (min 32 chars) |
| `OPENROUTER_API_KEY` | Yes | Free at openrouter.ai |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |

---

## Project Structure

```
examit/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # auth, tests, dashboard, leaderboard, syllabus
│   │   ├── core/              # config, database, security, deps
│   │   ├── models/            # User, TestSession, TestResult, Leaderboard
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/
│   │       ├── ai/            # question_generator.py, coach.py
│   │       └── exam/          # syllabus.py, scoring.py
│   ├── tests/                 # 14 pytest tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/             # Landing, Login, Register, Dashboard, StartTest, TestPage, ResultPage, Leaderboard
│   │   ├── components/        # Navbar
│   │   ├── context/           # AuthContext
│   │   └── services/          # api.js (axios)
│   ├── Dockerfile
│   └── nginx.conf
└── .github/workflows/deploy.yml
```

---

## How AI Question Generation Works

```
User selects exam + subject + chapter + difficulty
        ↓
Backend builds structured prompt with real syllabus context
        ↓
OpenRouter → Llama 3.1 70B generates MCQs in JSON format
        ↓
JSON validated (4 options, correct answer, explanation)
        ↓
Questions cached for session → Test starts
        ↓
New session = new prompt = fresh questions every time
```

---

## Deployment

| Service | Free Tier | Used For |
|---|---|---|
| Vercel | Yes | React frontend |
| Render | Yes | FastAPI backend |
| Railway | Yes | PostgreSQL |
| OpenRouter | Yes | LLM (Llama 3.1 70B) |

Push to `main` → GitHub Actions runs tests → auto-deploys to Render + Vercel.

---

## Running Tests

```bash
cd backend
DATABASE_URL=sqlite:///./test.db SECRET_KEY=any-32-char-secret OPENROUTER_API_KEY=test FRONTEND_URL=http://localhost:3000 pytest tests/ -v
```

14 tests · auth · syllabus · protected routes · scoring

---

## Built by

**Jashwanth Valasa** — AI/ML Engineer · Solo project  
[LinkedIn](https://linkedin.com/in/jashwanth-valasa) · [GitHub](https://github.com/Jashu2703)
