# PackSure AI

Intelligent Packaged Commodity Compliance Inspector for SIH 2026.

## Architecture
- **Frontend**: Next.js + Tailwind CSS
- **Backend**: FastAPI + SQLite
- **AI**: Gemini Vision API for extraction
- **Rule Engine**: Deterministic Python-based engine driven by Legal Metrology rules

## Local Setup

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Backend
1. `cd backend`
2. `python -m venv venv`
3. Activate virtual environment (`venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload`
